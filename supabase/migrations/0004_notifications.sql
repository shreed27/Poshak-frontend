-- 0004: notifications — in-app inbox, push, and opt-in WhatsApp/SMS via an outbox.

-- ============================================================ preferences (explicit opt-in for WhatsApp / SMS)
alter table public.profiles add column if not exists notify_whatsapp boolean not null default false;
alter table public.profiles add column if not exists notify_sms boolean not null default false;
alter table public.profiles add column if not exists notify_push boolean not null default true;
alter table public.profiles add column if not exists notify_consent_at timestamptz;

create or replace function public.set_notification_prefs(p_whatsapp boolean, p_sms boolean, p_push boolean, p_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_phone text := nullif(regexp_replace(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '^(91|0)([0-9]{10})$', '\2'), '');
begin
  if auth.uid() is null then raise exception 'Not allowed'; end if;
  if v_phone is not null and v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number'; end if;
  if (p_whatsapp or p_sms) and coalesce(v_phone, (select phone from public.profiles where id = auth.uid())) is null then
    raise exception 'Add your mobile number to get WhatsApp / SMS updates';
  end if;
  update public.profiles
     set notify_whatsapp = p_whatsapp, notify_sms = p_sms, notify_push = p_push,
         phone = coalesce(v_phone, phone),
         notify_consent_at = case when (p_whatsapp or p_sms) and not (notify_whatsapp or notify_sms) then now() else notify_consent_at end
   where id = auth.uid();
end $$;

-- ============================================================ inbox
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  order_id uuid references public.orders(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications for select using (user_id = auth.uid());
grant select on public.notifications to authenticated;

create or replace function public.mark_notifications_read(p_ids bigint[] default null)
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids))
$$;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;

-- ============================================================ push subscriptions + outbox (server side)
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push own" on public.push_subscriptions;
create policy "push own" on public.push_subscriptions for select using (user_id = auth.uid());
grant select on public.push_subscriptions to authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not allowed'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid()
$$;
grant execute on function public.set_notification_prefs(boolean, boolean, boolean, text),
  public.save_push_subscription(text, text, text), public.remove_push_subscription(text) to authenticated;

create table if not exists public.notification_outbox (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'push')),
  to_phone text,
  payload jsonb not null,                -- { name, text, title, url }
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists outbox_pending_idx on public.notification_outbox (status, created_at) where status = 'pending';
alter table public.notification_outbox enable row level security;        -- no policies: server (service role) only

-- ============================================================ fan-out
create or replace function public._notify(p_user uuid, p_kind text, p_title text, p_body text, p_order uuid default null, p_sms_text text default null)
returns void language plpgsql security definer set search_path = public as $$
declare pr public.profiles; v_text text := coalesce(p_sms_text, p_title || ' ' || coalesce(p_body, ''));
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, kind, title, body, order_id) values (p_user, p_kind, p_title, p_body, p_order);
  select * into pr from public.profiles where id = p_user;
  if not found then return; end if;
  if pr.notify_whatsapp and pr.phone is not null then
    insert into public.notification_outbox (user_id, channel, to_phone, payload) values (p_user, 'whatsapp', pr.phone, jsonb_build_object('name', coalesce(split_part(pr.name, ' ', 1), 'there'), 'text', v_text));
  end if;
  if pr.notify_sms and pr.phone is not null then
    insert into public.notification_outbox (user_id, channel, to_phone, payload) values (p_user, 'sms', pr.phone, jsonb_build_object('text', 'Poshak: ' || v_text));
  end if;
  if pr.notify_push and exists (select 1 from public.push_subscriptions s where s.user_id = p_user) then
    insert into public.notification_outbox (user_id, channel, payload) values (p_user, 'push', jsonb_build_object('title', p_title, 'text', coalesce(p_body, ''), 'url', '/'));
  end if;
end $$;
revoke execute on function public._notify(uuid, text, text, text, uuid, text) from public, anon, authenticated;

