-- 0010: admin analytics, customer list, immutable audit log, refunds, reconciliation helpers.

insert into public.app_settings (key, value) values ('sla_hours', '48') on conflict (key) do nothing;

create or replace function public._setting_allowed(p_key text)
returns boolean language sql immutable as $$
  select p_key in ('min_charge','member_discount_pct','slot_windows','max_orders_per_slot','slot_capacity_overrides','service_area','support','require_photos','require_cleaner_step','business',
                   'captain_fee_per_order','referral_bonus','referral_min_order','offer_timeout_min','auto_assign','max_reschedules','claim_credit_multiple','claims_policy','require_job_accept','ops_phone','sla_hours')
$$;

-- ============================================================ analytics
create or replace function public.admin_analytics(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz := (date_trunc('day', now() at time zone 'Asia/Kolkata') - make_interval(days => v_days - 1)) at time zone 'Asia/Kolkata';
  v_sla numeric := public.setting_num('sla_hours', 48);
  v_orders int; v_delivered int; v_cancelled int; v_rev numeric; v_customers int; v_repeat int; v_new int; v_late int; v_turn numeric;
begin
  perform public._require_role('admin');
  select count(*), count(*) filter (where status = 'delivered'), count(*) filter (where status = 'cancelled'),
         coalesce(sum(final_amount) filter (where status = 'delivered'), 0), count(distinct customer_id)
    into v_orders, v_delivered, v_cancelled, v_rev, v_customers from public.orders where created_at >= v_from;
  select count(*) into v_repeat from (
    select customer_id from public.orders where status <> 'cancelled' and customer_id in (select customer_id from public.orders where created_at >= v_from)
    group by customer_id having count(*) >= 2) x;
  select count(*) into v_new from (
    select customer_id from public.orders where status <> 'cancelled' group by customer_id having min(created_at) >= v_from) x;
  select count(*) into v_late from public.orders where created_at >= v_from and picked_up_at is not null
     and coalesce(delivered_at, now()) - picked_up_at > make_interval(hours => v_sla::int) and status <> 'cancelled';
  select round(avg(extract(epoch from (delivered_at - picked_up_at)) / 3600)::numeric, 1) into v_turn
    from public.orders where status = 'delivered' and created_at >= v_from and picked_up_at is not null;

  return jsonb_build_object(
    'days', v_days,
    'orders', v_orders, 'delivered', v_delivered, 'cancelled', v_cancelled, 'revenue', v_rev,
    'aov', case when v_delivered > 0 then round(v_rev / v_delivered, 2) else 0 end,
    'cancel_rate', case when v_orders > 0 then round(100.0 * v_cancelled / v_orders, 1) else 0 end,
    'customers', v_customers, 'repeat_customers', v_repeat, 'new_customers', v_new,
    'repeat_rate', case when v_customers > 0 then round(100.0 * v_repeat / v_customers, 1) else 0 end,
    'late', v_late, 'avg_turnaround_hours', v_turn, 'sla_hours', v_sla,
    'discounts', (select coalesce(sum(discount_amount), 0) from public.orders where status = 'delivered' and created_at >= v_from),
    'daily', (select coalesce(jsonb_agg(to_jsonb(d) order by d.day), '[]'::jsonb) from (
        select (created_at at time zone 'Asia/Kolkata')::date as day, count(*) as orders,
               count(*) filter (where status = 'delivered') as delivered,
               coalesce(sum(final_amount) filter (where status = 'delivered'), 0) as revenue
          from public.orders where created_at >= v_from group by 1) d),
    'top_services', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
        select r.name, count(*) as orders from public.orders o, jsonb_array_elements(o.items) i join public.service_rates r on r.id = i->>'service_id'
         where o.created_at >= v_from and o.status <> 'cancelled' group by r.name order by 2 desc limit 7) s),
    'payment_mix', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from (
        select method, sum(amount) as amount from public.payments where created_at >= v_from group by method order by 2 desc) m),
    'captains', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from (
        select p.name, count(o.id) filter (where o.status = 'delivered') as deliveries,
               round(avg(o.captain_rating)::numeric, 2) as rating,
               (select count(*) from public.order_attempts a join public.orders oo on oo.id = a.order_id where oo.captain_id = p.id and a.created_at >= v_from) as failed_attempts
          from public.profiles p left join public.orders o on o.captain_id = p.id and o.created_at >= v_from
         where p.role = 'captain' group by p.id, p.name order by 2 desc) c),
    'tickets', jsonb_build_object(
        'open', (select count(*) from public.tickets where status in ('open', 'in_review')),
        'overdue', (select count(*) from public.tickets where (status = 'open' and ack_at is null and due_ack_at < now()) or (status in ('open', 'in_review') and due_resolve_at < now())),
        'avg_resolve_hours', (select round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) from public.tickets where resolved_at is not null and created_at >= v_from)));
