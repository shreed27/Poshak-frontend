-- 0014: the three launch services + "price on request" quotes.
--   Wash & Fold ₹59/kg · Wash, Fold & Iron ₹89/kg · Alteration & Dry Cleaning (customer requests a quote, admin replies with a price).
-- Older services are switched off (not deleted) so past orders and invoices keep working.

alter table public.service_rates add column if not exists kind text not null default 'standard';
alter table public.service_rates drop constraint if exists service_rates_kind_check;
alter table public.service_rates add constraint service_rates_kind_check check (kind in ('standard', 'quote'));
alter table public.service_rates add column if not exists price_on_request boolean not null default false;

-- A "price on request" service can never be ordered at its placeholder rate: it is always inactive in price_order's eyes.
create or replace function public.service_rates_guard()
returns trigger language plpgsql as $$
begin
  if new.price_on_request then new.active := false; end if;
  return new;
end $$;
drop trigger if exists service_rates_guard_trg on public.service_rates;
create trigger service_rates_guard_trg before insert or update on public.service_rates for each row execute function public.service_rates_guard();

insert into public.service_rates (id, name, unit, rate, active, sort, sac, price_on_request) values
  ('wash-fold',            'Wash & Fold',               'kg', 59, true, 10, '999711', false),
  ('wash-iron',            'Wash, Fold & Iron',         'kg', 89, true, 20, '999711', false),
  ('alteration-dry-clean', 'Alteration & Dry Cleaning', 'pc',  1, true, 30, '999712', true)
on conflict (id) do update set name = excluded.name, unit = excluded.unit, rate = excluded.rate, active = excluded.active,
  sort = excluded.sort, sac = excluded.sac, price_on_request = excluded.price_on_request;
update public.service_rates set active = false where kind = 'standard' and id not in ('wash-fold', 'wash-iron', 'alteration-dry-clean');

-- ============================================================ quote requests
create sequence if not exists public.quote_seq;
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  quote_no text not null unique default ('QT-' || lpad(nextval('public.quote_seq')::text, 6, '0')),
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  customer_phone text,
  description text not null check (length(description) between 10 and 1500),
  photos jsonb not null default '[]',
  pickup_address text not null,
  landmark text,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  status text not null default 'requested' check (status in ('requested', 'quoted', 'accepted', 'declined', 'cancelled')),
  quoted_amount numeric check (quoted_amount is null or quoted_amount > 0),
  admin_note text,
  quote_service_id text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  quoted_at timestamptz,
  responded_at timestamptz
);
create index if not exists quote_customer_idx on public.quote_requests (customer_id, created_at desc);
create index if not exists quote_status_idx on public.quote_requests (status, created_at desc);
alter table public.quote_requests enable row level security;
drop policy if exists "quotes read" on public.quote_requests;
create policy "quotes read" on public.quote_requests for select using (customer_id = auth.uid() or public.my_role() = 'admin');
grant select on public.quote_requests to authenticated;

-- Per-quote services (kind = 'quote') carry the agreed price; only the quoted customer and staff may see them.
drop policy if exists "rates read" on public.service_rates;
drop policy if exists "rates read quote" on public.service_rates;
create policy "rates read" on public.service_rates for select to anon, authenticated using (kind = 'standard');
create policy "rates read quote" on public.service_rates for select to authenticated using (
  public.my_role() in ('admin', 'captain', 'cleaner')
  or exists (select 1 from public.quote_requests q where q.quote_service_id = service_rates.id and q.customer_id = auth.uid()));

