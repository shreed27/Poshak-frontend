-- 0002: admin-editable settings, prices, coupons, slot capacity, service-area enforcement.

-- ============================================================ settings (admin editable, public read)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "settings read" on public.app_settings;
create policy "settings read" on public.app_settings for select using (true);   -- nothing secret lives here
grant select on public.app_settings to anon, authenticated;

insert into public.app_settings (key, value) values
  ('min_charge',          '99'),
  ('member_discount_pct', '0'),
  ('slot_windows',        '[[7,9],[9,11],[11,13],[13,15],[15,17],[17,19],[19,21]]'),
  ('max_orders_per_slot', '6'),
  ('slot_capacity_overrides', '{}'),
  ('service_area',        '{"name":"SG Palya & Christ University","short":"SG Palya / Christ Univ.","lat":12.9346,"lng":77.6060,"radius_km":3}'),
  ('support',             '{"phone":"","email":"support@poshak.in","grievance_officer":"","grievance_email":"grievance@poshak.in"}')
on conflict (key) do nothing;

create or replace function public.setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key
$$;
create or replace function public.setting_num(p_key text, p_default numeric default 0)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = p_key), p_default)
$$;

-- Only these keys can be changed from the dashboard, each with a sanity check.
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_key not in (select jsonb_array_elements_text('["min_charge","member_discount_pct","slot_windows","max_orders_per_slot","slot_capacity_overrides","service_area","support"]'::jsonb)) then
    raise exception 'Unknown setting %', p_key;
  end if;
  if p_key = 'member_discount_pct' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 90) then raise exception 'Discount must be 0–90 percent'; end if;
  if p_key = 'min_charge' and (p_value #>> '{}')::numeric < 0 then raise exception 'Minimum charge cannot be negative'; end if;
  if p_key = 'max_orders_per_slot' and (p_value #>> '{}')::numeric < 1 then raise exception 'Capacity must be at least 1'; end if;
  if p_key = 'service_area' and (
       (p_value->>'radius_km')::numeric <= 0 or (p_value->>'lat')::numeric not between -90 and 90 or (p_value->>'lng')::numeric not between -180 and 180
     ) then raise exception 'Invalid service area'; end if;
  insert into public.app_settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

-- ============================================================ prices
alter table public.service_rates add column if not exists active boolean not null default true;
alter table public.service_rates add column if not exists sort int not null default 100;

create or replace function public.admin_upsert_rate(p_id text, p_name text, p_unit text, p_rate numeric, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_id !~ '^[a-z0-9-]{2,40}$' then raise exception 'Service id: lowercase letters, numbers and dashes only'; end if;
  if p_rate is null or p_rate <= 0 then raise exception 'Rate must be above 0'; end if;
  if p_unit not in ('kg', 'pc', 'pair') then raise exception 'Unit must be kg, pc or pair'; end if;
  insert into public.service_rates (id, name, unit, rate, active) values (p_id, p_name, p_unit, p_rate, coalesce(p_active, true))
  on conflict (id) do update set name = excluded.name, unit = excluded.unit, rate = excluded.rate, active = excluded.active;
end $$;

-- ============================================================ coupons
create table if not exists public.coupons (
  code text primary key,
  description text,
  kind text not null check (kind in ('percent', 'flat')),
  value numeric not null check (value > 0),
  min_order numeric not null default 0,
  max_discount numeric,                       -- cap for percent coupons
  first_order_only boolean not null default false,
  per_user_limit int not null default 1,
  usage_limit int,                            -- total redemptions, null = unlimited
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
drop policy if exists "coupons admin read" on public.coupons;
create policy "coupons admin read" on public.coupons for select using (public.my_role() = 'admin');
grant select on public.coupons to authenticated;

insert into public.coupons (code, description, kind, value, min_order, max_discount, first_order_only) values
  ('WELCOME100', 'Flat ₹100 off your first order above ₹299', 'flat', 100, 299, null, true),
  ('POSHAK20',   '20% off, up to ₹150',                       'percent', 20, 0, 150, false)
on conflict (code) do nothing;

create or replace function public.admin_upsert_coupon(
  p_code text, p_description text, p_kind text, p_value numeric, p_min_order numeric, p_max_discount numeric,
  p_first_order_only boolean, p_per_user_limit int, p_usage_limit int, p_active boolean, p_expires_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if upper(trim(p_code)) !~ '^[A-Z0-9]{3,20}$' then raise exception 'Code: 3–20 letters/numbers'; end if;
  if p_kind = 'percent' and p_value > 100 then raise exception 'Percent cannot exceed 100'; end if;
  insert into public.coupons (code, description, kind, value, min_order, max_discount, first_order_only, per_user_limit, usage_limit, active, expires_at)
  values (upper(trim(p_code)), p_description, p_kind, p_value, coalesce(p_min_order, 0), p_max_discount, coalesce(p_first_order_only, false),
          coalesce(p_per_user_limit, 1), p_usage_limit, coalesce(p_active, true), p_expires_at)
  on conflict (code) do update set description = excluded.description, kind = excluded.kind, value = excluded.value, min_order = excluded.min_order,
    max_discount = excluded.max_discount, first_order_only = excluded.first_order_only, per_user_limit = excluded.per_user_limit,
    usage_limit = excluded.usage_limit, active = excluded.active, expires_at = excluded.expires_at;
end $$;

-- ============================================================ pricing engine
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists subtotal_amount numeric;
alter table public.orders add column if not exists discount_amount numeric not null default 0;
alter table public.orders add column if not exists pickup_date date;
alter table public.orders add column if not exists pickup_window text;      -- '17-19'

-- Returns the whole breakdown. p_honor = true re-prices a booked order (coupon already validated at booking time).
create or replace function public.price_order(p_items jsonb, p_coupon text, p_user uuid, p_honor boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_sub numeric; v_member numeric := 0; v_coupon numeric := 0; v_total numeric; v_err text := null;
  c public.coupons; v_pct numeric := public.setting_num('member_discount_pct', 0); v_min numeric := public.setting_num('min_charge', 0);
  v_after numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Order needs at least one service'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) i where (i->>'qty') is null or (i->>'qty')::numeric <= 0 or (i->>'qty')::numeric > 200) then
    raise exception 'Invalid quantity';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i left join public.service_rates r on r.id = i->>'service_id' where r.id is null or not r.active) then
    raise exception 'A selected service is not available';
  end if;
  select sum(r.rate * (i->>'qty')::numeric) into v_sub
    from jsonb_array_elements(p_items) i join public.service_rates r on r.id = i->>'service_id';

  v_member := round(v_sub * v_pct / 100);
  v_after := v_sub - v_member;

  if p_coupon is not null and trim(p_coupon) <> '' then
    select * into c from public.coupons where code = upper(trim(p_coupon));
    if not found or not c.active then v_err := 'Invalid coupon';
    elsif not p_honor and c.starts_at is not null and c.starts_at > now() then v_err := 'Coupon not active yet';
    elsif not p_honor and c.expires_at is not null and c.expires_at < now() then v_err := 'Coupon has expired';
    elsif not p_honor and v_after < c.min_order then v_err := 'Add ₹' || (c.min_order - v_after)::int || ' more to use this coupon';
    elsif not p_honor and c.first_order_only and exists (select 1 from public.orders o where o.customer_id = p_user and o.status <> 'cancelled') then v_err := 'Only for your first order';
    elsif not p_honor and (select count(*) from public.orders o where o.customer_id = p_user and o.coupon_code = c.code and o.status <> 'cancelled') >= c.per_user_limit then v_err := 'You have already used this coupon';
    elsif not p_honor and c.usage_limit is not null and (select count(*) from public.orders o where o.coupon_code = c.code and o.status <> 'cancelled') >= c.usage_limit then v_err := 'Coupon fully redeemed';
    else
      v_coupon := case c.kind when 'flat' then c.value else round(v_after * c.value / 100) end;
      if c.max_discount is not null then v_coupon := least(v_coupon, c.max_discount); end if;
      v_coupon := least(v_coupon, v_after);
    end if;
  end if;

  v_total := greatest(v_min, v_after - v_coupon);
  return jsonb_build_object('subtotal', v_sub, 'member_discount', v_member, 'coupon_discount', v_coupon,
                            'total', v_total, 'coupon_error', v_err);
end $$;

-- Kept for older callers/tests: no coupon, no honouring.
create or replace function public.price_items(p_items jsonb)
returns numeric language sql stable security definer set search_path = public as $$
  select ((public.price_order(p_items, null, null))->>'total')::numeric
$$;

-- Customer-facing preview (cart / booking screen).
create or replace function public.preview_price(p_items jsonb, p_coupon text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.price_order(p_items, p_coupon, auth.uid())
$$;
grant execute on function public.preview_price(jsonb, text) to authenticated;
grant execute on function public.setting(text), public.setting_num(text, numeric) to authenticated, anon;
grant execute on function public.admin_set_setting(text, jsonb), public.admin_upsert_rate(text, text, text, numeric, boolean),
  public.admin_upsert_coupon(text, text, text, numeric, numeric, numeric, boolean, int, int, boolean, timestamptz) to authenticated;

-- ============================================================ service area + slot capacity (server-side, not bypassable)
create or replace function public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function public.slot_capacity(p_window text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(((select value from public.app_settings where key = 'slot_capacity_overrides') ->> p_window)::int,
                  public.setting_num('max_orders_per_slot', 6)::int)
$$;

-- Availability for the booking screen: one row per configured window.
create or replace function public.slot_availability(p_date date)
returns table (win text, start_hour int, end_hour int, booked int, capacity int)
language sql stable security definer set search_path = public as $$
  select (w->>0) || '-' || (w->>1), (w->>0)::int, (w->>1)::int,
         (select count(*)::int from public.orders o where o.pickup_date = p_date and o.pickup_window = (w->>0) || '-' || (w->>1) and o.status <> 'cancelled'),
         public.slot_capacity((w->>0) || '-' || (w->>1))
  from jsonb_array_elements(public.setting('slot_windows')) w
  order by 2
$$;
grant execute on function public.slot_availability(date) to authenticated, anon;

create or replace function public.orders_before()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_area jsonb; v_price jsonb; v_booked int;
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    v_area := public.setting('service_area');
    if v_area is not null and public.haversine_km((v_area->>'lat')::float8, (v_area->>'lng')::float8, new.pickup_lat, new.pickup_lng) > (v_area->>'radius_km')::float8 then
      raise exception 'Sorry, we do not pick up from this location yet';
    end if;

    v_price := public.price_order(new.items, new.coupon_code, new.customer_id);
    if v_price->>'coupon_error' is not null then raise exception '%', v_price->>'coupon_error'; end if;
    new.subtotal_amount := (v_price->>'subtotal')::numeric;
    new.discount_amount := (v_price->>'member_discount')::numeric + (v_price->>'coupon_discount')::numeric;
    new.estimated_amount := (v_price->>'total')::numeric;        -- never trust the client's number
    if new.coupon_code is not null then new.coupon_code := upper(trim(new.coupon_code)); end if;

    if new.pickup_date is not null then
      if new.pickup_date < current_date then raise exception 'Pick a pickup date that has not passed'; end if;
      if not exists (select 1 from jsonb_array_elements(public.setting('slot_windows')) w where (w->>0) || '-' || (w->>1) = new.pickup_window) then
        raise exception 'That pickup window is not available';
      end if;
      select count(*) into v_booked from public.orders o
        where o.pickup_date = new.pickup_date and o.pickup_window = new.pickup_window and o.status <> 'cancelled';
      if v_booked >= public.slot_capacity(new.pickup_window) then raise exception 'That pickup slot is full — please choose another'; end if;
    end if;
  end if;
  return new;
end $$;

-- confirm_pickup now prices with the same coupon the customer booked with.
create or replace function public.confirm_pickup(p_id uuid, p_otp text, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_final numeric; o public.orders;
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid() and status = 'captain_assigned' for update;
  if not found then raise exception 'This order is not ready for pickup'; end if;
  if not exists (select 1 from public.order_secrets where order_id = p_id and pickup_otp = trim(p_otp)) then
    raise exception 'Wrong OTP. Ask the customer for the 4-digit pickup code.';
  end if;
  v_final := ((public.price_order(p_items, o.coupon_code, o.customer_id, true))->>'total')::numeric;
  update public.orders
     set actual_items = p_items, final_amount = v_final, status = 'picked_up', picked_up_at = now(),
         payment_status = case when paid_amount >= v_final then 'paid' when paid_amount > 0 then 'partial' else 'pending' end
   where id = p_id;
  return v_final;
end $$;

-- Captain's weigh-in screen: exact bill for this order's coupon, before confirming.
create or replace function public.preview_price_for_order(p_id uuid, p_items jsonb)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid();
  if not found then raise exception 'Not your order'; end if;
  return ((public.price_order(p_items, o.coupon_code, o.customer_id, true))->>'total')::numeric;
end $$;
grant execute on function public.preview_price_for_order(uuid, jsonb) to authenticated;
