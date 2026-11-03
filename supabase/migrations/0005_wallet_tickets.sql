-- 0005: wallet credit (claims, referrals, plans) + complaints / claims with response deadlines.

-- ============================================================ wallet
create table if not exists public.wallet_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount <> 0),          -- + credit, − debit
  kind text not null check (kind in ('claim', 'referral', 'plan', 'refund', 'order_payment', 'adjustment', 'tip_refund')),
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists wallet_user_idx on public.wallet_ledger (user_id, created_at desc);
alter table public.wallet_ledger enable row level security;
drop policy if exists "wallet own" on public.wallet_ledger;
create policy "wallet own" on public.wallet_ledger for select using (user_id = auth.uid() or public.my_role() = 'admin');
grant select on public.wallet_ledger to authenticated;

create or replace function public.wallet_balance_of(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.wallet_ledger where user_id = p_user
$$;
revoke execute on function public.wallet_balance_of(uuid) from public, anon, authenticated;

create or replace function public.my_wallet_balance()
returns numeric language sql stable security definer set search_path = public as $$
  select public.wallet_balance_of(auth.uid())
$$;
grant execute on function public.my_wallet_balance() to authenticated;

create or replace function public._wallet_credit(p_user uuid, p_amount numeric, p_kind text, p_order uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_ledger (user_id, amount, kind, order_id, note, created_by) values (p_user, p_amount, p_kind, p_order, p_note, auth.uid());
  perform public._notify(p_user, 'wallet', case when p_amount > 0 then format('₹%s added to your wallet', p_amount) else format('₹%s used from your wallet', abs(p_amount)) end, p_note, p_order);
end $$;
revoke execute on function public._wallet_credit(uuid, numeric, text, uuid, text) from public, anon, authenticated;

create or replace function public.admin_wallet_adjust(p_user uuid, p_amount numeric, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role('admin');
  if p_amount is null or p_amount = 0 or abs(p_amount) > 5000 then raise exception 'Amount must be between ₹1 and ₹5000'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Add a reason'; end if;
  if p_amount < 0 and public.wallet_balance_of(p_user) + p_amount < 0 then raise exception 'Wallet cannot go negative'; end if;
  perform public._wallet_credit(p_user, p_amount, 'adjustment', null, p_note);
end $$;
grant execute on function public.admin_wallet_adjust(uuid, numeric, text) to authenticated;

alter table public.orders add column if not exists use_wallet boolean not null default true;
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('cash', 'upi_qr', 'online', 'wallet'));

-- Wallet pays first, as soon as the bill is fixed at pickup.
create or replace function public._apply_wallet(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; v_amt numeric;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or not o.use_wallet then return; end if;
  v_amt := least(public.wallet_balance_of(o.customer_id), public.order_due(o));
  if v_amt <= 0 then return; end if;
  perform public._wallet_credit(o.customer_id, -v_amt, 'order_payment', o.id, format('Order %s', o.order_code));
  insert into public.payments (order_id, method, amount) values (o.id, 'wallet', v_amt);
  update public.orders
     set paid_amount = paid_amount + v_amt,
         payment_status = case when paid_amount + v_amt >= coalesce(final_amount, estimated_amount) then 'paid' else 'partial' end
   where id = o.id;
end $$;
revoke execute on function public._apply_wallet(uuid) from public, anon, authenticated;

create or replace function public.orders_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_back numeric;
begin
  if new.status = 'picked_up' and old.status is distinct from 'picked_up' then
    perform public._apply_wallet(new.id);
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    select coalesce(sum(amount), 0) into v_back from public.payments where order_id = new.id and method = 'wallet';
    if v_back > 0 then perform public._wallet_credit(new.customer_id, v_back, 'refund', new.id, format('Refund for cancelled order %s', new.order_code)); end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_wallet_trg on public.orders;
create trigger orders_wallet_trg after update of status on public.orders for each row execute function public.orders_wallet();

-- ============================================================ complaints / claims
insert into public.app_settings (key, value) values
  ('claim_credit_multiple', '3'),
  ('claims_policy', '"If a garment is lost or damaged while in our care, we credit up to 3× the cleaning charge of that order to your Poshak wallet, after we review the photos taken at pickup and delivery. Report problems within 48 hours of delivery. We acknowledge every complaint within 48 hours and resolve it within 30 days."')
on conflict (key) do nothing;

create sequence if not exists public.ticket_seq;
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique default ('TKT-' || lpad(nextval('public.ticket_seq')::text, 6, '0')),
  customer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  category text not null check (category in ('missing_item', 'damaged', 'quality', 'late', 'billing', 'captain_behaviour', 'other')),
  description text not null check (length(description) between 5 and 2000),
  photos jsonb not null default '[]',
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  resolution text check (resolution in ('credit', 'refund', 'redo', 'none')),
  resolution_amount numeric,
  resolution_note text,
  ack_at timestamptz,
  due_ack_at timestamptz not null default now() + interval '48 hours',
  due_resolve_at timestamptz not null default now() + interval '30 days',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_customer_idx on public.tickets (customer_id, created_at desc);
create index if not exists tickets_open_idx on public.tickets (status, due_ack_at);

create table if not exists public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null check (sender_role in ('customer', 'admin')),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
drop policy if exists "tickets read" on public.tickets;
create policy "tickets read" on public.tickets for select using (customer_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "ticket msgs read" on public.ticket_messages;
create policy "ticket msgs read" on public.ticket_messages for select using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (t.customer_id = auth.uid() or public.my_role() = 'admin')));
grant select on public.tickets, public.ticket_messages to authenticated;

create or replace function public.open_ticket(p_order uuid, p_category text, p_description text, p_photos jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.orders; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not allowed'; end if;
  select * into o from public.orders where id = p_order and customer_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if (select count(*) from public.tickets where customer_id = auth.uid() and status in ('open', 'in_review')) >= 5 then
    raise exception 'You already have several open complaints. Please wait for a reply.';
  end if;
  if not public._valid_photos(p_order, p_photos) then raise exception 'Invalid photos'; end if;
  insert into public.tickets (customer_id, order_id, category, description, photos) values (auth.uid(), p_order, p_category, trim(p_description), coalesce(p_photos, '[]'))
  returning id into v_id;
  insert into public.ticket_messages (ticket_id, sender_id, sender_role, body) values (v_id, auth.uid(), 'customer', trim(p_description));
  perform public._notify_admins('ticket', 'New complaint', format('%s on order %s: %s', replace(p_category, '_', ' '), o.order_code, left(p_description, 120)), p_order);
  perform public._notify(auth.uid(), 'ticket', 'We got your complaint', 'Our team will reply within 48 hours. You can follow it under Help.', p_order);
  return v_id;
end $$;

create or replace function public.ticket_reply(p_ticket uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tickets; v_role text := public.my_role();
begin
  select * into t from public.tickets where id = p_ticket;
  if not found or (t.customer_id <> auth.uid() and v_role <> 'admin') then raise exception 'Ticket not found'; end if;
  if t.status in ('resolved', 'rejected') and v_role <> 'admin' then raise exception 'This complaint is closed. Open a new one if the problem continues.'; end if;
  insert into public.ticket_messages (ticket_id, sender_id, sender_role, body)
  values (p_ticket, auth.uid(), case when v_role = 'admin' then 'admin' else 'customer' end, trim(p_body));
  if v_role = 'admin' then
    update public.tickets set ack_at = coalesce(ack_at, now()), status = case when status = 'open' then 'in_review' else status end, updated_at = now() where id = p_ticket;
    perform public._notify(t.customer_id, 'ticket', 'Reply on your complaint ' || t.ticket_no, left(p_body, 140), t.order_id);
  else
    update public.tickets set updated_at = now() where id = p_ticket;
  end if;
end $$;

create or replace function public.admin_resolve_ticket(p_ticket uuid, p_status text, p_resolution text, p_amount numeric, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tickets; o public.orders; v_cap numeric; v_mult numeric := public.setting_num('claim_credit_multiple', 3);
begin
  perform public._require_role('admin');
  if p_status not in ('resolved', 'rejected') then raise exception 'Status must be resolved or rejected'; end if;
  select * into t from public.tickets where id = p_ticket for update;
  if not found then raise exception 'Ticket not found'; end if;
  if t.status in ('resolved', 'rejected') then raise exception 'Already closed'; end if;
  select * into o from public.orders where id = t.order_id;
  if p_status = 'resolved' and p_resolution in ('credit', 'refund') then
    if coalesce(p_amount, 0) <= 0 then raise exception 'Enter the amount'; end if;
    v_cap := v_mult * coalesce(o.final_amount, o.estimated_amount);
    if t.category in ('missing_item', 'damaged') and p_amount > v_cap then
      raise exception 'Above the claims policy limit of ₹% (% × order value)', v_cap, v_mult;
    end if;
  end if;
  if p_status = 'resolved' and p_resolution = 'credit' then
    perform public._wallet_credit(t.customer_id, p_amount, 'claim', t.order_id, format('Resolution of %s', t.ticket_no));
  end if;
  update public.tickets
     set status = p_status, resolution = coalesce(p_resolution, 'none'), resolution_amount = p_amount, resolution_note = p_note,
         ack_at = coalesce(ack_at, now()), resolved_at = now(), updated_at = now()
   where id = p_ticket;
  insert into public.ticket_messages (ticket_id, sender_id, sender_role, body)
  values (p_ticket, auth.uid(), 'admin', coalesce(nullif(trim(p_note), ''), case p_status when 'resolved' then 'Your complaint has been resolved.' else 'We reviewed your complaint.' end));
  perform public._notify(t.customer_id, 'ticket', format('Complaint %s %s', t.ticket_no, p_status),
    coalesce(p_note, '') || case when p_resolution = 'credit' then format(' ₹%s credited to your wallet.', p_amount) when p_resolution = 'refund' then format(' A refund of ₹%s will be sent to your original payment method.', p_amount) else '' end, t.order_id);
end $$;

grant execute on function public.open_ticket(uuid, text, text, jsonb), public.ticket_reply(uuid, text),
  public.admin_resolve_ticket(uuid, text, text, numeric, text) to authenticated;
alter publication supabase_realtime add table public.tickets;