end $$;
grant execute on function public.admin_analytics(int) to authenticated;

create or replace function public.admin_customers(p_search text default null, p_limit int default 100)
returns table (id uuid, name text, email text, phone text, orders bigint, spent numeric, last_order timestamptz, wallet numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  return query
    select p.id, p.name, p.email, p.phone,
           count(o.id) filter (where o.status <> 'cancelled'),
           coalesce(sum(coalesce(o.final_amount, o.estimated_amount)) filter (where o.status = 'delivered'), 0),
           max(o.created_at), public.wallet_balance_of(p.id)
      from public.profiles p left join public.orders o on o.customer_id = p.id
     where p.role = 'customer' and (p_search is null or p_search = '' or p.name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%' or p.phone ilike '%' || p_search || '%')
     group by p.id order by max(o.created_at) desc nulls last limit least(coalesce(p_limit, 100), 500);
end $$;
grant execute on function public.admin_customers(text, int) to authenticated;

-- ============================================================ audit log (who changed what — append only)
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  actor_email text,
  actor_role text,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;
drop policy if exists "audit admin" on public.audit_log;
create policy "audit admin" on public.audit_log for select using (public.my_role() = 'admin');
grant select on public.audit_log to authenticated;

create or replace function public.audit_immutable()
returns trigger language plpgsql as $$ begin raise exception 'The audit log is append-only'; end $$;
drop trigger if exists audit_immutable_trg on public.audit_log;
create trigger audit_immutable_trg before update or delete on public.audit_log for each row execute function public.audit_immutable();

create or replace function public._audit_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_row jsonb := to_jsonb(coalesce(new, old)); v_diff jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(k, jsonb_build_object('from', to_jsonb(old) -> k, 'to', to_jsonb(new) -> k)), '{}'::jsonb) into v_diff
      from jsonb_object_keys(to_jsonb(new)) k where to_jsonb(new) -> k is distinct from to_jsonb(old) -> k and k <> 'updated_at';
    if v_diff = '{}'::jsonb then return new; end if;
  elsif tg_op = 'INSERT' then v_diff := v_row; else v_diff := v_row; end if;
  insert into public.audit_log (actor, actor_email, actor_role, action, target, details)
  values (v_actor, (select email from public.profiles where id = v_actor), coalesce(public.my_role(), 'system'), tg_table_name || '.' || lower(tg_op), v_row ->> tg_argv[0], v_diff);
  return coalesce(new, old);
end $$;

do $$
declare r record;
begin
  for r in select * from (values ('app_settings','key'), ('service_rates','id'), ('coupons','code'), ('plans','id'), ('staff_emails','email'),
                                 ('wallet_ledger','id'), ('captain_payouts','id'), ('tickets','ticket_no')) as t(tbl, keycol) loop
    execute format('drop trigger if exists audit_%1$s_trg on public.%1$s', r.tbl);
    execute format('create trigger audit_%1$s_trg after insert or update or delete on public.%1$s for each row execute function public._audit_change(%2$L)', r.tbl, r.keycol);
  end loop;
end $$;

-- Orders: only money / assignment / status changes are interesting.
create or replace function public._audit_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_diff jsonb := '{}'::jsonb; k text;
begin
  foreach k in array array['status', 'captain_id', 'final_amount', 'refunded_amount', 'payment_status', 'pickup_date', 'pickup_window'] loop
    if to_jsonb(new) -> k is distinct from to_jsonb(old) -> k then
      v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(old) -> k, 'to', to_jsonb(new) -> k));
    end if;
  end loop;
  if v_diff <> '{}'::jsonb then
    insert into public.audit_log (actor, actor_email, actor_role, action, target, details)
    values (auth.uid(), (select email from public.profiles where id = auth.uid()), coalesce(public.my_role(), 'system'), 'orders.update', new.order_code, v_diff);
  end if;
  return new;
end $$;
drop trigger if exists audit_orders_trg on public.orders;
create trigger audit_orders_trg after update on public.orders for each row execute function public._audit_order();

-- ============================================================ refunds
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id),
  method text not null check (method in ('wallet', 'razorpay', 'manual')),
  amount numeric not null check (amount > 0),
  status text not null default 'processed' check (status in ('pending', 'processed', 'failed')),
  razorpay_refund_id text unique,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.refunds enable row level security;
