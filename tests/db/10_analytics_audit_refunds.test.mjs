import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key in ('require_photos','require_job_accept')`);
const deliver = async (uid, code, qty = 4, pay = 'cash') => {
  let r = await as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ($2,'${uid}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(qty), code]);
  const id = r.rows[0].id; await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
  await as(C, 'authenticated', `select confirm_pickup('${id}','${s.pickup_otp}',$1)`, [ITEMS(qty)]); await as(C, 'authenticated', `select start_delivery('${id}')`);
  await as(C, 'authenticated', `select collect_cash('${id}')`); await as(C, 'authenticated', `select confirm_delivery('${id}','${s.delivery_otp}')`); return id;
};

// ---- audit log
await as(M, 'authenticated', `select admin_set_setting('min_charge','120')`);
await as(M, 'authenticated', `select admin_upsert_rate('wash-iron','Wash & Steam Iron','kg',75,true)`);
let r = await as(M, 'authenticated', `select actor_email, actor_role, action, target, details from audit_log where action='app_settings.update' and target='min_charge' order by id desc limit 1`);
t('settings change is logged with who and from→to', r.rows.length === 1 && r.rows[0].actor_email === 'admin@x.in' && r.rows[0].details.value.to === 120 && r.rows[0].details.value.from === 99, JSON.stringify(r.rows[0]?.details));
r = await as(M, 'authenticated', `select details from audit_log where action='service_rates.update'`); t('price change logged (69 → 75)', Number(r.rows[0].details.rate.from) === 69 && Number(r.rows[0].details.rate.to) === 75);
await as(M, 'authenticated', `select admin_upsert_rate('wash-iron','Wash & Steam Iron','kg',69,true)`);
await as(M, 'authenticated', `select admin_set_setting('min_charge','99')`);
r = await as(A, 'authenticated', `select * from audit_log`); t('customers cannot read the audit log', r.rows.length === 0);
r = await as(M, 'authenticated', `update audit_log set actor_email='x'`); t('audit log cannot be edited (even by admin)', !r.ok, r.err);
r = await as(M, 'authenticated', `delete from audit_log`); t('audit log cannot be deleted', !r.ok);
const id1 = await deliver(A, 'X-1', 4); const id2 = await deliver(A, 'X-2', 2); const id3 = await deliver(B, 'X-3', 5);
r = await as(M, 'authenticated', `select details from audit_log where action='orders.update' and target='X-1' order by id`); t('order status changes are logged with actor role', r.rows.some((x) => x.details.status?.to === 'delivered'));
await as(M, 'authenticated', `select admin_wallet_adjust('${A}', 50, 'goodwill')`);
t('wallet adjustments are audited', (await as(M, 'authenticated', `select 1 from audit_log where action='wallet_ledger.insert'`)).rows.length >= 1);
await as(M, 'authenticated', `select admin_add_staff('new@x.in','captain','New Cap','9877777777')`);
t('team changes are audited', (await as(M, 'authenticated', `select 1 from audit_log where action='staff_emails.insert' and target='new@x.in'`)).rows.length === 1);

// ---- analytics
await db.exec(`update orders set picked_up_at = now() - interval '3 days', delivered_at = now() where order_code='X-2'`);   // 72h turnaround → late (SLA 48h)
await as(B, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('X-4','${B}','x',$1,'a',12.9355,77.6052)`, [ITEMS(1)]);
const cancel = (await db.query(`select id from orders where order_code='X-4'`)).rows[0].id; await as(B, 'authenticated', `select cancel_my_order('${cancel}')`);
r = await as(A, 'authenticated', `select admin_analytics(30)`); t('customers cannot read analytics', !r.ok);
r = await as(M, 'authenticated', `select admin_analytics(30) a`); const a = r.rows[0].a;
t('orders 4, delivered 3, cancelled 1', a.orders === 4 && a.delivered === 3 && a.cancelled === 1, JSON.stringify([a.orders, a.delivered, a.cancelled]));
t('revenue = 276 + 138 + 345 = ₹759', Number(a.revenue) === 759, a.revenue);
t('average order value ₹253', Number(a.aov) === 253, a.aov);
t('cancel rate 25%', Number(a.cancel_rate) === 25);
t('customers 2, repeat customers 1 (A ordered twice) → 50%', a.customers === 2 && a.repeat_customers === 1 && Number(a.repeat_rate) === 50, JSON.stringify([a.customers, a.repeat_customers, a.repeat_rate]));
t('one late order flagged against the 48h SLA', a.late === 1, a.late);
t('daily series sums to the totals', a.daily.reduce((s, d) => s + d.orders, 0) === 4 && a.daily.reduce((s, d) => s + Number(d.revenue), 0) === 759);
t('top services lists Wash & Steam Iron with 3 orders', a.top_services[0].name === 'Wash & Steam Iron' && a.top_services[0].orders === 3, JSON.stringify(a.top_services[0]));
t('payment mix shows cash', a.payment_mix.some((m) => m.method === 'cash' && Number(m.amount) === 759));
t('captain stats: 3 deliveries', a.captains.find((c) => c.name === 'Ravi Kumar').deliveries === 3);

