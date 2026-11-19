-- 0013: platform hardening & extras — client error log, partner documents, customer share-tracking links,
-- "10 minutes away" notification, nightly admin summary, payment reconciliation runs.

-- ============================================================ client error log (our own lightweight error monitoring)
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  fingerprint text not null unique,
  message text not null,
  stack text,
  url text,
  role text,
  user_id uuid,
  user_agent text,
  context jsonb,
  count int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists client_errors_seen_idx on public.client_errors (last_seen desc);
alter table public.client_errors enable row level security;
drop policy if exists "client errors admin" on public.client_errors;
create policy "client errors admin" on public.client_errors for select using (public.my_role() = 'admin');
grant select on public.client_errors to authenticated;

-- Anyone's browser may report an error (even signed out). Deduplicated by fingerprint and globally rate limited so it cannot be abused.
create or replace function public.log_client_error(p_message text, p_stack text default null, p_url text default null, p_context jsonb default null, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_fp text; v_msg text := left(coalesce(p_message, 'Unknown error'), 500);
begin
  if (select count(*) from public.client_errors where last_seen > now() - interval '1 minute') > 300 then return; end if;
  v_fp := md5(left(v_msg, 200) || coalesce(split_part(coalesce(p_stack, ''), E'\n', 2), ''));
  insert into public.client_errors (fingerprint, message, stack, url, role, user_id, user_agent, context)
  values (v_fp, v_msg, left(p_stack, 4000), left(p_url, 300), public.my_role(), auth.uid(), left(p_user_agent, 300), p_context)
  on conflict (fingerprint) do update set count = public.client_errors.count + 1, last_seen = now(), resolved_at = null;
end $$;
grant execute on function public.log_client_error(text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.admin_resolve_error(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  update public.client_errors set resolved_at = now() where id = p_id;
end $$;
grant execute on function public.admin_resolve_error(bigint) to authenticated;

-- ============================================================ partner documents (licence, ID, insurance … photos in a private bucket)
create table if not exists public.partner_docs (
  id bigint generated always as identity primary key,
  email text not null,                                   -- staff email (folder name in the bucket)
  kind text not null check (kind in ('licence', 'id_proof', 'insurance', 'vehicle_rc', 'trade_licence', 'photo', 'agreement', 'other')),
  path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  note text,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists partner_docs_email_idx on public.partner_docs (lower(email));
alter table public.partner_docs enable row level security;
drop policy if exists "partner docs read" on public.partner_docs;
create policy "partner docs read" on public.partner_docs for select using (
  public.my_role() = 'admin' or lower(email) = lower((select p.email from public.profiles p where p.id = auth.uid())));
grant select on public.partner_docs to authenticated;

-- A partner registers a file they just uploaded to their own folder; the admin can do it on anyone's behalf.
create or replace function public.register_partner_doc(p_email text, p_kind text, p_path text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_me text; v_email text := lower(trim(p_email)); v_id bigint;
begin
  select lower(email) into v_me from public.profiles where id = auth.uid();
  if public.my_role() <> 'admin' and (v_me is null or v_me <> v_email or public.my_role() not in ('captain', 'cleaner')) then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.staff_emails where lower(email) = v_email) then raise exception 'Not on the team'; end if;
  if split_part(p_path, '/', 1) <> v_email then raise exception 'Upload into your own folder'; end if;
  insert into public.partner_docs (email, kind, path, uploaded_by, status) values (v_email, p_kind, p_path, auth.uid(), case when public.my_role() = 'admin' then 'verified' else 'pending' end)
  returning id into v_id;
  if public.my_role() <> 'admin' then perform public._notify_admins('partner_doc', 'New document to review', format('%s uploaded a %s', v_email, replace(p_kind, '_', ' ')), null); end if;
  return v_id;
end $$;
grant execute on function public.register_partner_doc(text, text, text) to authenticated;

create or replace function public.admin_review_doc(p_id bigint, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_status not in ('pending', 'verified', 'rejected') then raise exception 'Unknown status'; end if;
  update public.partner_docs set status = p_status, note = p_note, reviewed_at = now() where id = p_id;
end $$;
create or replace function public.admin_delete_doc(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  delete from public.partner_docs where id = p_id;
end $$;
grant execute on function public.admin_review_doc(bigint, text, text), public.admin_delete_doc(bigint) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('partner-docs', 'partner-docs', false) on conflict (id) do nothing;
    execute 'drop policy if exists "partner docs insert" on storage.objects';
    execute $p$create policy "partner docs insert" on storage.objects for insert to authenticated with check (
      bucket_id = 'partner-docs' and (public.my_role() = 'admin'
        or ((storage.foldername(name))[1] = lower((select p.email from public.profiles p where p.id = auth.uid())) and public.my_role() in ('captain', 'cleaner'))))$p$;
    execute 'drop policy if exists "partner docs read" on storage.objects';
    execute $p$create policy "partner docs read" on storage.objects for select to authenticated using (
      bucket_id = 'partner-docs' and (public.my_role() = 'admin'
        or (storage.foldername(name))[1] = lower((select p.email from public.profiles p where p.id = auth.uid()))))$p$;
  end if;
end $$;

-- ============================================================ customer share-tracking link (opt-in, no personal data)
alter table public.orders add column if not exists share_token text unique;
alter table public.orders add column if not exists eta10_notified_for text;

create or replace function public.create_share_link(p_order uuid)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders; v_tok text;
begin
  select * into o from public.orders where id = p_order and customer_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if o.status in ('delivered', 'cancelled') then raise exception 'This order is finished'; end if;
  v_tok := coalesce(o.share_token, replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.orders set share_token = v_tok where id = p_order;
  return v_tok;
end $$;
create or replace function public.revoke_share_link(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set share_token = null where id = p_order and customer_id = auth.uid();
end $$;
grant execute on function public.create_share_link(uuid), public.revoke_share_link(uuid) to authenticated;

-- What a friend with the link sees: status, ETA, the rider's first name and position, and the destination rounded to ~100 m. Nothing else.
create or replace function public.public_track(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o public.orders;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into o from public.orders where share_token = p_token;
  if not found then return null; end if;
  if o.status in ('delivered', 'cancelled') and o.updated_at < now() - interval '2 hours' then return jsonb_build_object('status', o.status, 'ended', true); end if;
  return jsonb_build_object(
    'status', o.status, 'ended', o.status in ('delivered', 'cancelled'),
    'assignment', o.assignment,
    'rider', case when o.captain_id is null then null else jsonb_build_object('first_name', split_part(coalesce(o.captain_name, 'Captain'), ' ', 1), 'lat', o.captain_lat, 'lng', o.captain_lng, 'updated_at', o.captain_updated_at) end,
    'eta', case when o.eta_minutes is null then null else jsonb_build_object('minutes', o.eta_minutes, 'km', o.eta_km, 'leg', o.eta_leg, 'updated_at', o.eta_updated_at) end,
    'dest', jsonb_build_object('lat', round(o.pickup_lat::numeric, 3), 'lng', round(o.pickup_lng::numeric, 3)));
end $$;
grant execute on function public.public_track(text) to anon, authenticated;

-- "About 10 minutes away" heads-up, once per leg (in addition to the "almost at your door" ping from 0012).
create or replace function public.orders_reset_eta()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status or new.captain_id is distinct from old.captain_id then
    new.eta_minutes := null; new.eta_km := null; new.eta_leg := null; new.eta_updated_at := null; new.late_alerted_at := null;
    if new.captain_id is distinct from old.captain_id then new.near_notified_for := null; new.eta10_notified_for := null; new.captain_heading := null; end if;
  end if;
  return new;
end $$;

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
    if o.status = 'captain_assigned' and o.assignment <> 'accepted' then continue; end if;

    v_leg := case when o.status = 'out_for_delivery' then 'delivery' else 'pickup' end;
    v_near := public.haversine_km(p_lat, p_lng, o.pickup_lat, o.pickup_lng) <= 0.35;
    if p_order = o.id and p_eta_min is not null and p_km is not null and p_eta_min between 0 and 240 and p_km between 0 and 100 then
      v_min := greatest(1, p_eta_min); v_km := p_km;
    else
      v_km := public.haversine_km(p_lat, p_lng, o.pickup_lat, o.pickup_lng) * 1.35;
      v_min := greatest(1, ceil(v_km / 25 * 60 * v_factor + v_buf));
    end if;
    update public.orders set eta_minutes = v_min, eta_km = round(v_km, 2), eta_leg = v_leg, eta_updated_at = now() where id = o.id;

    if v_near and o.near_notified_for is distinct from o.status then
      update public.orders set near_notified_for = o.status where id = o.id;
      perform public._notify(o.customer_id, 'tracking',
        case when v_leg = 'pickup' then format('%s is almost at your door', v_name) else format('%s is almost at your door with your clothes', v_name) end,
        case when v_leg = 'pickup' then 'Keep your pickup OTP ready — share it only when the captain is with you.' else 'Keep your delivery OTP ready — share it only after you have your clothes.' end, o.id);
    elsif not v_near and v_min <= 10 and o.eta10_notified_for is distinct from o.status then
      update public.orders set eta10_notified_for = o.status where id = o.id;
      perform public._notify(o.customer_id, 'tracking', format('%s is about %s min away', v_name, v_min),
        case when v_leg = 'pickup' then 'Please be ready with your clothes.' else 'Please be home to receive your clothes.' end, o.id);
    end if;

    v_end := public._slot_end(case when v_leg = 'pickup' then o.pickup_date else o.delivery_date end, case when v_leg = 'pickup' then o.pickup_window else o.delivery_window end);
    if v_end is not null and o.late_alerted_at is null and now() + make_interval(mins => v_min) > v_end + interval '15 minutes' then
      update public.orders set late_alerted_at = now() where id = o.id;
      perform public._alert('late_rider', o.id, format('Order %s: %s will reach the customer around %s — after the promised slot', o.order_code, v_name,
        to_char((now() + make_interval(mins => v_min)) at time zone 'Asia/Kolkata', 'HH12:MI AM')), 'warn');
    end if;
  end loop;
end $$;

-- ============================================================ nightly admin summary (yesterday, IST) — a push/in-app note at 8 AM
create or replace function public.build_daily_summary(p_day date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_day date := coalesce(p_day, ((now() at time zone 'Asia/Kolkata')::date - 1));
  v_from timestamptz := v_day::timestamp at time zone 'Asia/Kolkata'; v_to timestamptz := (v_day + 1)::timestamp at time zone 'Asia/Kolkata';
begin
  return jsonb_build_object('day', v_day,
    'orders', (select count(*) from public.orders where created_at >= v_from and created_at < v_to),
    'delivered', (select count(*) from public.orders where delivered_at >= v_from and delivered_at < v_to),
    'cancelled', (select count(*) from public.orders where status = 'cancelled' and updated_at >= v_from and updated_at < v_to),
    'revenue', (select coalesce(sum(final_amount), 0) from public.orders where status = 'delivered' and delivered_at >= v_from and delivered_at < v_to),
    'collected', (select coalesce(sum(amount), 0) from public.payments where created_at >= v_from and created_at < v_to),
    'new_customers', (select count(*) from public.profiles where role = 'customer' and created_at >= v_from and created_at < v_to),
    'open_complaints', (select count(*) from public.tickets where status in ('open', 'in_review')),
    'stuck_orders', (select count(*) from public.orders where status = 'placed' and created_at < now() - interval '30 minutes'));
end $$;

create or replace function public.send_daily_summary()
returns jsonb language plpgsql security definer set search_path = public as $$
declare s jsonb := public.build_daily_summary();
begin
  perform public._notify_admins('summary', format('Poshak yesterday: ₹%s from %s deliveries', s->>'revenue', s->>'delivered'),
    format('%s orders placed · %s cancelled · ₹%s collected · %s new customers · %s open complaints%s', s->>'orders', s->>'cancelled', s->>'collected', s->>'new_customers', s->>'open_complaints',
           case when (s->>'stuck_orders')::int > 0 then format(' · %s orders waiting for a rider', s->>'stuck_orders') else '' end), null);
  return s;
end $$;
revoke execute on function public.send_daily_summary() from public, anon, authenticated;
create or replace function public.admin_send_daily_summary()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  return public.send_daily_summary();
end $$;
grant execute on function public.admin_send_daily_summary() to authenticated;

-- Schedule it at 08:00 IST (02:30 UTC) when the pg_cron extension is on (Supabase: Database → Extensions → pg_cron).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'poshak-daily-summary';
    perform cron.schedule('poshak-daily-summary', '30 2 * * *', 'select public.send_daily_summary()');
  end if;
exception when others then null;
end $$;

-- ============================================================ payment reconciliation runs (written by the reconcile-payments edge function)
create table if not exists public.reconciliation_runs (
  id bigint generated always as identity primary key,
  from_ts timestamptz not null,
  to_ts timestamptz not null,
  gateway_count int not null,
  gateway_total numeric not null,
  db_count int not null,
  db_total numeric not null,
  missing_in_db jsonb not null default '[]',          -- Razorpay captured it, we have no record
  missing_at_gateway jsonb not null default '[]',     -- we recorded it, Razorpay doesn't list it
  amount_mismatch jsonb not null default '[]',
  ok boolean not null,
  run_by uuid,
  created_at timestamptz not null default now()
);
alter table public.reconciliation_runs enable row level security;
drop policy if exists "recon admin" on public.reconciliation_runs;
create policy "recon admin" on public.reconciliation_runs for select using (public.my_role() = 'admin');
grant select on public.reconciliation_runs to authenticated;

-- Compare a list of gateway payments [{id, amount (₹), status}] with what we recorded. Server-only.
create or replace function public.record_reconciliation(p_from timestamptz, p_to timestamptz, p_gateway jsonb, p_by uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare g jsonb; d jsonb; v_missing jsonb; v_extra jsonb; v_diff jsonb; v_id bigint; v_gc int; v_gt numeric; v_dc int; v_dt numeric;
begin
  g := (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'amount', (x->>'amount')::numeric)), '[]')
          from jsonb_array_elements(coalesce(p_gateway, '[]')) x where coalesce(x->>'status', 'captured') = 'captured');
  d := (select coalesce(jsonb_agg(jsonb_build_object('id', k.razorpay_payment_id, 'amount', k.amount, 'ref', k.ref, 'source', k.source)), '[]') from public.reconcile_known_payments(p_from, p_to) k);
  select count(*), coalesce(sum((x->>'amount')::numeric), 0) into v_gc, v_gt from jsonb_array_elements(g) x;
  select count(*), coalesce(sum((x->>'amount')::numeric), 0) into v_dc, v_dt from jsonb_array_elements(d) x;
  v_missing := (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements(g) x where not exists (select 1 from jsonb_array_elements(d) y where y->>'id' = x->>'id'));
  v_extra := (select coalesce(jsonb_agg(y), '[]') from jsonb_array_elements(d) y where not exists (select 1 from jsonb_array_elements(g) x where x->>'id' = y->>'id'));
  v_diff := (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'gateway', (x->>'amount')::numeric, 'ours', (y->>'amount')::numeric)), '[]')
               from jsonb_array_elements(g) x join jsonb_array_elements(d) y on y->>'id' = x->>'id' where (x->>'amount')::numeric <> (y->>'amount')::numeric);
  insert into public.reconciliation_runs (from_ts, to_ts, gateway_count, gateway_total, db_count, db_total, missing_in_db, missing_at_gateway, amount_mismatch, ok, run_by)
  values (p_from, p_to, v_gc, v_gt, v_dc, v_dt, v_missing, v_extra, v_diff, jsonb_array_length(v_missing) = 0 and jsonb_array_length(v_extra) = 0 and jsonb_array_length(v_diff) = 0, p_by)
  returning id into v_id;
  if jsonb_array_length(v_missing) > 0 or jsonb_array_length(v_diff) > 0 then
    perform public._alert('reconciliation', null, format('Reconciliation: %s payments at Razorpay are missing in our records, %s amounts differ — open Finance → Reconciliation', jsonb_array_length(v_missing), jsonb_array_length(v_diff)), 'urgent');
  end if;
  return v_id;
end $$;
revoke execute on function public.record_reconciliation(timestamptz, timestamptz, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.record_reconciliation(timestamptz, timestamptz, jsonb, uuid) to service_role;

-- ============================================================ let admins see when Razorpay last called us (health check)
drop policy if exists "webhook admin" on public.webhook_events;
create policy "webhook admin" on public.webhook_events for select using (public.my_role() = 'admin');
grant select on public.webhook_events to authenticated;

-- ============================================================ phone-number sign-ups keep their mobile number on the profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, picture, role, phone, vehicle)
  select
    new.id, new.email,
    coalesce(st.name, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(st.role, 'customer'),
    coalesce(st.phone, nullif(right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10), '')),
    st.vehicle
  from (select 1) _ left join public.staff_emails st on lower(st.email) = lower(new.email)
  on conflict (id) do nothing;
  return new;
end $$;
