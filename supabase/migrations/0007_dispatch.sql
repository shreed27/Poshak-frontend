-- 0007: dispatch — online captains, offers (accept/decline/expire), auto-assign, reschedule, no-shows.

insert into public.app_settings (key, value) values
  ('require_job_accept', 'true'),     -- captain must accept an assignment
  ('offer_timeout_min', '5'),         -- an unanswered offer returns to the queue after this long
  ('auto_assign', 'false'),           -- assign new orders automatically to the best available captain
  ('max_reschedules', '2')
on conflict (key) do nothing;

alter table public.profiles add column if not exists is_online boolean not null default false;
alter table public.profiles add column if not exists last_lat double precision;
alter table public.profiles add column if not exists last_lng double precision;
alter table public.profiles add column if not exists last_seen_at timestamptz;

alter table public.orders add column if not exists assignment text not null default 'unassigned' check (assignment in ('unassigned', 'offered', 'accepted'));
alter table public.orders add column if not exists offered_at timestamptz;
alter table public.orders add column if not exists declined_by uuid[] not null default '{}';
alter table public.orders add column if not exists reschedule_count int not null default 0;
alter table public.orders add column if not exists failed_attempts int not null default 0;
alter table public.orders add column if not exists delivery_slot text;
alter table public.orders add column if not exists delivery_date date;
alter table public.orders add column if not exists delivery_window text;

create table if not exists public.order_attempts (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  stage text not null check (stage in ('pickup', 'delivery')),
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.order_attempts enable row level security;
drop policy if exists "attempts read" on public.order_attempts;
create policy "attempts read" on public.order_attempts for select using (
  public.my_role() = 'admin' or exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or o.captain_id = auth.uid())));
grant select on public.order_attempts to authenticated;

