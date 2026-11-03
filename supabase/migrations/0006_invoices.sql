-- 0006: invoices. One immutable invoice per delivered order, numbered per financial year (Apr–Mar).
-- GST rate, GSTIN and SAC codes are configuration — CONFIRM THEM WITH YOUR CA before charging tax.

insert into public.app_settings (key, value) values
  ('business', '{"legal_name":"Poshak Technologies Private Limited","trade_name":"Poshak","gstin":"","address":"Bengaluru, Karnataka","state":"Karnataka","state_code":"29","gst_registered":false,"gst_rate":18,"prices_include_gst":true,"invoice_prefix":"PSK","email":"support@poshak.in","phone":""}')
on conflict (key) do nothing;

alter table public.service_rates add column if not exists sac text not null default '999711';
update public.service_rates set sac = '999712' where id = 'dry-clean';
update public.service_rates set sac = '999713' where id = 'steam-press';

create or replace function public.admin_set_service_sac(p_id text, p_sac text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_sac !~ '^[0-9]{4,8}$' then raise exception 'SAC must be 4–8 digits'; end if;
  update public.service_rates set sac = p_sac where id = p_id;
end $$;
grant execute on function public.admin_set_service_sac(text, text) to authenticated;

-- business settings validation (the allowlist in admin_set_setting already includes "business")
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_key not in (select jsonb_array_elements_text('["min_charge","member_discount_pct","slot_windows","max_orders_per_slot","slot_capacity_overrides","service_area","support","require_photos","require_cleaner_step","business","captain_fee_per_order","referral_bonus","offer_timeout_min","auto_assign","max_reschedules","claim_credit_multiple","claims_policy"]'::jsonb)) then
    raise exception 'Unknown setting %', p_key;
  end if;
  if p_key = 'member_discount_pct' and ((p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 90) then raise exception 'Discount must be 0–90 percent'; end if;
  if p_key = 'min_charge' and (p_value #>> '{}')::numeric < 0 then raise exception 'Minimum charge cannot be negative'; end if;
  if p_key = 'max_orders_per_slot' and (p_value #>> '{}')::numeric < 1 then raise exception 'Capacity must be at least 1'; end if;
  if p_key = 'service_area' and (
       (p_value->>'radius_km')::numeric <= 0 or (p_value->>'lat')::numeric not between -90 and 90 or (p_value->>'lng')::numeric not between -180 and 180
     ) then raise exception 'Invalid service area'; end if;
  if p_key in ('require_photos', 'require_cleaner_step', 'auto_assign') and jsonb_typeof(p_value) <> 'boolean' then raise exception '% must be true or false', p_key; end if;
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

-- ============================================================ invoices
create table if not exists public.invoice_counters (fy text primary key, last_no int not null default 0);
alter table public.invoice_counters enable row level security;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  invoice_no text not null unique,
  kind text not null check (kind in ('tax_invoice', 'receipt')),
  fy text not null,
  issued_at timestamptz not null default now(),
  seller jsonb not null,
  buyer jsonb not null,
  lines jsonb not null,
  taxable_value numeric not null,
  gst_rate numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  igst numeric not null default 0,
  total numeric not null
);
alter table public.invoices enable row level security;
drop policy if exists "invoices read" on public.invoices;
create policy "invoices read" on public.invoices for select using (
  public.my_role() = 'admin' or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
grant select on public.invoices to authenticated;

-- Invoices are legal records: no edits, no deletes (issue a credit note instead).
create or replace function public.invoices_immutable()
returns trigger language plpgsql as $$
begin raise exception 'Invoices cannot be changed or deleted'; end $$;
drop trigger if exists invoices_immutable_trg on public.invoices;
create trigger invoices_immutable_trg before update or delete on public.invoices for each row execute function public.invoices_immutable();

create or replace function public._generate_invoice(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders; b jsonb := public.setting('business'); v_reg boolean; v_rate numeric; v_incl boolean;
  v_now timestamp := now() at time zone 'Asia/Kolkata'; v_start int; v_fy text; v_no int;
  v_lines jsonb; v_sub numeric; v_total numeric; v_taxable numeric; v_tax numeric := 0; v_cgst numeric := 0; v_sgst numeric := 0;
begin
  if exists (select 1 from public.invoices where order_id = p_order) then return; end if;
  select * into o from public.orders where id = p_order;
  v_total := coalesce(o.final_amount, o.estimated_amount);
  v_reg := coalesce((b->>'gst_registered')::boolean, false);
  v_rate := case when v_reg then coalesce((b->>'gst_rate')::numeric, 0) else 0 end;
  v_incl := coalesce((b->>'prices_include_gst')::boolean, true);

  select coalesce(jsonb_agg(jsonb_build_object('description', r.name, 'sac', r.sac, 'qty', (i->>'qty')::numeric, 'unit', r.unit, 'rate', r.rate,
           'amount', round((i->>'qty')::numeric * r.rate, 2))), '[]'::jsonb),
         coalesce(sum(round((i->>'qty')::numeric * r.rate, 2)), 0)
    into v_lines, v_sub
    from jsonb_array_elements(coalesce(o.actual_items, o.items)) i join public.service_rates r on r.id = i->>'service_id';
  if v_total <> v_sub then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('description', case when v_total < v_sub then 'Discounts' else 'Minimum charge adjustment' end,
                'sac', '', 'qty', 1, 'unit', '', 'rate', v_total - v_sub, 'amount', v_total - v_sub));
  end if;

  if v_reg and v_rate > 0 then
    if v_incl then v_taxable := round(v_total / (1 + v_rate / 100), 2); v_tax := v_total - v_taxable;
    else v_taxable := v_total; v_tax := round(v_total * v_rate / 100, 2); v_total := v_taxable + v_tax; end if;
    v_cgst := round(v_tax / 2, 2); v_sgst := v_tax - v_cgst;           -- services performed in the supplier's state → CGST + SGST
  else
    v_taxable := v_total;
  end if;

  v_start := case when extract(month from v_now) >= 4 then extract(year from v_now)::int else extract(year from v_now)::int - 1 end;
  v_fy := right(v_start::text, 2) || right((v_start + 1)::text, 2);
  insert into public.invoice_counters (fy, last_no) values (v_fy, 1)
    on conflict (fy) do update set last_no = public.invoice_counters.last_no + 1 returning last_no into v_no;

  insert into public.invoices (order_id, invoice_no, kind, fy, seller, buyer, lines, taxable_value, gst_rate, cgst, sgst, igst, total)
  values (p_order, coalesce(b->>'invoice_prefix', 'INV') || '/' || v_fy || '/' || lpad(v_no::text, 6, '0'),
          case when v_reg then 'tax_invoice' else 'receipt' end, v_fy, b,
          jsonb_build_object('name', o.customer_name, 'email', o.customer_email, 'phone', o.customer_phone, 'address', o.pickup_address, 'order_code', o.order_code),
          v_lines, v_taxable, v_rate, v_cgst, v_sgst, 0, v_total);
end $$;
revoke execute on function public._generate_invoice(uuid) from public, anon, authenticated;

create or replace function public.orders_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then perform public._generate_invoice(new.id); end if;
  return new;
end $$;
drop trigger if exists orders_invoice_trg on public.orders;
create trigger orders_invoice_trg after update of status on public.orders for each row execute function public.orders_invoice();
