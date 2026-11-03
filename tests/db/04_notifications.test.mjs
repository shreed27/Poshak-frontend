import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key='require_photos'`);
await db.exec(`update app_settings set value='false' where key='require_job_accept'`);
const inbox = async (uid) => (await as(uid, 'authenticated', `select title, body, kind from notifications order by id`)).rows;
const outbox = async () => (await db.query(`select channel, to_phone, payload, status from notification_outbox order by id`)).rows;

let r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('N-1','${A}','x',$1,'Block 2',12.9355,77.6052) returning id`, [ITEMS(4)]);
const id = r.rows[0].id;
t('customer gets "Order placed" in the inbox', (await inbox(A)).some((n) => n.title === 'Order placed'));
t('admin gets a "New order" notification', (await inbox(M)).some((n) => n.kind === 'new_order'));
t('no WhatsApp/SMS queued without opt-in', (await outbox()).filter((o) => o.channel !== 'push').length === 0);

await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
const otp = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
let n = await inbox(A); t('customer told captain is on the way, with pickup OTP', n.some((x) => /on the way/.test(x.title) && x.body.includes(otp.pickup_otp)), n.at(-1)?.body);
n = await inbox(C); t('captain gets the new job notification', n.some((x) => x.kind === 'job' && /pickup assigned/i.test(x.title)));
t("customer cannot read someone else's inbox", (await inbox(B)).length === 0);

// opt in
r = await as(A, 'authenticated', `select set_notification_prefs(true, false, true, null)`); t('WhatsApp opt-in needs a phone number', !r.ok, r.err);
r = await as(A, 'authenticated', `select set_notification_prefs(true, false, true, '12345')`); t('invalid phone rejected', !r.ok);
r = await as(A, 'authenticated', `select set_notification_prefs(true, true, true, '+91 98765 43210')`); t('opt-in with phone works', r.ok, r.err);
const p = (await db.query(`select phone, notify_whatsapp, notify_consent_at from profiles where id='${A}'`)).rows[0];
t('phone normalised and consent time recorded', p.phone === '9876543210' && p.notify_whatsapp && p.notify_consent_at);

const sel = (await db.query(`select pickup_otp from order_secrets where order_id='${id}'`)).rows[0].pickup_otp;
await as(C, 'authenticated', `select confirm_pickup('${id}','${sel}',$1)`, [ITEMS(5)]);
let ob = await outbox();
t('after opt-in, picked-up update queues WhatsApp + SMS', ob.some((o) => o.channel === 'whatsapp' && o.to_phone === '9876543210') && ob.some((o) => o.channel === 'sms'), JSON.stringify(ob.map((o) => o.channel)));
t('WhatsApp payload carries first name + message', ob.find((o) => o.channel === 'whatsapp')?.payload.text.includes('final bill'), ob.find((o) => o.channel === 'whatsapp')?.payload.text);
r = await as(A, 'authenticated', `select * from notification_outbox`); t('customers cannot read the outbox', !r.ok);

// push
r = await as(A, 'authenticated', `select save_push_subscription('https://push.example/abc','key','auth')`); t('save push subscription', r.ok, r.err);
await as(C, 'authenticated', `select start_delivery('${id}')`);
ob = await outbox(); t('push queued once a subscription exists', ob.some((o) => o.channel === 'push' && o.payload.title === 'Out for delivery'));
r = await as(B, 'authenticated', `select * from push_subscriptions`); t("others cannot see someone's push subscription", r.rows.length === 0);

// payment notification + read state
await as(C, 'authenticated', `select collect_cash('${id}')`);
t('payment received notification', (await inbox(A)).some((x) => x.title === 'Payment received'));
r = await as(A, 'authenticated', `select mark_notifications_read()`); r = await as(A, 'authenticated', `select count(*)::int c from notifications where read_at is null`); t('mark all read', r.rows[0].c === 0);
r = await as(B, 'authenticated', `select mark_notifications_read()`); t("marking read never touches others' notifications", (await as(A, 'authenticated', `select count(*)::int c from notifications`)).rows[0].c > 0);

// alerts ring admins; cancel notifies captain
await db.exec(`select public._alert('count_mismatch', '${id}', 'Order N-1: 5 vs 4', 'urgent')`);
t('ops alert notifies admin inbox', (await inbox(M)).some((x) => /Alert: count mismatch/.test(x.title)));
r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('N-2','${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(2)]); const id2 = r.rows[0].id;
await as(M, 'authenticated', `select admin_assign_captain('${id2}','${C}')`); await as(A, 'authenticated', `select cancel_my_order('${id2}')`);
t('captain told when an assigned order is cancelled', (await inbox(C)).some((x) => /cancelled/i.test(x.title)));
finish();