-- settings allowlist gains the dispatch keys
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_key not in (select jsonb_array_elements_text('["min_charge","member_discount_pct","slot_windows","max_orders_per_slot","slot_capacity_overrides","service_area","support","require_photos","require_cleaner_step","business","captain_fee_per_order","referral_bonus","offer_timeout_min","auto_assign","max_reschedules","claim_credit_multiple","claims_policy","require_job_accept"]'::jsonb)) then
    raise exception 'Unknown setting %', p_key;
  end if;
  if p_key = 'member_discount_pct' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 90) then raise exception 'Discount must be 0–90 percent'; end if;
  if p_key = 'min_charge' and (p_value #>> '{}')::numeric < 0 then raise exception 'Minimum charge cannot be negative'; end if;
  if p_key = 'max_orders_per_slot' and (p_value #>> '{}')::numeric < 1 then raise exception 'Capacity must be at least 1'; end if;
  if p_key = 'service_area' and (
       (p_value->>'radius_km')::numeric <= 0 or (p_value->>'lat')::numeric not between -90 and 90 or (p_value->>'lng')::numeric not between -180 and 180
     ) then raise exception 'Invalid service area'; end if;
  if p_key in ('require_photos', 'require_cleaner_step', 'auto_assign', 'require_job_accept') and jsonb_typeof(p_value) <> 'boolean' then raise exception '% must be true or false', p_key; end if;
  if p_key in ('offer_timeout_min', 'max_reschedules', 'captain_fee_per_order', 'referral_bonus', 'claim_credit_multiple') and (p_value #>> '{}')::numeric < 0 then raise exception '% cannot be negative', p_key; end if;
  if p_key = 'business' then
    if coalesce((p_value->>'gst_registered')::boolean, false) then
      if upper(coalesce(p_value->>'gstin', '')) !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$' then raise exception 'Enter a valid 15-character GSTIN'; end if;
      if coalesce(trim(p_value->>'legal_name'), '') = '' or coalesce(trim(p_value->>'address'), '') = '' then raise exception 'Legal name and address are required for tax invoices'; end if;
    end if;
    if (p_value->>'gst_rate')::numeric not between 0 and 28 then raise exception 'GST rate must be between 0 and 28'; end if;
  end if;
  insert into public.app_settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

-- ============================================================ captain presence
create or replace function public.captain_set_online(p_online boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('captain');
  update public.profiles set is_online = p_online, last_seen_at = now() where id = auth.uid();
end $$;

create or replace function public.captain_update_location(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('captain');
  update public.profiles set last_lat = p_lat, last_lng = p_lng, last_seen_at = now(), is_online = true where id = auth.uid();
  update public.orders set captain_lat = p_lat, captain_lng = p_lng, captain_updated_at = now()
  where captain_id = auth.uid() and status in ('captain_assigned', 'out_for_delivery');
end $$;
grant execute on function public.captain_set_online(boolean), public.captain_update_location(double precision, double precision) to authenticated;

-- ============================================================ offers
create or replace function public.admin_assign_captain(p_id uuid, p_captain uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.profiles; v_req boolean := public.setting_bool('require_job_accept', true);
begin
  perform public._require_role('admin');
  select * into c from public.profiles where id = p_captain and role = 'captain';
  if not found then raise exception 'Not a captain'; end if;
  update public.orders
     set captain_id = c.id, captain_name = coalesce(c.name, c.email), captain_phone = c.phone, captain_vehicle = c.vehicle,
         status = case when status = 'placed' then 'captain_assigned' else status end,
         assignment = case when v_req and status in ('placed', 'captain_assigned') then 'offered' else 'accepted' end,
         offered_at = now()
   where id = p_id and status in ('placed', 'captain_assigned', 'picked_up', 'cleaning', 'ready', 'out_for_delivery');
end $$;

-- The captain cannot start the job before accepting it.
create or replace function public.orders_require_accept()
returns trigger language plpgsql as $$
begin
  if new.status = 'picked_up' and old.status = 'captain_assigned' and new.assignment <> 'accepted' then
    raise exception 'Accept the job before starting it';
  end if;
  return new;
end $$;
drop trigger if exists orders_require_accept_trg on public.orders;
create trigger orders_require_accept_trg before update of status on public.orders for each row execute function public.orders_require_accept();

create or replace function public.captain_accept_job(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('captain');
  update public.orders set assignment = 'accepted' where id = p_id and captain_id = auth.uid() and assignment = 'offered' and status = 'captain_assigned';
  if not found then raise exception 'This offer is no longer available'; end if;
end $$;

-- Pick the best available captain: online, recently seen, not already declined, fewest active jobs, then nearest.
create or replace function public._auto_assign(p_order uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.orders; v_pick uuid;
begin
  select * into o from public.orders where id = p_order;
  select p.id into v_pick
    from public.profiles p
   where p.role = 'captain' and p.is_online and p.last_seen_at > now() - interval '15 minutes' and not (p.id = any (o.declined_by))
   order by (select count(*) from public.orders x where x.captain_id = p.id and x.status in ('captain_assigned', 'picked_up', 'cleaning', 'ready', 'out_for_delivery')),
            case when p.last_lat is null then 9e9 else public.haversine_km(p.last_lat, p.last_lng, o.pickup_lat, o.pickup_lng) end
   limit 1;
  if v_pick is null then
    perform public._alert('no_captain', p_order, format('No online captain available for order %s — assign manually', o.order_code), 'urgent');
    return null;
  end if;
  update public.orders c
     set captain_id = p.id, captain_name = coalesce(p.name, p.email), captain_phone = p.phone, captain_vehicle = p.vehicle,
         status = 'captain_assigned', assignment = case when public.setting_bool('require_job_accept', true) then 'offered' else 'accepted' end, offered_at = now()
    from public.profiles p where p.id = v_pick and c.id = p_order;
  return v_pick;
end $$;
revoke execute on function public._auto_assign(uuid) from public, anon, authenticated;

create or replace function public.admin_auto_assign(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  return public._auto_assign(p_id);
end $$;
grant execute on function public.admin_auto_assign(uuid) to authenticated;

create or replace function public.captain_decline_job(p_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid() and assignment = 'offered' and status = 'captain_assigned' for update;
  if not found then raise exception 'This offer is no longer available'; end if;
  update public.orders
     set captain_id = null, captain_name = null, captain_phone = null, captain_vehicle = null, captain_lat = null, captain_lng = null,
         status = 'placed', assignment = 'unassigned', declined_by = array_append(declined_by, auth.uid())
   where id = p_id;
  perform public._alert('job_declined', p_id, format('Order %s declined by %s%s', o.order_code, coalesce(o.captain_name, 'a captain'), case when p_reason is not null then ': ' || p_reason else '' end), 'warn');
  if public.setting_bool('auto_assign', false) then perform public._auto_assign(p_id); end if;
end $$;

-- Offers nobody answered go back to the queue (call from the dashboard every minute, or pg_cron).
create or replace function public.expire_stale_offers()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; v_min numeric := public.setting_num('offer_timeout_min', 5);
begin
  for r in select * from public.orders where assignment = 'offered' and status = 'captain_assigned' and offered_at < now() - make_interval(mins => v_min::int) for update loop
    update public.orders
       set captain_id = null, captain_name = null, captain_phone = null, captain_vehicle = null, status = 'placed', assignment = 'unassigned',
           declined_by = array_append(declined_by, r.captain_id)
     where id = r.id;
    perform public._alert('offer_expired', r.id, format('Order %s: %s did not respond in %s min', r.order_code, coalesce(r.captain_name, 'captain'), v_min), 'warn');
    if public.setting_bool('auto_assign', false) then perform public._auto_assign(r.id); end if;
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.expire_stale_offers() to authenticated;

create or replace function public.orders_autoassign()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.setting_bool('auto_assign', false) then perform public._auto_assign(new.id); end if;
  return new;
end $$;
drop trigger if exists orders_autoassign_trg on public.orders;
create trigger orders_autoassign_trg after insert on public.orders for each row execute function public.orders_autoassign();

-- ============================================================ reschedule + no-show
create or replace function public._slot_text(p_date date, p_window text)
returns text language sql immutable as $$
  select to_char(p_date, 'Dy DD Mon') || ', ' ||
         to_char(make_time(split_part(p_window, '-', 1)::int, 0, 0), 'FMHH12:MI AM') || ' - ' ||
         to_char(make_time(split_part(p_window, '-', 2)::int, 0, 0), 'FMHH12:MI AM')
$$;

create or replace function public.reschedule_pickup(p_id uuid, p_date date, p_window text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; v_booked int; v_max numeric := public.setting_num('max_reschedules', 2);
begin
  select * into o from public.orders where id = p_id and customer_id = auth.uid() and status in ('placed', 'captain_assigned') for update;
  if not found then raise exception 'You can only change the pickup time before pickup'; end if;
  if o.reschedule_count >= v_max then raise exception 'You have reached the limit of % reschedules', v_max::int; end if;
  if p_date < current_date then raise exception 'Pick a date that has not passed'; end if;
  if not exists (select 1 from jsonb_array_elements(public.setting('slot_windows')) w where (w->>0) || '-' || (w->>1) = p_window) then raise exception 'That pickup window is not available'; end if;
  select count(*) into v_booked from public.orders x where x.pickup_date = p_date and x.pickup_window = p_window and x.status <> 'cancelled' and x.id <> p_id;
  if v_booked >= public.slot_capacity(p_window) then raise exception 'That pickup slot is full — please choose another'; end if;
  update public.orders set pickup_date = p_date, pickup_window = p_window, pickup_slot = public._slot_text(p_date, p_window), reschedule_count = reschedule_count + 1 where id = p_id;
  perform public._notify(o.captain_id, 'job', 'Pickup time changed', format('%s moved to %s', o.order_code, public._slot_text(p_date, p_window)), p_id);
  perform public._notify_admins('reschedule', 'Pickup rescheduled', format('%s → %s', o.order_code, public._slot_text(p_date, p_window)), p_id);
end $$;

create or replace function public.reschedule_delivery(p_id uuid, p_date date, p_window text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_id and customer_id = auth.uid() and status in ('picked_up', 'cleaning', 'ready', 'out_for_delivery') for update;
  if not found then raise exception 'Delivery time can be set after your clothes are picked up'; end if;
  if p_date < current_date then raise exception 'Pick a date that has not passed'; end if;
  if not exists (select 1 from jsonb_array_elements(public.setting('slot_windows')) w where (w->>0) || '-' || (w->>1) = p_window) then raise exception 'That window is not available'; end if;
  update public.orders set delivery_date = p_date, delivery_window = p_window, delivery_slot = public._slot_text(p_date, p_window) where id = p_id;
  perform public._notify(o.captain_id, 'job', 'Delivery time set', format('%s: deliver %s', o.order_code, public._slot_text(p_date, p_window)), p_id);
  perform public._notify_admins('reschedule', 'Delivery time set', format('%s → %s', o.order_code, public._slot_text(p_date, p_window)), p_id);
end $$;

create or replace function public.captain_report_no_show(p_id uuid, p_stage text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid()
     and ((p_stage = 'pickup' and status = 'captain_assigned') or (p_stage = 'delivery' and status = 'out_for_delivery')) for update;
  if not found then raise exception 'Nothing to report for this order right now'; end if;
  insert into public.order_attempts (order_id, stage, reason, created_by) values (p_id, p_stage, p_note, auth.uid());
  update public.orders set failed_attempts = failed_attempts + 1,
         status = case when p_stage = 'delivery' then 'ready' else status end,
         delivery_date = case when p_stage = 'delivery' then null else delivery_date end,
         delivery_window = case when p_stage = 'delivery' then null else delivery_window end,
         delivery_slot = case when p_stage = 'delivery' then null else delivery_slot end
   where id = p_id;
  perform public._notify(o.customer_id, 'order', case when p_stage = 'pickup' then 'We could not reach you for pickup' else 'We could not deliver your clothes' end,
    format('Order %s: please reschedule in the app and keep your phone reachable.', o.order_code), p_id);
  perform public._alert('no_show', p_id, format('Order %s: customer unavailable at %s (attempt %s)%s', o.order_code, p_stage, o.failed_attempts + 1, case when p_note is not null then ' — ' || p_note else '' end),
                        case when o.failed_attempts + 1 >= 2 then 'urgent' else 'warn' end);
end $$;

grant execute on function public.captain_accept_job(uuid), public.captain_decline_job(uuid, text), public.admin_assign_captain(uuid, uuid),
  public.reschedule_pickup(uuid, date, text), public.reschedule_delivery(uuid, date, text), public.captain_report_no_show(uuid, text, text) to authenticated;
