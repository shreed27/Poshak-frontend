-- Poshak backend schema (v2: pickup → weigh-in → delivery → payment).
-- Run once in Supabase → SQL Editor on a fresh project. (If you ran the v1 schema, drop its tables first.)
--
-- Security model: clients can only READ (through RLS) and INSERT their own order.
-- Every state change goes through a SECURITY DEFINER function below, so a captain
-- can't mark an order paid, change a bill, or skip an OTP from the browser console.

-- ============================================================ profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  picture text,
  phone text,
  vehicle text,
  role text not null default 'customer' check (role in ('customer', 'captain', 'admin')),
  created_at timestamptz not null default now()
);

-- Who is on the team. Anyone whose Google email is listed here becomes admin / captain automatically
-- the first time they sign in (and on every later sign-in). Everyone else is a customer.
create table if not exists public.staff_emails (
  email text primary key,
  role text not null check (role in ('admin', 'captain')),
  name text,            -- pre-filled: shown to customers for captains, so use the real name
  phone text,           -- 10-digit mobile; customers call this number
  vehicle text,         -- e.g. "Hero Splendor KA-01-AB-1234"
  added_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, picture, role, phone, vehicle)
  select
    new.id, new.email,
    coalesce(st.name, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(st.role, 'customer'), st.phone, st.vehicle
  from (select 1) _ left join public.staff_emails st on lower(st.email) = lower(new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================================ pricing (server is the source of truth)
create table if not exists public.service_rates (
  id text primary key,
  name text not null,
  unit text not null,                 -- kg | pc | pair
  rate numeric not null check (rate > 0)
);
insert into public.service_rates (id, name, unit, rate) values
  ('wash-fold',    'Wash, Dry & Fold',               'kg',   49),
  ('wash-iron',    'Wash & Steam Iron',              'kg',   69),
  ('express-6h',   'Express 6-Hr Blitz Wash',        'kg',   99),
  ('dry-clean',    'Premium Suit & Silk Dry Clean',  'pc',  199),
  ('steam-press',  'Steam Press Only',               'pc',   19),
  ('shoe-spa',     'Sneaker & Shoe Spa',             'pair',249),
  ('heavy-home',   'Duvets, Blankets & Quilts',      'pc',  199)
on conflict (id) do update set name = excluded.name, unit = excluded.unit, rate = excluded.rate;

-- items: [{ "service_id": "wash-iron", "qty": 4.5 }, ...]   → ₹ (20% member discount, ₹99 minimum)
create or replace function public.price_items(p_items jsonb)
returns numeric language plpgsql stable as $$
declare subtotal numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order needs at least one service';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where (i->>'qty') is null or (i->>'qty')::numeric <= 0 or (i->>'qty')::numeric > 200
  ) then
    raise exception 'Invalid quantity';
  end if;
  select sum(r.rate * (i->>'qty')::numeric) into subtotal
  from jsonb_array_elements(p_items) i join public.service_rates r on r.id = i->>'service_id';
  if subtotal is null then raise exception 'Unknown service'; end if;
  return greatest(99, round(subtotal * 0.8));
end $$;

-- ============================================================ orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  customer_email text,
  customer_phone text,

  service_name text not null,
  items jsonb not null,                       -- what the customer booked (estimate)
  actual_items jsonb,                         -- what the captain weighed/counted at pickup
  estimated_amount numeric not null default 0,  -- set by trigger from items
  final_amount numeric,                       -- set at pickup from actual_items
  special_instructions text,
  photo_urls jsonb not null default '[]',

  payment_mode text not null default 'cod' check (payment_mode in ('cod', 'online')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'partial', 'paid')),
  paid_amount numeric not null default 0,
  refunded_amount numeric not null default 0,
  razorpay_order_id text,
  qr_id text,
  qr_image_url text,
  qr_amount numeric,
  qr_expires_at timestamptz,

  pickup_slot text,
  pickup_address text not null,
  landmark text,
  pickup_lat double precision not null,
  pickup_lng double precision not null,

  status text not null default 'placed'
    check (status in ('placed','captain_assigned','picked_up','out_for_delivery','delivered','cancelled')),

  captain_id uuid references auth.users(id),
  captain_name text,
  captain_phone text,
  captain_vehicle text,
  captain_lat double precision,
  captain_lng double precision,
  captain_updated_at timestamptz,

  rating int check (rating between 1 and 5),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_captain_idx on public.orders (captain_id);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_rzp_idx on public.orders (razorpay_order_id);