create or replace function public._notify_admins(p_kind text, p_title text, p_body text, p_order uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select id from public.profiles where role = 'admin' loop
    perform public._notify(a.id, p_kind, p_title, p_body, p_order);
  end loop;
end $$;
revoke execute on function public._notify_admins(text, text, text, uuid) from public, anon, authenticated;

create or replace function public.orders_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.order_secrets; v_msg text;
begin
  select * into s from public.order_secrets where order_id = new.id;
  if tg_op = 'INSERT' then
    perform public._notify(new.customer_id, 'order', 'Order placed', format('Order %s is confirmed. We will assign a captain shortly.', new.order_code), new.id);
    perform public._notify_admins('new_order', 'New order ' || new.order_code, format('%s · ₹%s · %s', new.service_name, new.estimated_amount, coalesce(new.pickup_slot, 'ASAP')), new.id);
    return new;
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'captain_assigned' then
        perform public._notify(new.customer_id, 'order', format('%s is on the way', coalesce(new.captain_name, 'Your captain')),
          format('Order %s: share pickup OTP %s only when the captain is at your door.', new.order_code, s.pickup_otp), new.id);
        perform public._notify(new.captain_id, 'job', 'New pickup assigned', format('%s · %s · %s', new.order_code, new.pickup_address, coalesce(new.pickup_slot, '')), new.id);
      when 'picked_up' then
        perform public._notify(new.customer_id, 'order', 'Clothes picked up', format('Order %s: final bill ₹%s.', new.order_code, new.final_amount), new.id);
      when 'cleaning' then
        perform public._notify(new.customer_id, 'order', 'Being cleaned', format('Order %s is being cleaned.', new.order_code), new.id);
      when 'ready' then
        perform public._notify(new.customer_id, 'order', 'Cleaned and ready', format('Order %s is ready. Delivery is next.', new.order_code), new.id);
        perform public._notify(new.captain_id, 'job', 'Order ready for delivery', new.order_code, new.id);
      when 'out_for_delivery' then
        perform public._notify(new.customer_id, 'order', 'Out for delivery',
          format('Order %s: ₹%s due. Share delivery OTP %s only when you have your clothes.', new.order_code, greatest(0, coalesce(new.final_amount, new.estimated_amount) - new.paid_amount), s.delivery_otp), new.id);
      when 'delivered' then
        perform public._notify(new.customer_id, 'order', 'Delivered', format('Order %s delivered. Tell us how we did.', new.order_code), new.id);
      when 'cancelled' then
        perform public._notify(new.customer_id, 'order', 'Order cancelled', format('Order %s was cancelled.', new.order_code), new.id);
        perform public._notify(new.captain_id, 'job', 'Order cancelled', format('%s was cancelled — no pickup needed.', new.order_code), new.id);
      else null;
    end case;
  end if;

  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    perform public._notify(new.customer_id, 'payment', 'Payment received', format('₹%s received for order %s. Thank you!', new.paid_amount, new.order_code), new.id);
  end if;
  return new;
end $$;
drop trigger if exists orders_notify_trg on public.orders;
create trigger orders_notify_trg after insert or update on public.orders for each row execute function public.orders_notify();

-- Urgent ops alerts (count mismatches, SOS, …) ring every admin.
create or replace function public.alerts_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._notify_admins('alert', 'Alert: ' || replace(new.kind, '_', ' '), new.message, new.order_id);
  return new;
end $$;
drop trigger if exists alerts_notify_trg on public.ops_alerts;
create trigger alerts_notify_trg after insert on public.ops_alerts for each row execute function public.alerts_notify();

alter publication supabase_realtime add table public.notifications;

-- ============================================================ run the sender
-- Option A (simplest): Supabase Dashboard → Database → Webhooks → table notification_outbox, event INSERT → Edge Function send-notifications.
-- Option B (retries too): pg_cron every minute.
--   select cron.schedule('send-notifications', '* * * * *', $$ select net.http_post(
--     url := 'https://YOUR_REF.supabase.co/functions/v1/send-notifications',
--     headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')) $$);
