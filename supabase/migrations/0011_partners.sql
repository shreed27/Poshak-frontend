-- 0011: partner management — full rider / laundromat profiles, status controls, per-laundromat assignment, laundromat earnings & settlement.

-- ============================================================ partner profiles (admin fills these in; keyed by email so it works before the first sign-in)
create table if not exists public.staff_profiles (
  email text primary key references public.staff_emails(email) on delete cascade on update cascade,
  status text not null default 'active' check (status in ('onboarding', 'active', 'paused', 'suspended', 'offboarded')),
  -- contact & identity
  alt_phone text, address text, city text, pincode text, zone text, dob date,
  emergency_name text, emergency_phone text, blood_group text,
  id_type text check (id_type in ('aadhaar', 'pan', 'driving_licence', 'voter_id', 'passport')),
  id_number text,                                    -- Aadhaar: last 4 digits only
  kyc_status text not null default 'pending' check (kyc_status in ('pending', 'verified', 'rejected')),
  kyc_notes text,
  -- payout details
  bank_holder text, bank_account text, bank_ifsc text, upi_id text,
  payout_cycle text not null default 'weekly' check (payout_cycle in ('daily', 'weekly', 'fortnightly', 'monthly')),
  -- engagement
  joined_on date not null default current_date, contract_end date,
  shift_start time, shift_end time,
  work_days int[] not null default '{0,1,2,3,4,5,6}',
  max_active_jobs int check (max_active_jobs is null or max_active_jobs > 0),
  notes text,                                        -- admin-only
  tags text[] not null default '{}',
  -- riders
  vehicle_type text check (vehicle_type in ('bicycle', 'scooter', 'motorcycle', 'ev_scooter', 'car')),
  vehicle_model text, vehicle_number text, license_number text, license_expiry date, insurance_expiry date,
  uniform_issued boolean not null default false, bag_issued boolean not null default false, helmet_issued boolean not null default false,
  fee_override numeric check (fee_override is null or fee_override >= 0),
  -- laundromats
  business_name text, owner_name text, gstin text, pan text, trade_license text,
  lat double precision, lng double precision,
  capacity_kg_per_day numeric check (capacity_kg_per_day is null or capacity_kg_per_day > 0),
  machines int check (machines is null or machines >= 0),
  services text[] not null default '{}',             -- service ids this laundromat can handle; empty = everything
  turnaround_hours int check (turnaround_hours is null or turnaround_hours > 0),
  open_time time, close_time time,
  payout_per_kg numeric not null default 0 check (payout_per_kg >= 0),
  payout_per_order numeric not null default 0 check (payout_per_order >= 0),
  payout_per_piece numeric not null default 0 check (payout_per_piece >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.staff_profiles enable row level security;
drop policy if exists "staff profiles admin" on public.staff_profiles;
create policy "staff profiles admin" on public.staff_profiles for select using (public.my_role() = 'admin');
grant select on public.staff_profiles to authenticated;

drop trigger if exists audit_staff_profiles_trg on public.staff_profiles;
create trigger audit_staff_profiles_trg after insert or update or delete on public.staff_profiles for each row execute function public._audit_change('email');

-- Dispatch only considers partners whose status is "active" (people with no profile row yet count as active).
create or replace function public._partner_active(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select sp.status = 'active' from public.profiles p join public.staff_profiles sp on lower(sp.email) = lower(p.email) where p.id = p_user), true)
$$;
revoke execute on function public._partner_active(uuid) from public, anon, authenticated;

-- Create or update a partner with all their details in one call.
create or replace function public.admin_save_partner(p_email text, p_role text, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_phone text := nullif(regexp_replace(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), '^(91|0)([0-9]{10})$', '\2'), '');
  v_name text := nullif(trim(coalesce(p->>'name', '')), '');
  v_veh text;
  r public.staff_profiles;
begin
  perform public._require_role('admin');
  if p_role not in ('admin', 'captain', 'cleaner') then raise exception 'Role must be admin, captain or cleaner'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email'; end if;
  if v_phone is not null and v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Phone must be a 10-digit Indian mobile number'; end if;
  if p_role in ('captain', 'cleaner') and (v_name is null or v_phone is null) then raise exception 'Name and phone number are required'; end if;
  if exists (select 1 from public.staff_emails where email = v_email and role <> p_role) then raise exception '% is already on the team with a different role — remove them first', v_email; end if;

  r := jsonb_populate_record(null::public.staff_profiles, (p - 'email' - 'created_at' - 'updated_at') || jsonb_build_object('email', v_email));
  -- jsonb_populate_record leaves missing keys NULL (no column defaults), so apply them here
  r.status := coalesce(r.status, 'active'); r.kyc_status := coalesce(r.kyc_status, 'pending'); r.payout_cycle := coalesce(r.payout_cycle, 'weekly');
  r.joined_on := coalesce(r.joined_on, current_date); r.work_days := coalesce(r.work_days, '{0,1,2,3,4,5,6}'); r.tags := coalesce(r.tags, '{}'); r.services := coalesce(r.services, '{}');
  r.uniform_issued := coalesce(r.uniform_issued, false); r.bag_issued := coalesce(r.bag_issued, false); r.helmet_issued := coalesce(r.helmet_issued, false);
  r.payout_per_kg := coalesce(r.payout_per_kg, 0); r.payout_per_order := coalesce(r.payout_per_order, 0); r.payout_per_piece := coalesce(r.payout_per_piece, 0);
  r.created_at := now(); r.updated_at := now();
  r.bank_ifsc := upper(r.bank_ifsc); r.vehicle_number := upper(r.vehicle_number); r.gstin := upper(r.gstin); r.pan := upper(r.pan);
  if r.alt_phone is not null and regexp_replace(r.alt_phone, '\D', '', 'g') !~ '^[0-9]{10,12}$' then raise exception 'Alternate phone looks wrong'; end if;
  if r.emergency_phone is not null and regexp_replace(r.emergency_phone, '\D', '', 'g') !~ '^[0-9]{10,12}$' then raise exception 'Emergency phone looks wrong'; end if;
  if r.pincode is not null and r.pincode !~ '^[0-9]{6}$' then raise exception 'Pincode must be 6 digits'; end if;
  if r.bank_ifsc is not null and upper(r.bank_ifsc) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'IFSC looks wrong (e.g. HDFC0001234)'; end if;
  if r.bank_account is not null and r.bank_account !~ '^[0-9]{6,18}$' then raise exception 'Bank account must be 6–18 digits'; end if;
  if r.upi_id is not null and r.upi_id !~ '^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$' then raise exception 'UPI id looks wrong (e.g. name@okhdfc)'; end if;
  if r.gstin is not null and upper(r.gstin) !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$' then raise exception 'GSTIN looks wrong'; end if;
  if r.pan is not null and upper(r.pan) !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'PAN looks wrong (e.g. ABCDE1234F)'; end if;
  if r.id_type = 'aadhaar' and r.id_number is not null and r.id_number !~ '^[0-9]{4}$' then raise exception 'For Aadhaar store only the last 4 digits'; end if;
  if r.work_days is not null and exists (select 1 from unnest(r.work_days) d where d not between 0 and 6) then raise exception 'Working days must be 0 (Sun) to 6 (Sat)'; end if;
  if r.lat is not null and (r.lat not between -90 and 90 or r.lng is null or r.lng not between -180 and 180) then raise exception 'Location coordinates look wrong'; end if;
  if r.shift_start is not null and r.shift_end is not null and r.shift_start = r.shift_end then raise exception 'Shift start and end cannot be the same'; end if;

  v_veh := nullif(trim(concat_ws(' · ', nullif(r.vehicle_model, ''), nullif(upper(r.vehicle_number), ''))), '');
  insert into public.staff_emails (email, role, name, phone, vehicle) values (v_email, p_role, v_name, v_phone, v_veh)
  on conflict (email) do update set name = excluded.name, phone = excluded.phone, vehicle = excluded.vehicle;

  insert into public.staff_profiles select (r).*
  on conflict (email) do update set
    status = excluded.status, alt_phone = excluded.alt_phone, address = excluded.address, city = excluded.city, pincode = excluded.pincode, zone = excluded.zone, dob = excluded.dob,
    emergency_name = excluded.emergency_name, emergency_phone = excluded.emergency_phone, blood_group = excluded.blood_group, id_type = excluded.id_type, id_number = excluded.id_number,
    kyc_status = excluded.kyc_status, kyc_notes = excluded.kyc_notes, bank_holder = excluded.bank_holder, bank_account = excluded.bank_account, bank_ifsc = upper(excluded.bank_ifsc), upi_id = excluded.upi_id,
    payout_cycle = excluded.payout_cycle, joined_on = excluded.joined_on, contract_end = excluded.contract_end, shift_start = excluded.shift_start, shift_end = excluded.shift_end,
    work_days = excluded.work_days, max_active_jobs = excluded.max_active_jobs, notes = excluded.notes, tags = excluded.tags,
    vehicle_type = excluded.vehicle_type, vehicle_model = excluded.vehicle_model, vehicle_number = upper(excluded.vehicle_number), license_number = excluded.license_number,
    license_expiry = excluded.license_expiry, insurance_expiry = excluded.insurance_expiry, uniform_issued = excluded.uniform_issued, bag_issued = excluded.bag_issued, helmet_issued = excluded.helmet_issued,
    fee_override = excluded.fee_override, business_name = excluded.business_name, owner_name = excluded.owner_name, gstin = upper(excluded.gstin), pan = upper(excluded.pan),
    trade_license = excluded.trade_license, lat = excluded.lat, lng = excluded.lng, capacity_kg_per_day = excluded.capacity_kg_per_day, machines = excluded.machines,
    services = excluded.services, turnaround_hours = excluded.turnaround_hours, open_time = excluded.open_time, close_time = excluded.close_time,
    payout_per_kg = excluded.payout_per_kg, payout_per_order = excluded.payout_per_order, payout_per_piece = excluded.payout_per_piece, updated_at = now();

  -- Already signed up? Apply right now.
  update public.profiles
     set role = case when r.status in ('suspended', 'offboarded') then 'customer' else p_role end,
         name = coalesce(v_name, name), phone = coalesce(v_phone, phone), vehicle = coalesce(v_veh, vehicle),
         is_online = case when r.status = 'active' then is_online else false end
   where lower(email) = v_email;
end $$;
grant execute on function public.admin_save_partner(text, text, jsonb) to authenticated;

create or replace function public.admin_set_partner_status(p_email text, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_role text;
begin
  perform public._require_role('admin');
  if p_status not in ('onboarding', 'active', 'paused', 'suspended', 'offboarded') then raise exception 'Unknown status'; end if;
  select role into v_role from public.staff_emails where email = v_email;
  if v_role is null then raise exception 'Not on the team'; end if;
  if v_email = lower((select email from public.profiles where id = auth.uid())) and p_status in ('suspended', 'offboarded', 'paused') then raise exception 'You cannot suspend yourself'; end if;
  insert into public.staff_profiles (email, status, notes) values (v_email, p_status, p_note)
  on conflict (email) do update set status = excluded.status, notes = case when p_note is null then public.staff_profiles.notes else coalesce(public.staff_profiles.notes || E'\n', '') || to_char(now() at time zone 'Asia/Kolkata', 'DD Mon YYYY') || ': ' || p_note end, updated_at = now();
  update public.profiles
     set role = case when p_status in ('suspended', 'offboarded') then 'customer' else v_role end,
         is_online = case when p_status = 'active' then is_online else false end
   where lower(email) = v_email;
end $$;
grant execute on function public.admin_set_partner_status(text, text, text) to authenticated;

-- Sign-in: suspended / offboarded people lose staff access (they become ordinary customers).
create or replace function public.claim_staff_role()
returns text language plpgsql security definer set search_path = public as $$
declare v_email text; st public.staff_emails; v_role text; v_status text;
begin
  if auth.uid() is null then return 'customer'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then return 'customer'; end if;
  select * into st from public.staff_emails where lower(email) = lower(v_email);
  select status into v_status from public.staff_profiles where lower(email) = lower(v_email);
  v_role := coalesce(st.role, 'customer');
  if v_status in ('suspended', 'offboarded') then v_role := 'customer'; end if;
  update public.profiles
     set role = v_role,
         name = coalesce(st.name, name),
         phone = coalesce(st.phone, phone),
         vehicle = coalesce(st.vehicle, vehicle)
   where id = auth.uid();
  return v_role;
end $$;

-- What a partner may see about themselves: no admin notes, no KYC remarks, account numbers masked.
create or replace function public.my_partner_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text; sp public.staff_profiles; st public.staff_emails;
begin
  select email into v_email from public.profiles where id = auth.uid();
  select * into st from public.staff_emails where lower(email) = lower(v_email);
  if not found then return null; end if;
  select * into sp from public.staff_profiles where lower(email) = lower(v_email);
  return to_jsonb(sp) - 'notes' - 'kyc_notes' - 'tags' - 'id_number' - 'bank_account' - 'bank_ifsc' - 'created_at' - 'updated_at'
         || jsonb_build_object('email', st.email, 'name', st.name, 'phone', st.phone, 'role', st.role,
              'bank_last4', right(sp.bank_account, 4), 'id_last4', right(sp.id_number, 4), 'has_bank', sp.bank_account is not null or sp.upi_id is not null);
end $$;
grant execute on function public.my_partner_profile() to authenticated;

-- Self-service: only contact details and the emergency contact. Bank / ID changes go through the admin.
create or replace function public.partner_update_profile(p_alt_phone text, p_address text, p_emergency_name text, p_emergency_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  perform public._require_any(array['captain', 'cleaner']);
  if p_alt_phone is not null and p_alt_phone <> '' and regexp_replace(p_alt_phone, '\D', '', 'g') !~ '^[0-9]{10,12}$' then raise exception 'Alternate phone looks wrong'; end if;
  if p_emergency_phone is not null and p_emergency_phone <> '' and regexp_replace(p_emergency_phone, '\D', '', 'g') !~ '^[0-9]{10,12}$' then raise exception 'Emergency phone looks wrong'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  insert into public.staff_profiles (email) values (lower(v_email)) on conflict (email) do nothing;
  update public.staff_profiles set alt_phone = nullif(trim(p_alt_phone), ''), address = nullif(trim(p_address), ''),
         emergency_name = nullif(trim(p_emergency_name), ''), emergency_phone = nullif(trim(p_emergency_phone), ''), updated_at = now()
   where lower(email) = lower(v_email);
end $$;
grant execute on function public.partner_update_profile(text, text, text, text) to authenticated;

-- Per-rider fee override applies to new deliveries.
create or replace function public.orders_earning()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' and new.captain_id is not null then
    insert into public.captain_earnings (captain_id, order_id, amount)
    values (new.captain_id, new.id, coalesce((select sp.fee_override from public.profiles p join public.staff_profiles sp on lower(sp.email) = lower(p.email) where p.id = new.captain_id),
                                             public.setting_num('captain_fee_per_order', 40)))
    on conflict (order_id) do nothing;
  end if;
  return new;
end $$;

-- Auto-assign skips riders who are paused / suspended / still onboarding.
create or replace function public._auto_assign(p_order uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.orders; v_pick uuid;
begin
  select * into o from public.orders where id = p_order;
  select p.id into v_pick
    from public.profiles p
   where p.role = 'captain' and p.is_online and p.last_seen_at > now() - interval '15 minutes' and not (p.id = any (o.declined_by))
     and public._partner_active(p.id)
     and (select count(*) from public.orders x where x.captain_id = p.id and x.status in ('captain_assigned', 'picked_up', 'cleaning', 'ready', 'out_for_delivery'))
         < coalesce((select sp.max_active_jobs from public.staff_profiles sp where lower(sp.email) = lower(p.email)), 1000)
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

-- ============================================================ laundromat assignment
alter table public.orders add column if not exists cleaner_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists cleaner_assigned_at timestamptz;
alter table public.orders add column if not exists laundry_received_at timestamptz;
alter table public.orders add column if not exists laundry_ready_at timestamptz;
create index if not exists orders_cleaner_idx on public.orders (cleaner_id) where cleaner_id is not null;

insert into public.app_settings (key, value) values ('laundry_auto_assign', 'false') on conflict (key) do nothing;
create or replace function public._setting_allowed(p_key text)
returns boolean language sql immutable as $$
  select p_key in ('min_charge','member_discount_pct','slot_windows','max_orders_per_slot','slot_capacity_overrides','service_area','support','require_photos','require_cleaner_step','business',
                   'captain_fee_per_order','referral_bonus','referral_min_order','offer_timeout_min','auto_assign','max_reschedules','claim_credit_multiple','claims_policy','require_job_accept','ops_phone','sla_hours',
                   'laundry_auto_assign')
$$;

-- Can this laundromat handle every service on the order?
create or replace function public._cleaner_serves(p_cleaner uuid, p_order uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select cardinality(sp.services) = 0 or not exists (
             select 1 from jsonb_array_elements(coalesce(o.actual_items, o.items)) i where not ((i->>'service_id') = any (sp.services)))
      from public.orders o, public.profiles p join public.staff_profiles sp on lower(sp.email) = lower(p.email)
     where o.id = p_order and p.id = p_cleaner), true)
$$;
revoke execute on function public._cleaner_serves(uuid, uuid) from public, anon, authenticated;

create or replace function public._cleaner_load(p_cleaner uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.orders where cleaner_id = p_cleaner and status in ('picked_up', 'cleaning', 'ready')
$$;
revoke execute on function public._cleaner_load(uuid) from public, anon, authenticated;

-- Least-loaded active laundromat that can handle the order and still has room.
create or replace function public._pick_cleaner(p_order uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
   where p.role = 'cleaner' and public._partner_active(p.id) and public._cleaner_serves(p.id, p_order)
     and public._cleaner_load(p.id) < coalesce((select sp.max_active_jobs from public.staff_profiles sp where lower(sp.email) = lower(p.email)), 1000)
   order by public._cleaner_load(p.id), p.created_at
   limit 1
$$;
revoke execute on function public._pick_cleaner(uuid) from public, anon, authenticated;

create or replace function public.orders_laundry_autoassign()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'picked_up' and old.status is distinct from 'picked_up' and new.cleaner_id is null and public.setting_bool('laundry_auto_assign', false) then
    new.cleaner_id := public._pick_cleaner(new.id);
    if new.cleaner_id is not null then
      new.cleaner_assigned_at := now();
      perform public._notify(new.cleaner_id, 'laundry', format('New order %s on its way', new.order_code), 'Clothes were just picked up. Receive them when they arrive.', new.id);
    else
      perform public._alert('no_laundry', new.id, format('No laundromat available for order %s — assign one manually', new.order_code), 'warn');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_laundry_autoassign_trg on public.orders;
create trigger orders_laundry_autoassign_trg before update of status on public.orders for each row execute function public.orders_laundry_autoassign();

create or replace function public.admin_assign_cleaner(p_id uuid, p_cleaner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; c public.profiles;
begin
  perform public._require_role('admin');
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status in ('delivered', 'cancelled', 'out_for_delivery') then raise exception 'This order is already %', replace(o.status, '_', ' '); end if;
  if o.status in ('cleaning', 'ready') and o.cleaner_id is not null and o.cleaner_id is distinct from p_cleaner then raise exception 'The clothes are already at the current laundromat'; end if;
  if p_cleaner is null then
    update public.orders set cleaner_id = null, cleaner_assigned_at = null where id = p_id;
    return;
  end if;
  select * into c from public.profiles where id = p_cleaner and role = 'cleaner';
  if not found then raise exception 'Not a laundromat'; end if;
  if not public._cleaner_serves(p_cleaner, p_id) then raise exception 'This laundromat does not handle all services on this order'; end if;
  update public.orders set cleaner_id = p_cleaner, cleaner_assigned_at = now() where id = p_id;
  perform public._notify(p_cleaner, 'laundry', format('Order %s assigned to you', o.order_code), 'Open the app to see the details.', p_id);
end $$;
grant execute on function public.admin_assign_cleaner(uuid, uuid) to authenticated;

-- ============================================================ laundromat queue / receive / ready (assignment aware)
drop function if exists public.cleaner_queue();
create or replace function public.cleaner_queue()
returns table (id uuid, order_code text, status text, service_name text, actual_items jsonb, items jsonb, special_instructions text,
               pieces_picked_up int, pieces_received int, picked_up_at timestamptz, cleaner_id uuid, assigned_to_me boolean,
               pickup_date date, pickup_slot text, delivery_slot text, received_at timestamptz, ready_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_admin boolean;
begin
  perform public._require_any(array['cleaner', 'admin']);
  v_admin := public.my_role() = 'admin';
  return query
    select o.id, o.order_code, o.status, o.service_name, o.actual_items, o.items, o.special_instructions, o.pieces_picked_up,
           (select c.piece_count from public.order_checks c where c.order_id = o.id and c.stage = 'cleaner_in'), o.picked_up_at,
           o.cleaner_id, o.cleaner_id = auth.uid(), o.pickup_date, o.pickup_slot, o.delivery_slot, o.laundry_received_at, o.laundry_ready_at
    from public.orders o
    where v_admin
       or (o.cleaner_id = auth.uid() and o.status in ('placed', 'captain_assigned', 'picked_up', 'cleaning', 'ready'))
       or (o.cleaner_id is null and o.status = 'picked_up' and public._partner_active(auth.uid()) and public._cleaner_serves(auth.uid(), o.id))
    order by case o.status when 'picked_up' then 0 when 'cleaning' then 1 when 'ready' then 2 else 3 end, o.picked_up_at nulls last, o.created_at;
end $$;

create or replace function public.cleaner_receive(p_id uuid, p_pieces int, p_notes text default null, p_photos jsonb default '[]')
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_any(array['cleaner', 'admin']);
  select * into o from public.orders where id = p_id and status = 'picked_up' for update;
  if not found then raise exception 'Order is not waiting to be received'; end if;
  if public.my_role() = 'cleaner' then
    if o.cleaner_id is not null and o.cleaner_id <> auth.uid() then raise exception 'This order is assigned to another laundromat'; end if;
    if o.cleaner_id is null and not public._partner_active(auth.uid()) then raise exception 'Your account is not taking new orders right now'; end if;
  end if;
  if coalesce(p_pieces, 0) < 1 then raise exception 'Count the garments you received'; end if;
  if not public._valid_photos(p_id, p_photos) then raise exception 'Invalid photos'; end if;
  insert into public.order_checks (order_id, stage, piece_count, notes, photos, created_by) values (p_id, 'cleaner_in', p_pieces, p_notes, coalesce(p_photos, '[]'), auth.uid());
  update public.orders
     set status = 'cleaning', laundry_received_at = now(),
         cleaner_id = coalesce(cleaner_id, case when public.my_role() = 'cleaner' then auth.uid() end),
         cleaner_assigned_at = coalesce(cleaner_assigned_at, now())
   where id = p_id;
  if o.pieces_picked_up is not null and o.pieces_picked_up <> p_pieces then
    perform public._alert('count_mismatch', p_id, format('Order %s: captain counted %s pieces at pickup, laundry received %s', o.order_code, o.pieces_picked_up, p_pieces), 'urgent');
  end if;
end $$;

create or replace function public.cleaner_ready(p_id uuid, p_pieces int, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_any(array['cleaner', 'admin']);
  select * into o from public.orders where id = p_id and status = 'cleaning' for update;
  if not found then raise exception 'Order is not being cleaned'; end if;
  if public.my_role() = 'cleaner' and o.cleaner_id is distinct from auth.uid() then raise exception 'This order belongs to another laundromat'; end if;
  if coalesce(p_pieces, 0) < 1 then raise exception 'Count the finished garments'; end if;
  insert into public.order_checks (order_id, stage, piece_count, notes, created_by) values (p_id, 'cleaner_out', p_pieces, p_notes, auth.uid());
  update public.orders set status = 'ready', laundry_ready_at = now() where id = p_id;
  if o.pieces_picked_up is not null and o.pieces_picked_up <> p_pieces then
    perform public._alert('count_mismatch', p_id, format('Order %s: %s pieces came in but %s are ready — check before delivery', o.order_code, o.pieces_picked_up, p_pieces), 'urgent');
  end if;
end $$;
grant execute on function public.cleaner_queue(), public.cleaner_receive(uuid, int, text, jsonb), public.cleaner_ready(uuid, int, text) to authenticated;

-- ============================================================ laundromat earnings & settlement
create table if not exists public.cleaner_earnings (
  id bigint generated always as identity primary key,
  cleaner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  kg numeric not null default 0,
  pieces int not null default 0,
  amount numeric not null check (amount >= 0),
  paid_out boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cleaner_earn_idx on public.cleaner_earnings (cleaner_id, created_at desc);
alter table public.cleaner_earnings enable row level security;
drop policy if exists "cleaner earnings read" on public.cleaner_earnings;
create policy "cleaner earnings read" on public.cleaner_earnings for select using (cleaner_id = auth.uid() or public.my_role() = 'admin');
grant select on public.cleaner_earnings to authenticated;

create table if not exists public.cleaner_payouts (
  id bigint generated always as identity primary key,
  cleaner_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  orders int not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.cleaner_payouts enable row level security;
drop policy if exists "cleaner payouts read" on public.cleaner_payouts;
create policy "cleaner payouts read" on public.cleaner_payouts for select using (cleaner_id = auth.uid() or public.my_role() = 'admin');
grant select on public.cleaner_payouts to authenticated;

-- When an order is marked ready, the laundromat earns: per kg + per order + per piece (their own rates).
create or replace function public.orders_cleaner_earning()
returns trigger language plpgsql security definer set search_path = public as $$
declare sp public.staff_profiles; v_kg numeric; v_pieces int; v_amt numeric;
begin
  if new.status = 'ready' and old.status is distinct from 'ready' and new.cleaner_id is not null then
    select s.* into sp from public.profiles p join public.staff_profiles s on lower(s.email) = lower(p.email) where p.id = new.cleaner_id;
    select coalesce(sum((i->>'qty')::numeric) filter (where r.unit = 'kg'), 0) into v_kg
      from jsonb_array_elements(coalesce(new.actual_items, new.items)) i left join public.service_rates r on r.id = i->>'service_id';
    v_pieces := coalesce((select c.piece_count from public.order_checks c where c.order_id = new.id and c.stage = 'cleaner_out' order by c.created_at desc limit 1), new.pieces_picked_up, 0);
    v_amt := round(coalesce(sp.payout_per_kg, 0) * v_kg + coalesce(sp.payout_per_order, 0) + coalesce(sp.payout_per_piece, 0) * v_pieces, 2);
    insert into public.cleaner_earnings (cleaner_id, order_id, kg, pieces, amount) values (new.cleaner_id, new.id, v_kg, v_pieces, v_amt) on conflict (order_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists orders_cleaner_earning_trg on public.orders;
create trigger orders_cleaner_earning_trg after update of status on public.orders for each row execute function public.orders_cleaner_earning();

create or replace function public.admin_cleaner_balance(p_cleaner uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  return jsonb_build_object('owed', (select coalesce(sum(amount), 0) from public.cleaner_earnings where cleaner_id = p_cleaner and not paid_out),
                            'orders', (select count(*) from public.cleaner_earnings where cleaner_id = p_cleaner and not paid_out));
end $$;

create or replace function public.admin_settle_cleaner(p_cleaner uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b jsonb;
begin
  perform public._require_role('admin');
  b := public.admin_cleaner_balance(p_cleaner);
  if (b->>'orders')::int = 0 then raise exception 'Nothing to settle'; end if;
  insert into public.cleaner_payouts (cleaner_id, amount, orders, note, created_by) values (p_cleaner, (b->>'owed')::numeric, (b->>'orders')::int, p_note, auth.uid());
  update public.cleaner_earnings set paid_out = true where cleaner_id = p_cleaner and not paid_out;
  perform public._notify(p_cleaner, 'payout', 'Payment recorded', format('₹%s for %s orders will be paid to you.', b->>'owed', b->>'orders'));
  return b;
end $$;
grant execute on function public.admin_cleaner_balance(uuid), public.admin_settle_cleaner(uuid, text) to authenticated;

-- Laundromat's own dashboard numbers.
create or replace function public.cleaner_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ist timestamp := now() at time zone 'Asia/Kolkata'; v_day timestamptz := date_trunc('day', v_ist) at time zone 'Asia/Kolkata';
begin
  perform public._require_role('cleaner');
  return jsonb_build_object(
    'to_receive', (select count(*) from public.orders where cleaner_id = auth.uid() and status = 'picked_up'),
    'cleaning', (select count(*) from public.orders where cleaner_id = auth.uid() and status = 'cleaning'),
    'ready', (select count(*) from public.orders where cleaner_id = auth.uid() and status = 'ready'),
    'done_today', (select count(*) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= v_day),
    'done_week', (select count(*) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= v_day - interval '6 days'),
    'done_month', (select count(*) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= date_trunc('month', v_ist) at time zone 'Asia/Kolkata'),
    'kg_today', (select coalesce(sum(kg), 0) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= v_day),
    'kg_week', (select coalesce(sum(kg), 0) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= v_day - interval '6 days'),
    'earn_today', (select coalesce(sum(amount), 0) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= v_day),
    'earn_week', (select coalesce(sum(amount), 0) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= v_day - interval '6 days'),
    'earn_month', (select coalesce(sum(amount), 0) from public.cleaner_earnings where cleaner_id = auth.uid() and created_at >= date_trunc('month', v_ist) at time zone 'Asia/Kolkata'),
    'pending_payout', (select coalesce(sum(amount), 0) from public.cleaner_earnings where cleaner_id = auth.uid() and not paid_out),
    'avg_turnaround_hours', (select round(avg(extract(epoch from (laundry_ready_at - laundry_received_at)) / 3600)::numeric, 1) from public.orders
                              where cleaner_id = auth.uid() and laundry_ready_at is not null and laundry_received_at is not null and laundry_ready_at >= now() - interval '30 days'),
    'mismatches_30d', (select count(*) from public.ops_alerts a join public.orders o on o.id = a.order_id where a.kind = 'count_mismatch' and o.cleaner_id = auth.uid() and a.created_at >= now() - interval '30 days'));
end $$;
grant execute on function public.cleaner_summary() to authenticated;

-- Past jobs for the laundromat (their own only).
create or replace function public.cleaner_history(p_days int default 30)
returns table (order_code text, status text, service_name text, kg numeric, pieces int, amount numeric, paid_out boolean, received_at timestamptz, ready_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_role('cleaner');
  return query
    select o.order_code, o.status, o.service_name, e.kg, e.pieces, e.amount, e.paid_out, o.laundry_received_at, o.laundry_ready_at, coalesce(e.created_at, o.created_at)
      from public.orders o left join public.cleaner_earnings e on e.order_id = o.id
     where o.cleaner_id = auth.uid() and o.status in ('ready', 'out_for_delivery', 'delivered') and coalesce(e.created_at, o.updated_at) >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365))
     order by coalesce(e.created_at, o.updated_at) desc limit 300;
end $$;
grant execute on function public.cleaner_history(int) to authenticated;

-- Cleaners may now be assigned orders, so photo upload/read follows the same rule.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists "order photos insert" on storage.objects';
    execute $p$create policy "order photos insert" on storage.objects for insert to authenticated with check (
      bucket_id = 'order-photos' and exists (
        select 1 from public.orders o where o.id::text = (storage.foldername(name))[1]
          and (o.captain_id = auth.uid() or o.customer_id = auth.uid() or public.my_role() = 'admin'
               or (public.my_role() = 'cleaner' and o.status in ('picked_up', 'cleaning', 'ready') and (o.cleaner_id = auth.uid() or o.cleaner_id is null))))
    )$p$;
  end if;
end $$;

-- Cleaner payout/earnings tables are append-style: audit settlements.
drop trigger if exists audit_cleaner_payouts_trg on public.cleaner_payouts;
create trigger audit_cleaner_payouts_trg after insert on public.cleaner_payouts for each row execute function public._audit_change('id');
