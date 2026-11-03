-- 0008: referrals, prepaid wallet packs ("plans"), captain rating and tips.

insert into public.app_settings (key, value) values
  ('referral_bonus', '100'),          -- ₹ credited to BOTH people after the friend's first delivered order
  ('referral_min_order', '199')
on conflict (key) do nothing;

-- ============================================================ referrals
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references auth.users(id);
alter table public.profiles add column if not exists referral_rewarded_at timestamptz;

create or replace function public._new_referral_code()
returns text language plpgsql as $$
declare v text; begin
  loop
    v := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
    exit when not exists (select 1 from public.profiles where referral_code = v);
  end loop;
  return v;
end $$;

create or replace function public.profiles_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then new.referral_code := public._new_referral_code(); end if;
  return new;
end $$;
drop trigger if exists profiles_referral_code_trg on public.profiles;
create trigger profiles_referral_code_trg before insert on public.profiles for each row execute function public.profiles_referral_code();
update public.profiles set referral_code = public._new_referral_code() where referral_code is null;

create or replace function public.apply_referral(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.profiles; me public.profiles;
begin
  if auth.uid() is null then raise exception 'Not allowed'; end if;
  select * into me from public.profiles where id = auth.uid();
  if me.referred_by is not null then raise exception 'You have already used a referral code'; end if;
  if exists (select 1 from public.orders where customer_id = auth.uid() and status <> 'cancelled') then raise exception 'Referral codes are for new customers (before your first order)'; end if;
  select * into r from public.profiles where referral_code = upper(trim(p_code));
  if not found then raise exception 'That referral code is not valid'; end if;
  if r.id = auth.uid() then raise exception 'You cannot use your own code'; end if;
  update public.profiles set referred_by = r.id where id = auth.uid();
end $$;

create or replace function public.my_referral()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', p.referral_code, 'referred_by', p.referred_by is not null, 'bonus', public.setting_num('referral_bonus', 100),
    'friends', (select count(*) from public.profiles x where x.referred_by = p.id),
    'rewarded', (select count(*) from public.profiles x where x.referred_by = p.id and x.referral_rewarded_at is not null))
  from public.profiles p where p.id = auth.uid()
$$;
grant execute on function public.apply_referral(text), public.my_referral() to authenticated;

create or replace function public.orders_referral()
returns trigger language plpgsql security definer set search_path = public as $$
declare me public.profiles; v_bonus numeric := public.setting_num('referral_bonus', 100);
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    select * into me from public.profiles where id = new.customer_id for update;
    if me.referred_by is not null and me.referral_rewarded_at is null and v_bonus > 0
       and coalesce(new.final_amount, new.estimated_amount) >= public.setting_num('referral_min_order', 199) then
      perform public._wallet_credit(me.id, v_bonus, 'referral', new.id, 'Welcome bonus for joining with a friend’s code');
      perform public._wallet_credit(me.referred_by, v_bonus, 'referral', new.id, 'Your friend completed their first order');
      update public.profiles set referral_rewarded_at = now() where id = me.id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_referral_trg on public.orders;
create trigger orders_referral_trg after update of status on public.orders for each row execute function public.orders_referral();

-- ============================================================ plans (prepaid wallet packs)
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price numeric not null check (price > 0),
  credit numeric not null check (credit >= price),
  description text,
  active boolean not null default true,
  sort int not null default 100
);
alter table public.plans enable row level security;
drop policy if exists "plans read" on public.plans;
create policy "plans read" on public.plans for select using (active or public.my_role() = 'admin');
grant select on public.plans to anon, authenticated;
insert into public.plans (id, name, price, credit, description, sort) values
  ('starter', 'Starter pack', 500, 550, 'Pay ₹500, get ₹550 to spend', 10),
  ('regular', 'Regular pack', 1000, 1150, 'Pay ₹1,000, get ₹1,150 to spend', 20),
  ('family',  'Family pack', 2000, 2400, 'Pay ₹2,000, get ₹2,400 to spend', 30)
on conflict (id) do nothing;