create index if not exists orders_qr_idx on public.orders (qr_id);

-- OTPs live apart from the order so a captain can never read them (they only verify via RPC).
create table if not exists public.order_secrets (
  order_id uuid primary key references public.orders(id) on delete cascade,
  pickup_otp text not null,
  delivery_otp text not null
);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

-- Every rupee that reaches us. cash rows are what a captain holds until deposited.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('cash', 'upi_qr', 'online')),
  amount numeric not null check (amount > 0),
  razorpay_payment_id text unique,
  collected_by uuid references auth.users(id),
  deposited boolean not null default false,
  deposited_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_cash_idx on public.payments (collected_by) where method = 'cash' and not deposited;

-- Razorpay retries webhooks; this makes handling idempotent.
create table if not exists public.webhook_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- ============================================================ triggers
create or replace function public.orders_before()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.estimated_amount := public.price_items(new.items);   -- never trust the client's number
  end if;
  return new;
end $$;
drop trigger if exists orders_before_trg on public.orders;
create trigger orders_before_trg before insert or update on public.orders
  for each row execute function public.orders_before();

create or replace function public.orders_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_secrets (order_id, pickup_otp, delivery_otp)
    values (new.id, lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'), lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'));
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;
drop trigger if exists orders_after_trg on public.orders;
create trigger orders_after_trg after insert or update on public.orders
  for each row execute function public.orders_after();

-- Amount still to be paid (never negative). Billable = final bill once weighed, else the estimate.
create or replace function public.order_due(o public.orders)
returns numeric language sql immutable as $$
  select greatest(0, coalesce(o.final_amount, o.estimated_amount) - o.paid_amount)
$$;

-- ============================================================ row level security + grants
alter table public.profiles enable row level security;
alter table public.service_rates enable row level security;
alter table public.orders enable row level security;
alter table public.order_secrets enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.staff_emails enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "staff read" on public.staff_emails;
create policy "staff read" on public.staff_emails for select using (public.my_role() = 'admin');

drop policy if exists "rates read" on public.service_rates;
create policy "rates read" on public.service_rates for select using (true);

drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select using (
  customer_id = auth.uid() or captain_id = auth.uid() or public.my_role() = 'admin'
);
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders for insert with check (
  customer_id = auth.uid() and status = 'placed' and captain_id is null
  and payment_status = 'pending' and paid_amount = 0 and refunded_amount = 0
  and final_amount is null and actual_items is null
);

drop policy if exists "secrets read" on public.order_secrets;
create policy "secrets read" on public.order_secrets for select using (
  public.my_role() = 'admin'
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);

drop policy if exists "events read" on public.order_events;
create policy "events read" on public.order_events for select using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.customer_id = auth.uid() or o.captain_id = auth.uid() or public.my_role() = 'admin'))
);

drop policy if exists "payments read" on public.payments;
create policy "payments read" on public.payments for select using (
  collected_by = auth.uid() or public.my_role() = 'admin'
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);

-- Browser roles: read via RLS, insert an order, edit own profile. Nothing else.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.service_rates, public.orders, public.order_secrets,
                public.order_events, public.payments, public.staff_emails to authenticated;
grant select on public.service_rates to anon;
grant insert on public.orders to authenticated;
grant update (name, picture, phone) on public.profiles to authenticated;

