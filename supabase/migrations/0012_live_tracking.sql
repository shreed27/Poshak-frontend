-- 0012: live delivery tracking — rider heading + road-based ETA, "almost there" notification, late-rider alert.

alter table public.orders add column if not exists eta_minutes int;
alter table public.orders add column if not exists eta_km numeric(7, 2);
alter table public.orders add column if not exists eta_leg text check (eta_leg in ('pickup', 'delivery'));
alter table public.orders add column if not exists eta_updated_at timestamptz;
alter table public.orders add column if not exists captain_heading int;
alter table public.orders add column if not exists near_notified_for text;     -- status we already told the customer "almost there" for
alter table public.orders add column if not exists late_alerted_at timestamptz;

-- ETA tuning (admin editable). Free-flow routing under-estimates city riding, so the app multiplies by this factor and adds a buffer.
insert into public.app_settings (key, value) values ('eta_traffic_factor', '1.3'), ('eta_buffer_min', '2') on conflict (key) do nothing;
create or replace function public._setting_allowed(p_key text)
returns boolean language sql immutable as $$
  select p_key in ('min_charge','member_discount_pct','slot_windows','max_orders_per_slot','slot_capacity_overrides','service_area','support','require_photos','require_cleaner_step','business',
                   'captain_fee_per_order','referral_bonus','referral_min_order','offer_timeout_min','auto_assign','max_reschedules','claim_credit_multiple','claims_policy','require_job_accept','ops_phone','sla_hours',
                   'laundry_auto_assign','eta_traffic_factor','eta_buffer_min')
$$;

-- End of a slot window as a timestamp (IST), e.g. date 2026-11-20 + '9-11' → 2026-11-20 11:00 IST.
create or replace function public._slot_end(p_date date, p_window text)
returns timestamptz language sql immutable as $$
  select case when p_date is null or p_window is null or p_window !~ '^[0-9]{1,2}-[0-9]{1,2}$' then null
              else (p_date::timestamp + make_interval(hours => split_part(p_window, '-', 2)::int)) at time zone 'Asia/Kolkata' end
$$;

-- The rider's phone calls this every few seconds while online. Position always updates; the ETA is stored only for jobs the
-- rider has accepted (or is delivering). The phone may pass a road-routed ETA for the job it is heading to (p_order);
-- everything else gets a server-side estimate so ETAs never go missing.
drop function if exists public.captain_update_location(double precision, double precision);
create or replace function public.captain_update_location(
  p_lat double precision, p_lng double precision,
  p_heading int default null, p_speed_kmh numeric default null,
  p_order uuid default null, p_eta_min int default null, p_km numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders; v_km numeric; v_min int; v_leg text; v_end timestamptz; v_near boolean; v_name text;
  v_factor numeric := greatest(1, public.setting_num('eta_traffic_factor', 1.3));
  v_buf numeric := greatest(0, public.setting_num('eta_buffer_min', 2));
begin
  perform public._require_role('captain');
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Bad coordinates'; end if;
  update public.profiles set last_lat = p_lat, last_lng = p_lng, last_seen_at = now(), is_online = true where id = auth.uid();
  select coalesce(name, 'Your captain') into v_name from public.profiles where id = auth.uid();

  for o in select * from public.orders where captain_id = auth.uid() and status in ('captain_assigned', 'out_for_delivery') for update loop
    update public.orders set captain_lat = p_lat, captain_lng = p_lng, captain_updated_at = now(), captain_heading = case when p_heading between 0 and 360 then p_heading else captain_heading end
     where id = o.id;
    if o.status = 'captain_assigned' and o.assignment <> 'accepted' then continue; end if;       -- not accepted yet: no ETA to promise

    v_leg := case when o.status = 'out_for_delivery' then 'delivery' else 'pickup' end;
    v_near := public.haversine_km(p_lat, p_lng, o.pickup_lat, o.pickup_lng) <= 0.35;
    if p_order = o.id and p_eta_min is not null and p_km is not null and p_eta_min between 0 and 240 and p_km between 0 and 100 then
      v_min := greatest(1, p_eta_min); v_km := p_km;
    else
      v_km := public.haversine_km(p_lat, p_lng, o.pickup_lat, o.pickup_lng) * 1.35;               -- crow-flies → road distance
      v_min := greatest(1, ceil(v_km / 25 * 60 * v_factor + v_buf));
    end if;
    update public.orders set eta_minutes = v_min, eta_km = round(v_km, 2), eta_leg = v_leg, eta_updated_at = now() where id = o.id;

    if v_near and o.near_notified_for is distinct from o.status then
      update public.orders set near_notified_for = o.status where id = o.id;
      perform public._notify(o.customer_id, 'tracking',
        case when v_leg = 'pickup' then format('%s is almost at your door', v_name) else format('%s is almost at your door with your clothes', v_name) end,
        case when v_leg = 'pickup' then 'Keep your pickup OTP ready — share it only when the captain is with you.' else 'Keep your delivery OTP ready — share it only after you have your clothes.' end,
        o.id);
    end if;

    -- Will the rider miss the promised slot by 15+ minutes? Tell ops once.
    v_end := public._slot_end(case when v_leg = 'pickup' then o.pickup_date else o.delivery_date end, case when v_leg = 'pickup' then o.pickup_window else o.delivery_window end);
    if v_end is not null and o.late_alerted_at is null and now() + make_interval(mins => v_min) > v_end + interval '15 minutes' then
      update public.orders set late_alerted_at = now() where id = o.id;
      perform public._alert('late_rider', o.id, format('Order %s: %s will reach the customer around %s — after the promised slot', o.order_code, v_name,
        to_char((now() + make_interval(mins => v_min)) at time zone 'Asia/Kolkata', 'HH12:MI AM')), 'warn');
    end if;
  end loop;
end $$;
grant execute on function public.captain_update_location(double precision, double precision, int, numeric, uuid, int, numeric) to authenticated;

-- Clear the ETA when the leg ends or the job changes hands; re-arm the "almost there" and late alerts for a new rider.
create or replace function public.orders_reset_eta()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status or new.captain_id is distinct from old.captain_id then
    new.eta_minutes := null; new.eta_km := null; new.eta_leg := null; new.eta_updated_at := null; new.late_alerted_at := null;
    if new.captain_id is distinct from old.captain_id then new.near_notified_for := null; new.captain_heading := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_reset_eta_trg on public.orders;
create trigger orders_reset_eta_trg before update of status, captain_id on public.orders for each row execute function public.orders_reset_eta();