drop policy if exists "refunds read" on public.refunds;
create policy "refunds read" on public.refunds for select using (
  public.my_role() = 'admin' or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
grant select on public.refunds to authenticated;

-- Refund to wallet: instant, no gateway involved.
create or replace function public.admin_refund_to_wallet(p_order uuid, p_amount numeric, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public._require_role('admin');
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount'; end if;
  if o.refunded_amount + p_amount > o.paid_amount then raise exception 'Cannot refund more than was paid (₹% paid, ₹% already refunded)', o.paid_amount, o.refunded_amount; end if;
  perform public._wallet_credit(o.customer_id, p_amount, 'refund', o.id, coalesce(p_reason, format('Refund for order %s', o.order_code)));
  update public.orders set refunded_amount = refunded_amount + p_amount where id = o.id;
  insert into public.refunds (order_id, method, amount, status, reason, created_by) values (o.id, 'wallet', p_amount, 'processed', p_reason, auth.uid());
end $$;
grant execute on function public.admin_refund_to_wallet(uuid, numeric, text) to authenticated;

-- What can still be refunded to the original payment method (Razorpay), per payment.
create or replace function public.refundable_payments(p_order uuid)
returns table (payment_id uuid, razorpay_payment_id text, method text, refundable numeric)
language sql stable security definer set search_path = public as $$
  select p.id, p.razorpay_payment_id, p.method,
         p.amount - coalesce((select sum(r.amount) from public.refunds r where r.payment_id = p.id and r.status <> 'failed'), 0)
    from public.payments p where p.order_id = p_order and p.method in ('online', 'upi_qr') and p.razorpay_payment_id is not null
$$;
revoke execute on function public.refundable_payments(uuid) from public, anon, authenticated;
grant execute on function public.refundable_payments(uuid) to service_role;

-- Called by the refund edge function after Razorpay accepts the refund.
create or replace function public.record_refund(p_order uuid, p_payment uuid, p_amount numeric, p_rzp_refund text, p_status text, p_reason text, p_by uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.refunded_amount + p_amount > o.paid_amount then raise exception 'Refund exceeds amount paid'; end if;
  insert into public.refunds (order_id, payment_id, method, amount, status, razorpay_refund_id, reason, created_by)
  values (p_order, p_payment, 'razorpay', p_amount, p_status, p_rzp_refund, p_reason, p_by) on conflict (razorpay_refund_id) do nothing;
  if found then
    update public.orders set refunded_amount = refunded_amount + p_amount where id = p_order;
    perform public._notify(o.customer_id, 'payment', format('Refund of ₹%s initiated', p_amount), 'It reaches your original payment method in 5–7 working days.', p_order);
  end if;
end $$;
revoke execute on function public.record_refund(uuid, uuid, numeric, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_refund(uuid, uuid, numeric, text, text, text, uuid) to service_role;

-- Razorpay webhook (refund.processed / refund.failed).
create or replace function public.update_refund_status(p_rzp_refund text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.refunds;
begin
  select * into r from public.refunds where razorpay_refund_id = p_rzp_refund for update;
  if not found or r.status = p_status then return; end if;
  update public.refunds set status = p_status where id = r.id;
  if p_status = 'failed' then
    update public.orders set refunded_amount = greatest(0, refunded_amount - r.amount) where id = r.order_id;
    perform public._alert('refund_failed', r.order_id, format('Refund of ₹%s failed at the gateway — retry or refund to wallet', r.amount), 'urgent');
  end if;
end $$;
revoke execute on function public.update_refund_status(text, text) from public, anon, authenticated;
grant execute on function public.update_refund_status(text, text) to service_role;

-- ============================================================ reconciliation helper (compare with Razorpay's own list)
create or replace function public.reconcile_known_payments(p_from timestamptz, p_to timestamptz)
returns table (razorpay_payment_id text, amount numeric, source text, ref text)
language sql stable security definer set search_path = public as $$
  select p.razorpay_payment_id, p.amount, 'order'::text, o.order_code from public.payments p join public.orders o on o.id = p.order_id
   where p.razorpay_payment_id is not null and p.created_at between p_from and p_to
  union all select pp.razorpay_payment_id, pp.amount, 'plan', pp.plan_id from public.plan_purchases pp where pp.created_at between p_from and p_to
  union all select t.razorpay_payment_id, t.amount, 'tip', null from public.tips t where t.created_at between p_from and p_to
$$;
revoke execute on function public.reconcile_known_payments(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.reconcile_known_payments(timestamptz, timestamptz) to service_role;