create or replace function public.admin_upsert_plan(p_id text, p_name text, p_price numeric, p_credit numeric, p_description text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_id !~ '^[a-z0-9-]{2,30}$' then raise exception 'Plan id: lowercase letters, numbers, dashes'; end if;
  if p_credit < p_price then raise exception 'Credit must be at least the price'; end if;
  insert into public.plans (id, name, price, credit, description, active) values (p_id, p_name, p_price, p_credit, p_description, coalesce(p_active, true))
  on conflict (id) do update set name = excluded.name, price = excluded.price, credit = excluded.credit, description = excluded.description, active = excluded.active;
end $$;
grant execute on function public.admin_upsert_plan(text, text, numeric, numeric, text, boolean) to authenticated;

-- ============================================================ payment intents (plan purchase / tip) — server side only
create table if not exists public.pay_intents (
  razorpay_order_id text primary key,
  kind text not null check (kind in ('plan', 'tip')),
  user_id uuid not null references auth.users(id) on delete cascade,
  ref text not null,                     -- plan id or order id
  amount_paise int not null,
  created_at timestamptz not null default now()
);
alter table public.pay_intents enable row level security;          -- service role only

create table if not exists public.plan_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  amount numeric not null,
  credit numeric not null,
  razorpay_payment_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.plan_purchases enable row level security;
drop policy if exists "purchases own" on public.plan_purchases;
create policy "purchases own" on public.plan_purchases for select using (user_id = auth.uid() or public.my_role() = 'admin');
grant select on public.plan_purchases to authenticated;

alter table public.orders add column if not exists captain_rating int check (captain_rating between 1 and 5);
alter table public.orders add column if not exists captain_feedback text;

create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  captain_id uuid references auth.users(id),
  customer_id uuid not null references auth.users(id),
  amount numeric not null check (amount > 0),
  razorpay_payment_id text not null unique,
  paid_out boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.tips enable row level security;
drop policy if exists "tips read" on public.tips;
create policy "tips read" on public.tips for select using (customer_id = auth.uid() or captain_id = auth.uid() or public.my_role() = 'admin');
grant select on public.tips to authenticated;

-- One entry point for the edge functions. Idempotent on the Razorpay payment id.
create or replace function public.apply_intent_payment(p_rzp_order text, p_payment text, p_amount_paise int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare i public.pay_intents; pl public.plans; o public.orders;
begin
  select * into i from public.pay_intents where razorpay_order_id = p_rzp_order;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown intent'); end if;
  if p_amount_paise < i.amount_paise then return jsonb_build_object('ok', false, 'reason', 'amount mismatch'); end if;

  if i.kind = 'plan' then
    select * into pl from public.plans where id = i.ref;
    if not found then return jsonb_build_object('ok', false, 'reason', 'plan missing'); end if;
    insert into public.plan_purchases (user_id, plan_id, amount, credit, razorpay_payment_id) values (i.user_id, pl.id, pl.price, pl.credit, p_payment) on conflict (razorpay_payment_id) do nothing;
    if not found then return jsonb_build_object('ok', true, 'duplicate', true, 'kind', 'plan'); end if;
    perform public._wallet_credit(i.user_id, pl.credit, 'plan', null, format('%s purchased', pl.name));
    return jsonb_build_object('ok', true, 'kind', 'plan', 'credit', pl.credit);
  else
    select * into o from public.orders where id = i.ref::uuid and customer_id = i.user_id and status = 'delivered';
    if not found then return jsonb_build_object('ok', false, 'reason', 'order not delivered'); end if;
    insert into public.tips (order_id, captain_id, customer_id, amount, razorpay_payment_id) values (o.id, o.captain_id, i.user_id, p_amount_paise / 100.0, p_payment) on conflict (razorpay_payment_id) do nothing;
    if not found then return jsonb_build_object('ok', true, 'duplicate', true, 'kind', 'tip'); end if;
    perform public._notify(o.captain_id, 'tip', format('You received a ₹%s tip', p_amount_paise / 100), format('From order %s. Thank you for the great service!', o.order_code), o.id);
    return jsonb_build_object('ok', true, 'kind', 'tip');
  end if;
end $$;
revoke execute on function public.apply_intent_payment(text, text, int) from public, anon, authenticated;
grant execute on function public.apply_intent_payment(text, text, int) to service_role;

-- ============================================================ rating the captain
create or replace function public.rate_captain(p_id uuid, p_rating int, p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set captain_rating = p_rating, captain_feedback = nullif(trim(p_feedback), '')
  where id = p_id and customer_id = auth.uid() and status = 'delivered' and captain_rating is null and captain_id is not null;
  if not found then raise exception 'You can rate the captain once, after delivery'; end if;
  if p_rating <= 2 then perform public._alert('low_rating', p_id, format('Captain %s got %s★ on order %s%s', (select captain_name from public.orders where id = p_id), p_rating, (select order_code from public.orders where id = p_id), coalesce(' — ' || nullif(trim(p_feedback), ''), '')), 'warn'); end if;
end $$;
grant execute on function public.rate_captain(uuid, int, text) to authenticated;

-- allowlist: new numeric settings
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_key not in (select jsonb_array_elements_text('["min_charge","member_discount_pct","slot_windows","max_orders_per_slot","slot_capacity_overrides","service_area","support","require_photos","require_cleaner_step","business","captain_fee_per_order","referral_bonus","referral_min_order","offer_timeout_min","auto_assign","max_reschedules","claim_credit_multiple","claims_policy","require_job_accept","captain_fee_tiers"]'::jsonb)) then
    raise exception 'Unknown setting %', p_key;
  end if;
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
