-- 0003: garment checklist + photos, laundry-partner ("cleaner") role, cleaning/ready statuses, mismatch alerts.

-- ============================================================ roles & statuses
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'captain', 'admin', 'cleaner'));
alter table public.staff_emails drop constraint if exists staff_emails_role_check;
alter table public.staff_emails add constraint staff_emails_role_check check (role in ('admin', 'captain', 'cleaner'));
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('placed','captain_assigned','picked_up','cleaning','ready','out_for_delivery','delivered','cancelled'));

create or replace function public._require_any(p_roles text[])
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not (public.my_role() = any (p_roles)) then raise exception 'Not allowed'; end if;
end $$;

create or replace function public.admin_add_staff(p_email text, p_role text, p_name text default null, p_phone text default null, p_vehicle text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_phone text := nullif(regexp_replace(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '^(91|0)([0-9]{10})$', '\2'), '');
begin
  perform public._require_role('admin');
  if p_role not in ('admin', 'captain', 'cleaner') then raise exception 'Role must be admin, captain or cleaner'; end if;
  if v_email is null or position('@' in v_email) = 0 then raise exception 'Enter a valid email'; end if;
  if v_phone is not null and v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Phone must be a 10-digit Indian mobile number'; end if;
  if p_role in ('captain', 'cleaner') and (nullif(trim(coalesce(p_name, '')), '') is null or v_phone is null) then
    raise exception 'Delivery partners and laundry partners need a name and phone number';
  end if;
  insert into public.staff_emails (email, role, name, phone, vehicle)
  values (v_email, p_role, nullif(trim(p_name), ''), v_phone, nullif(trim(p_vehicle), ''))
  on conflict (email) do update set role = excluded.role, name = excluded.name, phone = excluded.phone, vehicle = excluded.vehicle;
  update public.profiles
     set role = p_role, name = coalesce(nullif(trim(p_name), ''), name), phone = coalesce(v_phone, phone), vehicle = coalesce(nullif(trim(p_vehicle), ''), vehicle)
   where lower(email) = v_email;
end $$;

-- ============================================================ settings
insert into public.app_settings (key, value) values
  ('require_photos', 'true'),            -- pickup & delivery need photos + piece count
  ('require_cleaner_step', 'false')      -- true: delivery can only start once the laundry marks the order "ready"
on conflict (key) do nothing;
create or replace function public.setting_bool(p_key text, p_default boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_settings where key = p_key), p_default)
$$;
grant execute on function public.setting_bool(text, boolean) to authenticated, anon;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_key not in (select jsonb_array_elements_text('["min_charge","member_discount_pct","slot_windows","max_orders_per_slot","slot_capacity_overrides","service_area","support","require_photos","require_cleaner_step","business","captain_fee_per_order","referral_bonus","offer_timeout_min","auto_assign","max_reschedules","claim_credit_multiple"]'::jsonb)) then
    raise exception 'Unknown setting %', p_key;
  end if;
  if p_key = 'member_discount_pct' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 90) then raise exception 'Discount must be 0–90 percent'; end if;
  if p_key = 'min_charge' and (p_value #>> '{}')::numeric < 0 then raise exception 'Minimum charge cannot be negative'; end if;
  if p_key = 'max_orders_per_slot' and (p_value #>> '{}')::numeric < 1 then raise exception 'Capacity must be at least 1'; end if;
  if p_key = 'service_area' and (
       (p_value->>'radius_km')::numeric <= 0 or (p_value->>'lat')::numeric not between -90 and 90 or (p_value->>'lng')::numeric not between -180 and 180
     ) then raise exception 'Invalid service area'; end if;
  if p_key in ('require_photos', 'require_cleaner_step', 'auto_assign') and jsonb_typeof(p_value) <> 'boolean' then raise exception '% must be true or false', p_key; end if;
  insert into public.app_settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

-- ============================================================ ops alerts (mismatches, SOS, no-shows, …)
create table if not exists public.ops_alerts (
  id bigint generated always as identity primary key,
  kind text not null,                -- count_mismatch | sos | no_show | claim | …
  severity text not null default 'warn' check (severity in ('info', 'warn', 'urgent')),
  order_id uuid references public.orders(id) on delete cascade,
  message text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
alter table public.ops_alerts enable row level security;
drop policy if exists "alerts admin" on public.ops_alerts;
create policy "alerts admin" on public.ops_alerts for select using (public.my_role() = 'admin');
grant select on public.ops_alerts to authenticated;

create or replace function public._alert(p_kind text, p_order uuid, p_msg text, p_sev text default 'warn')
returns void language sql security definer set search_path = public as $$
  insert into public.ops_alerts (kind, severity, order_id, message, created_by) values (p_kind, p_sev, p_order, p_msg, auth.uid())
$$;
revoke execute on function public._alert(text, uuid, text, text) from public, anon, authenticated;

create or replace function public.admin_resolve_alert(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  update public.ops_alerts set resolved_at = now(), resolved_by = auth.uid() where id = p_id and resolved_at is null;
end $$;
grant execute on function public.admin_resolve_alert(bigint) to authenticated;

-- ============================================================ garment checks
create table if not exists public.order_checks (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  stage text not null check (stage in ('pickup', 'cleaner_in', 'cleaner_out', 'delivery')),
  piece_count int,
  checklist jsonb not null default '[]',     -- [{ "type": "Shirts", "count": 4, "note": "stain on collar" }]
  notes text,
  photos jsonb not null default '[]',        -- storage paths in bucket order-photos
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (order_id, stage)
);
alter table public.order_checks enable row level security;
drop policy if exists "checks read" on public.order_checks;
create policy "checks read" on public.order_checks for select using (
  public.my_role() = 'admin'
  or exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or o.captain_id = auth.uid()))
);
grant select on public.order_checks to authenticated;

alter table public.orders add column if not exists pieces_picked_up int;

-- Photos must live under the order's own folder (no pointing at someone else's pictures).
create or replace function public._valid_photos(p_order uuid, p_photos jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(coalesce(p_photos, '[]'::jsonb)) = 'array'
     and jsonb_array_length(coalesce(p_photos, '[]'::jsonb)) <= 8
     and not exists (select 1 from jsonb_array_elements_text(coalesce(p_photos, '[]'::jsonb)) x where x not like p_order::text || '/%' or x like '%..%')
$$;

drop function if exists public.confirm_pickup(uuid, text, jsonb);
create or replace function public.confirm_pickup(
  p_id uuid, p_otp text, p_items jsonb,
  p_pieces int default null, p_checklist jsonb default '[]', p_notes text default null, p_photos jsonb default '[]')
returns numeric language plpgsql security definer set search_path = public as $$
declare v_final numeric; o public.orders; v_need boolean := public.setting_bool('require_photos', true);
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid() and status = 'captain_assigned' for update;
  if not found then raise exception 'This order is not ready for pickup'; end if;
  if not exists (select 1 from public.order_secrets where order_id = p_id and pickup_otp = trim(p_otp)) then
    raise exception 'Wrong OTP. Ask the customer for the 4-digit pickup code.';
  end if;
  if not public._valid_photos(p_id, p_photos) then raise exception 'Invalid photos'; end if;
  if v_need and (coalesce(p_pieces, 0) < 1 or jsonb_array_length(coalesce(p_photos, '[]')) < 1) then
    raise exception 'Count the garments and add at least one photo of the clothes';
  end if;
  v_final := ((public.price_order(p_items, o.coupon_code, o.customer_id, true))->>'total')::numeric;
  update public.orders
     set actual_items = p_items, final_amount = v_final, status = 'picked_up', picked_up_at = now(), pieces_picked_up = p_pieces,
         payment_status = case when paid_amount >= v_final then 'paid' when paid_amount > 0 then 'partial' else 'pending' end
   where id = p_id;
  insert into public.order_checks (order_id, stage, piece_count, checklist, notes, photos, created_by)
  values (p_id, 'pickup', p_pieces, coalesce(p_checklist, '[]'), p_notes, coalesce(p_photos, '[]'), auth.uid());
  return v_final;
end $$;

-- ============================================================ laundry partner (cleaner) actions — no access to customer data
create or replace function public.cleaner_queue()
returns table (id uuid, order_code text, status text, service_name text, actual_items jsonb, special_instructions text,
               pieces_picked_up int, pieces_received int, picked_up_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_any(array['cleaner', 'admin']);
  return query
    select o.id, o.order_code, o.status, o.service_name, o.actual_items, o.special_instructions, o.pieces_picked_up,
           (select c.piece_count from public.order_checks c where c.order_id = o.id and c.stage = 'cleaner_in'), o.picked_up_at
    from public.orders o where o.status in ('picked_up', 'cleaning', 'ready') order by o.picked_up_at;
end $$;

create or replace function public.cleaner_receive(p_id uuid, p_pieces int, p_notes text default null, p_photos jsonb default '[]')
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_any(array['cleaner', 'admin']);
  select * into o from public.orders where id = p_id and status = 'picked_up' for update;
  if not found then raise exception 'Order is not waiting to be received'; end if;
  if coalesce(p_pieces, 0) < 1 then raise exception 'Count the garments you received'; end if;
  if not public._valid_photos(p_id, p_photos) then raise exception 'Invalid photos'; end if;
  insert into public.order_checks (order_id, stage, piece_count, notes, photos, created_by) values (p_id, 'cleaner_in', p_pieces, p_notes, coalesce(p_photos, '[]'), auth.uid());
  update public.orders set status = 'cleaning' where id = p_id;
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
  if coalesce(p_pieces, 0) < 1 then raise exception 'Count the finished garments'; end if;
  insert into public.order_checks (order_id, stage, piece_count, notes, created_by) values (p_id, 'cleaner_out', p_pieces, p_notes, auth.uid());
  update public.orders set status = 'ready' where id = p_id;
  if o.pieces_picked_up is not null and o.pieces_picked_up <> p_pieces then
    perform public._alert('count_mismatch', p_id, format('Order %s: %s pieces came in but %s are ready — check before delivery', o.order_code, o.pieces_picked_up, p_pieces), 'urgent');
  end if;
end $$;

-- ============================================================ delivery
create or replace function public.start_delivery(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_strict boolean := public.setting_bool('require_cleaner_step', false);
begin
  perform public._require_role('captain');
  update public.orders set status = 'out_for_delivery'
  where id = p_id and captain_id = auth.uid()
    and (status = 'ready' or (not v_strict and status in ('picked_up', 'cleaning')));
  if not found then raise exception 'Order is not ready for delivery yet'; end if;
end $$;

drop function if exists public.confirm_delivery(uuid, text);
create or replace function public.confirm_delivery(p_id uuid, p_otp text, p_pieces int default null, p_photos jsonb default '[]')
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; v_need boolean := public.setting_bool('require_photos', true);
begin
  perform public._require_role('captain');
  select * into o from public.orders where id = p_id and captain_id = auth.uid() and status = 'out_for_delivery' for update;
  if not found then raise exception 'Order is not out for delivery'; end if;
  if public.order_due(o) > 0 then raise exception 'Collect the payment first (₹% due)', public.order_due(o); end if;
  if not exists (select 1 from public.order_secrets where order_id = p_id and delivery_otp = trim(p_otp)) then
    raise exception 'Wrong OTP. Ask the customer for the 4-digit delivery code.';
  end if;
  if not public._valid_photos(p_id, p_photos) then raise exception 'Invalid photos'; end if;
  if v_need and (coalesce(p_pieces, 0) < 1 or jsonb_array_length(coalesce(p_photos, '[]')) < 1) then
    raise exception 'Count the garments you hand over and add a photo';
  end if;
  insert into public.order_checks (order_id, stage, piece_count, photos, created_by) values (p_id, 'delivery', p_pieces, coalesce(p_photos, '[]'), auth.uid());
  update public.orders set status = 'delivered', delivered_at = now() where id = p_id;
  if o.pieces_picked_up is not null and p_pieces is not null and o.pieces_picked_up <> p_pieces then
    perform public._alert('count_mismatch', p_id, format('Order %s: %s pieces picked up but %s delivered', o.order_code, o.pieces_picked_up, p_pieces), 'urgent');
  end if;
end $$;

grant execute on function
  public.confirm_pickup(uuid, text, jsonb, int, jsonb, text, jsonb), public.confirm_delivery(uuid, text, int, jsonb),
  public.cleaner_queue(), public.cleaner_receive(uuid, int, text, jsonb), public.cleaner_ready(uuid, int, text), public.start_delivery(uuid)
to authenticated;

-- ============================================================ photo storage (private bucket)
-- Supabase Storage tables only exist on Supabase; local test DBs stub them.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('order-photos', 'order-photos', false) on conflict (id) do nothing;

    execute 'drop policy if exists "order photos insert" on storage.objects';
    execute $p$create policy "order photos insert" on storage.objects for insert to authenticated with check (
      bucket_id = 'order-photos' and exists (
        select 1 from public.orders o where o.id::text = (storage.foldername(name))[1]
          and (o.captain_id = auth.uid() or o.customer_id = auth.uid() or public.my_role() = 'admin'
               or (public.my_role() = 'cleaner' and o.status in ('picked_up', 'cleaning', 'ready'))))
    )$p$;

    execute 'drop policy if exists "order photos read" on storage.objects';
    execute $p$create policy "order photos read" on storage.objects for select to authenticated using (
      bucket_id = 'order-photos' and exists (
        select 1 from public.orders o where o.id::text = (storage.foldername(name))[1]
          and (o.captain_id = auth.uid() or o.customer_id = auth.uid() or public.my_role() = 'admin'))
    )$p$;
  end if;
end $$;
