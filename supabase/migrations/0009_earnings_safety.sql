-- 0009: captain earnings & payouts, SOS / incident reporting.

insert into public.app_settings (key, value) values
  ('captain_fee_per_order', '40'),     -- ₹ per completed delivery
  ('ops_phone', '""')                  -- shown to captains as "Call ops"
on conflict (key) do nothing;

-- ============================================================ earnings
create table if not exists public.captain_earnings (
  id bigint generated always as identity primary key,
  captain_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  paid_out boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists earnings_captain_idx on public.captain_earnings (captain_id, created_at desc);
alter table public.captain_earnings enable row level security;
drop policy if exists "earnings read" on public.captain_earnings;
create policy "earnings read" on public.captain_earnings for select using (captain_id = auth.uid() or public.my_role() = 'admin');
grant select on public.captain_earnings to authenticated;

create table if not exists public.captain_payouts (
  id bigint generated always as identity primary key,
  captain_id uuid not null references auth.users(id) on delete cascade,
  earnings numeric not null,
  tips numeric not null,
  cash_netted numeric not null,
  net numeric not null,                       -- + we pay the captain, − the captain owes us
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.captain_payouts enable row level security;
drop policy if exists "payouts read" on public.captain_payouts;
create policy "payouts read" on public.captain_payouts for select using (captain_id = auth.uid() or public.my_role() = 'admin');
grant select on public.captain_payouts to authenticated;

create or replace function public.orders_earning()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' and new.captain_id is not null then
    insert into public.captain_earnings (captain_id, order_id, amount) values (new.captain_id, new.id, public.setting_num('captain_fee_per_order', 40))
    on conflict (order_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists orders_earning_trg on public.orders;
create trigger orders_earning_trg after update of status on public.orders for each row execute function public.orders_earning();

-- Captain's own dashboard numbers.
create or replace function public.captain_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ist timestamp := now() at time zone 'Asia/Kolkata'; v_day timestamptz := (date_trunc('day', v_ist)) at time zone 'Asia/Kolkata';
begin
  perform public._require_role('captain');
  return jsonb_build_object(
    'today',  (select coalesce(sum(amount), 0) from public.captain_earnings where captain_id = auth.uid() and created_at >= v_day)
            + (select coalesce(sum(amount), 0) from public.tips where captain_id = auth.uid() and created_at >= v_day),
    'week',   (select coalesce(sum(amount), 0) from public.captain_earnings where captain_id = auth.uid() and created_at >= v_day - interval '6 days')
            + (select coalesce(sum(amount), 0) from public.tips where captain_id = auth.uid() and created_at >= v_day - interval '6 days'),
    'month',  (select coalesce(sum(amount), 0) from public.captain_earnings where captain_id = auth.uid() and created_at >= date_trunc('month', v_ist) at time zone 'Asia/Kolkata')
            + (select coalesce(sum(amount), 0) from public.tips where captain_id = auth.uid() and created_at >= date_trunc('month', v_ist) at time zone 'Asia/Kolkata'),
    'deliveries_today', (select count(*) from public.captain_earnings where captain_id = auth.uid() and created_at >= v_day),
    'pending_earnings', (select coalesce(sum(amount), 0) from public.captain_earnings where captain_id = auth.uid() and not paid_out),
    'pending_tips', (select coalesce(sum(amount), 0) from public.tips where captain_id = auth.uid() and not paid_out),
    'cash_held', (select coalesce(sum(amount), 0) from public.payments where collected_by = auth.uid() and method = 'cash' and not deposited),
    'rating', (select round(avg(captain_rating)::numeric, 2) from public.orders where captain_id = auth.uid() and captain_rating is not null),
    'rated', (select count(*) from public.orders where captain_id = auth.uid() and captain_rating is not null));
end $$;
grant execute on function public.captain_summary() to authenticated;

create or replace function public.admin_captain_balance(p_captain uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e numeric; t numeric; c numeric;
begin
  perform public._require_role('admin');
  select coalesce(sum(amount), 0) into e from public.captain_earnings where captain_id = p_captain and not paid_out;
  select coalesce(sum(amount), 0) into t from public.tips where captain_id = p_captain and not paid_out;
  select coalesce(sum(amount), 0) into c from public.payments where collected_by = p_captain and method = 'cash' and not deposited;
  return jsonb_build_object('earnings', e, 'tips', t, 'cash_held', c, 'net', e + t - c);
end $$;

-- Settle: pay earnings + tips, net off the cash the captain is holding, and record it.
create or replace function public.admin_settle_captain(p_captain uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b jsonb;
begin
  perform public._require_role('admin');
  b := public.admin_captain_balance(p_captain);
  if (b->>'earnings')::numeric = 0 and (b->>'tips')::numeric = 0 and (b->>'cash_held')::numeric = 0 then raise exception 'Nothing to settle'; end if;
  insert into public.captain_payouts (captain_id, earnings, tips, cash_netted, net, note, created_by)
  values (p_captain, (b->>'earnings')::numeric, (b->>'tips')::numeric, (b->>'cash_held')::numeric, (b->>'net')::numeric, p_note, auth.uid());
  update public.captain_earnings set paid_out = true where captain_id = p_captain and not paid_out;
  update public.tips set paid_out = true where captain_id = p_captain and not paid_out;
  update public.payments set deposited = true, deposited_at = now() where collected_by = p_captain and method = 'cash' and not deposited;
  perform public._notify(p_captain, 'payout', 'Settlement recorded', case when (b->>'net')::numeric >= 0 then format('₹%s will be paid to you.', b->>'net') else format('Cash of ₹%s was adjusted against your earnings.', b->>'cash_held') end);
  return b;
end $$;
grant execute on function public.admin_captain_balance(uuid), public.admin_settle_captain(uuid, text) to authenticated;

-- ============================================================ SOS / incidents
create table if not exists public.incidents (
  id bigint generated always as identity primary key,
  captain_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check (kind in ('sos', 'accident', 'vehicle', 'harassment', 'other')),
  message text,
  lat double precision,
  lng double precision,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
alter table public.incidents enable row level security;
drop policy if exists "incidents read" on public.incidents;
create policy "incidents read" on public.incidents for select using (captain_id = auth.uid() or public.my_role() = 'admin');
grant select on public.incidents to authenticated;

create or replace function public.captain_report_incident(p_kind text, p_message text default null, p_lat double precision default null, p_lng double precision default null, p_order uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text;
begin
  perform public._require_role('captain');
  if p_order is not null and not exists (select 1 from public.orders where id = p_order and captain_id = auth.uid()) then p_order := null; end if;
  insert into public.incidents (captain_id, order_id, kind, message, lat, lng) values (auth.uid(), p_order, p_kind, left(p_message, 500), p_lat, p_lng) returning id into v_id;
  select coalesce(name, email) into v_name from public.profiles where id = auth.uid();
  perform public._alert('incident', p_order,
    format('%s from %s%s%s', upper(p_kind), v_name, case when p_message is not null then ': ' || left(p_message, 200) else '' end,
           case when p_lat is not null then format(' · https://maps.google.com/?q=%s,%s', p_lat, p_lng) else '' end),
    case when p_kind in ('sos', 'accident', 'harassment') then 'urgent' else 'warn' end);
end $$;
create or replace function public.admin_resolve_incident(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  update public.incidents set status = 'resolved', resolved_at = now(), resolved_by = auth.uid() where id = p_id and status = 'open';
end $$;
grant execute on function public.captain_report_incident(text, text, double precision, double precision, uuid), public.admin_resolve_incident(bigint) to authenticated;
alter publication supabase_realtime add table public.incidents;

-- allow the new key in the settings allowlist
create or replace function public._setting_allowed(p_key text)
returns boolean language sql immutable as $$
  select p_key in ('min_charge','member_discount_pct','slot_windows','max_orders_per_slot','slot_capacity_overrides','service_area','support','require_photos','require_cleaner_step','business',
                   'captain_fee_per_order','referral_bonus','referral_min_order','offer_timeout_min','auto_assign','max_reschedules','claim_credit_multiple','claims_policy','require_job_accept','ops_phone')
$$;
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if not public._setting_allowed(p_key) then raise exception 'Unknown setting %', p_key; end if;
  if p_key = 'member_discount_pct' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 90) then raise exception 'Discount must be 0–90 percent'; end if;
  if p_key = 'min_charge' and (p_value #>> '{}')::numeric < 0 then raise exception 'Minimum charge cannot be negative'; end if;
  if p_key = 'max_orders_per_slot' and (p_value #>> '{}')::numeric < 1 then raise exception 'Capacity must be at least 1'; end if;
  if p_key = 'service_area' and (
       (p_value->>'radius_km')::numeric <= 0 or (p_value->>'lat')::numeric not between -90 and 90 or (p_value->>'lng')::numeric not between -180 and 180
     ) then raise exception 'Invalid service area'; end if;
  if p_key in ('require_photos', 'require_cleaner_step', 'auto_assign', 'require_job_accept') and jsonb_typeof(p_value) <> 'boolean' then raise exception '% must be true or false', p_key; end if;
  if p_key in ('offer_timeout_min', 'max_reschedules', 'captain_fee_per_order', 'referral_bonus', 'referral_min_order', 'claim_credit_multiple') and (p_value #>> '{}')::numeric < 0 then raise exception '% cannot be negative', p_key; end if;
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