create or replace function public.request_quote(p_description text, p_phone text, p_address text, p_lat double precision, p_lng double precision, p_landmark text default null, p_photos jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_area jsonb := public.setting('service_area'); v_id uuid; v_name text; v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'); q public.quote_requests;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if length(trim(coalesce(p_description, ''))) < 10 then raise exception 'Tell us a little more about what you need (at least 10 characters)'; end if;
  if length(p_description) > 1500 then raise exception 'Please keep the description under 1500 characters'; end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number'; end if;
  if length(trim(coalesce(p_address, ''))) < 4 or p_lat is null or p_lng is null then raise exception 'Choose a pickup address'; end if;
  if v_area is not null and public.haversine_km((v_area->>'lat')::float8, (v_area->>'lng')::float8, p_lat, p_lng) > (v_area->>'radius_km')::float8 then
    raise exception 'Sorry, we do not pick up from this location yet';
  end if;
  if jsonb_typeof(coalesce(p_photos, '[]')) <> 'array' or jsonb_array_length(coalesce(p_photos, '[]')) > 4 then raise exception 'You can add up to 4 photos'; end if;
  if exists (select 1 from jsonb_array_elements_text(coalesce(p_photos, '[]')) x where split_part(x, '/', 1) <> auth.uid()::text) then raise exception 'Invalid photo'; end if;
  if (select count(*) from public.quote_requests where customer_id = auth.uid() and status in ('requested', 'quoted')) >= 5 then
    raise exception 'You already have 5 open quote requests. Please wait for replies or cancel one.';
  end if;
  select coalesce(name, email) into v_name from public.profiles where id = auth.uid();
  insert into public.quote_requests (customer_id, customer_name, customer_phone, description, photos, pickup_address, landmark, pickup_lat, pickup_lng)
  values (auth.uid(), v_name, v_phone, trim(p_description), coalesce(p_photos, '[]'), trim(p_address), nullif(trim(coalesce(p_landmark, '')), ''), p_lat, p_lng)
  returning * into q;
  perform public._notify_admins('quote', format('New quote request %s', q.quote_no), format('%s: %s', coalesce(v_name, 'Customer'), left(q.description, 120)), null);
  return q.id;
end $$;
grant execute on function public.request_quote(text, text, text, double precision, double precision, text, jsonb) to authenticated;

create or replace function public.admin_send_quote(p_id uuid, p_amount numeric, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare q public.quote_requests; v_svc text; v_min numeric := public.setting_num('min_charge', 0);
begin
  perform public._require_role('admin');
  select * into q from public.quote_requests where id = p_id for update;
  if not found then raise exception 'Quote request not found'; end if;
  if q.status not in ('requested', 'quoted') then raise exception 'This request is already %', q.status; end if;
  if p_amount is null or p_amount < greatest(v_min, 1) then raise exception 'The quote must be at least ₹% (the minimum order charge)', greatest(v_min, 1); end if;
  if p_amount > 100000 then raise exception 'That amount looks too high'; end if;
  v_svc := coalesce(q.quote_service_id, 'quote-' || lower(replace(q.quote_no, '-', '')));
  insert into public.service_rates (id, name, unit, rate, active, kind, sac, sort)
  values (v_svc, format('Alteration & Dry Cleaning (%s)', q.quote_no), 'pc', p_amount, true, 'quote', '999712', 900)
  on conflict (id) do update set rate = excluded.rate;
  update public.quote_requests set status = 'quoted', quoted_amount = p_amount, admin_note = nullif(trim(coalesce(p_note, '')), ''), quote_service_id = v_svc, quoted_at = now() where id = p_id;
  perform public._notify(q.customer_id, 'quote', format('Your quote is ready: ₹%s', trim(to_char(p_amount, 'FM999999990.##'))),
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Open Orders to accept it. The quote is valid for 7 days.'), null);
end $$;

create or replace function public.admin_decline_quote(p_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare q public.quote_requests;
begin
  perform public._require_role('admin');
  select * into q from public.quote_requests where id = p_id for update;
  if not found then raise exception 'Quote request not found'; end if;
  if q.status not in ('requested', 'quoted') then raise exception 'This request is already %', q.status; end if;
  update public.quote_requests set status = 'declined', admin_note = nullif(trim(coalesce(p_note, '')), ''), responded_at = now() where id = p_id;
  perform public._notify(q.customer_id, 'quote', 'We can’t take this request', coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Sorry — we are unable to quote for this one.'), null);
end $$;
grant execute on function public.admin_send_quote(uuid, numeric, text), public.admin_decline_quote(uuid, text) to authenticated;

create or replace function public.cancel_my_quote(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.quote_requests set status = 'cancelled', responded_at = now() where id = p_id and customer_id = auth.uid() and status in ('requested', 'quoted');
  if not found then raise exception 'This request can no longer be cancelled'; end if;
end $$;
grant execute on function public.cancel_my_quote(uuid) to authenticated;

-- The customer accepts (→ an order is created at exactly the quoted price) or declines.
create or replace function public.respond_quote(p_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quote_requests; p public.profiles; v_code text; v_order uuid;
begin
  select * into q from public.quote_requests where id = p_id and customer_id = auth.uid() for update;
  if not found then raise exception 'Quote not found'; end if;
  if q.status <> 'quoted' then raise exception 'This quote is no longer open'; end if;
  if not p_accept then
    update public.quote_requests set status = 'declined', responded_at = now() where id = p_id;
    perform public._notify_admins('quote', format('%s was declined', q.quote_no), format('%s declined the ₹%s quote.', coalesce(q.customer_name, 'Customer'), q.quoted_amount), null);
    return jsonb_build_object('status', 'declined');
  end if;
  if q.quoted_at < now() - interval '7 days' then raise exception 'This quote has expired. Please request a new one.'; end if;
  select * into p from public.profiles where id = auth.uid();
  v_code := 'PSK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.orders (order_code, customer_id, customer_name, customer_email, customer_phone, service_name, items, special_instructions,
                             pickup_slot, pickup_address, landmark, pickup_lat, pickup_lng, payment_mode)
  values (v_code, auth.uid(), coalesce(p.name, q.customer_name), p.email, q.customer_phone, format('Alteration & Dry Cleaning (%s)', q.quote_no),
          jsonb_build_array(jsonb_build_object('service_id', q.quote_service_id, 'qty', 1)), left(format('Quote %s: %s', q.quote_no, q.description), 500),
          'As soon as possible', q.pickup_address, q.landmark, q.pickup_lat, q.pickup_lng, 'cod')
  returning id into v_order;
  update public.quote_requests set status = 'accepted', order_id = v_order, responded_at = now() where id = p_id;
  perform public._notify_admins('quote', format('%s accepted — order %s', q.quote_no, v_code), format('₹%s · %s', q.quoted_amount, coalesce(q.customer_name, 'Customer')), v_order);
  return jsonb_build_object('status', 'accepted', 'order_id', v_order, 'order_code', v_code);
end $$;
grant execute on function public.respond_quote(uuid, boolean) to authenticated;

-- Reference photos (private): each customer's files live in a folder named after their user id.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('quote-photos', 'quote-photos', false) on conflict (id) do nothing;
    execute 'drop policy if exists "quote photos insert" on storage.objects';
    execute $p$create policy "quote photos insert" on storage.objects for insert to authenticated with check (
      bucket_id = 'quote-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute 'drop policy if exists "quote photos read" on storage.objects';
    execute $p$create policy "quote photos read" on storage.objects for select to authenticated using (
      bucket_id = 'quote-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() = 'admin'))$p$;
  end if;
end $$;

do $$ begin alter publication supabase_realtime add table public.quote_requests; exception when others then null; end $$;