// ---- customers
r = await as(M, 'authenticated', `select * from admin_customers(null, 50)`); t('customer list with orders, spend and wallet', r.rows.length === 2 && r.rows.find((x) => x.email === 'cust@x.in').orders === '2' || Number(r.rows.find((x) => x.email === 'cust@x.in').orders) === 2, JSON.stringify(r.rows[0]));
r = await as(M, 'authenticated', `select * from admin_customers('cust2', 50)`); t('search by name/email works', r.rows.length === 1);
t("spend counts delivered orders only (A: 414)", Number((await as(M, 'authenticated', `select spent from admin_customers('cust@', 5)`)).rows[0].spent) === 414);
r = await as(A, 'authenticated', `select * from admin_customers()`); t('customers cannot list customers', !r.ok);

// ---- refunds
r = await as(M, 'authenticated', `select admin_refund_to_wallet('${id1}', 400, 'x')`); t('cannot refund more than was paid (276)', !r.ok, r.err);
const w0 = Number((await as(A, 'authenticated', `select my_wallet_balance() b`)).rows[0].b);
r = await as(M, 'authenticated', `select admin_refund_to_wallet('${id1}', 100, 'bad ironing')`); t('refund ₹100 to wallet', r.ok, r.err);
t('wallet credited', Number((await as(A, 'authenticated', `select my_wallet_balance() b`)).rows[0].b) === w0 + 100);
r = await as(A, 'authenticated', `select admin_refund_to_wallet('${id1}', 10, 'x')`); t('customer cannot issue refunds', !r.ok);
r = await as(M, 'authenticated', `select admin_refund_to_wallet('${id1}', 200, 'x')`); t('cumulative refunds capped (100 + 200 > 276)', !r.ok);
r = await as(A, 'authenticated', `select count(*)::int c from refunds`); t('customer sees own refund', r.rows[0].c === 1);
r = await as(B, 'authenticated', `select count(*)::int c from refunds`); t("not others' refunds", r.rows[0].c === 0);

// online payment refund via gateway path
let o = (await as(B, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, payment_mode, pickup_address, pickup_lat, pickup_lng) values ('X-5','${B}','x',$1,'online','a',12.9355,77.6052) returning id`, [ITEMS(4)])).rows[0].id;
await as('', 'service_role', `select apply_payment('${o}', 276, 'online', 'pay_X5')`);
r = await as('', 'service_role', `select * from refundable_payments('${o}')`); t('refundable payment listed for the gateway', r.rows.length === 1 && Number(r.rows[0].refundable) === 276);
r = await as(M, 'authenticated', `select * from refundable_payments('${o}')`); t('refundable_payments is server-only', !r.ok);
const pid = r.rows[0]?.payment_id || (await db.query(`select id from payments where razorpay_payment_id='pay_X5'`)).rows[0].id;
r = await as('', 'service_role', `select record_refund('${o}','${pid}',100,'rfnd_1','pending','test',null)`); t('record_refund stores a pending refund', r.ok, r.err);
r = await as('', 'service_role', `select * from refundable_payments('${o}')`); t('refundable drops to ₹176', Number(r.rows[0].refundable) === 176);
r = await as('', 'service_role', `select record_refund('${o}','${pid}',100,'rfnd_1','pending','dup',null)`);
t('duplicate refund id is ignored (idempotent)', Number((await db.query(`select refunded_amount from orders where id='${o}'`)).rows[0].refunded_amount) === 100);
await as('', 'service_role', `select update_refund_status('rfnd_1','failed')`);
t('failed gateway refund is reversed and alerts admin', Number((await db.query(`select refunded_amount from orders where id='${o}'`)).rows[0].refunded_amount) === 0 && (await as(M, 'authenticated', `select 1 from ops_alerts where kind='refund_failed'`)).rows.length === 1);
r = await as(A, 'authenticated', `select record_refund('${o}','${pid}',10,'x','pending','x',null)`); t('customers cannot call record_refund', !r.ok);

// ---- reconciliation helper
r = await as('', 'service_role', `select * from reconcile_known_payments(now() - interval '1 day', now() + interval '1 day')`); t('known gateway payments listed for reconciliation', r.rows.some((x) => x.razorpay_payment_id === 'pay_X5' && x.source === 'order'));
r = await as(M, 'authenticated', `select * from reconcile_known_payments(now() - interval '1 day', now())`); t('reconcile helper is server-only', !r.ok);
r = await as(M, 'authenticated', `select admin_set_setting('sla_hours','24')`); t('admin edits the SLA hours', r.ok, r.err);
finish();