-- ============================================================ actions (all state changes)
create or replace function public._require_role(p_role text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or public.my_role() is distinct from p_role then
    raise exception 'Not allowed';
  end if;
end $$;

-- Called right after every sign-in: syncs the caller's role with the staff list.
create or replace function public.claim_staff_role()
returns text language plpgsql security definer set search_path = public as $$
declare v_email text; st public.staff_emails; v_role text;
begin
  if auth.uid() is null then return 'customer'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then return 'customer'; end if;
  select * into st from public.staff_emails where lower(email) = lower(v_email);
  v_role := coalesce(st.role, 'customer');
  update public.profiles
     set role = v_role,
         name = coalesce(st.name, name),          -- staff details from the admin always win over the Google profile
         phone = coalesce(st.phone, phone),
         vehicle = coalesce(st.vehicle, vehicle)
   where id = auth.uid();
  return v_role;
end $$;

create or replace function public.admin_add_staff(p_email text, p_role text, p_name text default null, p_phone text default null, p_vehicle text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_phone text := nullif(regexp_replace(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '^(91|0)([0-9]{10})$', '\2'), '');   -- +91 / 0 prefixes dropped
begin
  perform public._require_role('admin');
  if p_role not in ('admin', 'captain') then raise exception 'Role must be admin or captain'; end if;
  if v_email is null or position('@' in v_email) = 0 then raise exception 'Enter a valid email'; end if;
  if v_phone is not null and v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Phone must be a 10-digit Indian mobile number'; end if;
  if p_role = 'captain' and (nullif(trim(coalesce(p_name, '')), '') is null or v_phone is null) then
    raise exception 'Delivery partners need a name and phone number (customers see and call them)';
  end if;
  insert into public.staff_emails (email, role, name, phone, vehicle)
  values (v_email, p_role, nullif(trim(p_name), ''), v_phone, nullif(trim(p_vehicle), ''))
  on conflict (email) do update set role = excluded.role, name = excluded.name, phone = excluded.phone, vehicle = excluded.vehicle;
  update public.profiles   -- already signed up? apply right now
     set role = p_role, name = coalesce(nullif(trim(p_name), ''), name), phone = coalesce(v_phone, phone), vehicle = coalesce(nullif(trim(p_vehicle), ''), vehicle)
   where lower(email) = v_email;
end $$;

create or replace function public.admin_remove_staff(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if lower(trim(p_email)) = lower((select email from public.profiles where id = auth.uid())) then
    raise exception 'You cannot remove yourself';
  end if;
  delete from public.staff_emails where lower(email) = lower(trim(p_email));
  update public.profiles set role = 'customer' where lower(email) = lower(trim(p_email));
end $$;

-- Customer
create or replace function public.cancel_my_order(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'cancelled'
  where id = p_id and customer_id = auth.uid() and status in ('placed', 'captain_assigned');
  if not found then raise exception 'Order cannot be cancelled after pickup'; end if;
end $$;

create or replace function public.rate_my_order(p_id uuid, p_rating int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set rating = p_rating
  where id = p_id and customer_id = auth.uid() and status = 'delivered';
end $$;

-- Captain
create or replace function public.captain_update_location(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('captain');
  update public.orders set captain_lat = p_lat, captain_lng = p_lng, captain_updated_at = now()
  where captain_id = auth.uid() and status in ('captain_assigned', 'out_for_delivery');
end $$;

-- At the doorstep: customer reads out the pickup OTP, captain weighs/counts, bill is fixed.
create or replace function public.confirm_pickup(p_id uuid, p_otp text, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_final numeric;
begin
  perform public._require_role('captain');
  if not exists (select 1 from public.orders where id = p_id and captain_id = auth.uid() and status = 'captain_assigned') then
    raise exception 'This order is not ready for pickup';
  end if;
  if not exists (select 1 from public.order_secrets where order_id = p_id and pickup_otp = trim(p_otp)) then
    raise exception 'Wrong OTP. Ask the customer for the 4-digit pickup code.';
  end if;
  v_final := public.price_items(p_items);
  update public.orders
     set actual_items = p_items, final_amount = v_final, status = 'picked_up', picked_up_at = now(),
         payment_status = case when paid_amount >= v_final then 'paid' when paid_amount > 0 then 'partial' else 'pending' end
   where id = p_id;
  return v_final;
end $$;

create or replace function public.start_delivery(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('captain');
  update public.orders set status = 'out_for_delivery'
  where id = p_id and captain_id = auth.uid() and status = 'picked_up';
  if not found then raise exception 'Order is not ready for delivery'; end if;
end $$;

-- Customer handed over cash. Records exactly the amount due, owed back to us by the captain.
create or replace function public.collect_cash(p_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare o public.orders; v_due numeric;
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid() and status = 'out_for_delivery' for update;
  if not found then raise exception 'Order is not out for delivery'; end if;
  v_due := public.order_due(o);
  if v_due <= 0 then raise exception 'Nothing left to pay'; end if;
  insert into public.payments (order_id, method, amount, collected_by) values (p_id, 'cash', v_due, auth.uid());
  update public.orders set paid_amount = paid_amount + v_due, payment_status = 'paid' where id = p_id;
  return v_due;
end $$;

-- Final handover: needs full payment AND the delivery OTP.
create or replace function public.confirm_delivery(p_id uuid, p_otp text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid() and status = 'out_for_delivery' for update;
  if not found then raise exception 'Order is not out for delivery'; end if;
  if public.order_due(o) > 0 then raise exception 'Collect the payment first (₹% due)', public.order_due(o); end if;
  if not exists (select 1 from public.order_secrets where order_id = p_id and delivery_otp = trim(p_otp)) then
    raise exception 'Wrong OTP. Ask the customer for the 4-digit delivery code.';
  end if;
  update public.orders set status = 'delivered', delivered_at = now() where id = p_id;
end $$;

-- Admin
create or replace function public.admin_assign_captain(p_id uuid, p_captain uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.profiles;
begin
  perform public._require_role('admin');
  select * into c from public.profiles where id = p_captain and role = 'captain';
  if not found then raise exception 'Not a captain'; end if;
  update public.orders
     set captain_id = c.id, captain_name = coalesce(c.name, c.email), captain_phone = c.phone, captain_vehicle = c.vehicle,
         status = case when status = 'placed' then 'captain_assigned' else status end
   where id = p_id and status in ('placed', 'captain_assigned', 'picked_up', 'out_for_delivery');
end $$;

create or replace function public.admin_set_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  update public.orders set status = p_status,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end
  where id = p_id;
end $$;

create or replace function public.admin_mark_refunded(p_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  update public.orders set refunded_amount = refunded_amount + p_amount where id = p_id;
end $$;

create or replace function public.admin_mark_cash_deposited(p_captain uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  update public.payments set deposited = true, deposited_at = now()
  where collected_by = p_captain and method = 'cash' and not deposited;
end $$;

grant execute on function
  public.claim_staff_role(), public.admin_add_staff(text, text, text, text, text), public.admin_remove_staff(text),
  public.cancel_my_order(uuid), public.rate_my_order(uuid, int),
  public.captain_update_location(double precision, double precision),
  public.confirm_pickup(uuid, text, jsonb), public.start_delivery(uuid),
  public.collect_cash(uuid), public.confirm_delivery(uuid, text),
  public.admin_assign_captain(uuid, uuid), public.admin_set_status(uuid, text),
  public.admin_mark_refunded(uuid, numeric), public.admin_mark_cash_deposited(uuid)
to authenticated;

-- Server-only: called by the Razorpay edge functions with the service-role key.
create or replace function public.apply_payment(p_order uuid, p_amount numeric, p_method text, p_rzp_payment text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o public.orders; v_new_paid numeric; v_bill numeric;
begin
  insert into public.payments (order_id, method, amount, razorpay_payment_id)
  values (p_order, p_method, p_amount, p_rzp_payment)
  on conflict (razorpay_payment_id) do nothing;
  if not found then return false; end if;           -- already applied (retry / duplicate)

  select * into o from public.orders where id = p_order for update;
  v_new_paid := o.paid_amount + p_amount;
  v_bill := coalesce(o.final_amount, o.estimated_amount);
  update public.orders
     set paid_amount = v_new_paid,
         payment_status = case when v_new_paid >= v_bill then 'paid' else 'partial' end
   where id = p_order;
  return true;
end $$;
revoke execute on function public.apply_payment(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.apply_payment(uuid, numeric, text, text) to service_role;

-- ============================================================ realtime
alter publication supabase_realtime add table public.orders;

-- ============================================================ first admin (run ONCE, before or after you sign in)
-- insert into public.staff_emails (email, role, name, phone) values ('owner@yourcompany.com', 'admin', 'Owner Name', '9876543210');
-- After that, add every other maker / delivery partner from the dashboard → Team (no SQL needed).
