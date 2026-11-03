import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cap: C, cap2: X, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key in ('require_photos','require_job_accept')`);
const deliver = async (code, qty = 4) => {
  let r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ($2,'${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(qty), code]);
  const id = r.rows[0].id; await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
  await as(C, 'authenticated', `select confirm_pickup('${id}','${s.pickup_otp}',$1)`, [ITEMS(qty)]); await as(C, 'authenticated', `select start_delivery('${id}')`);
  await as(C, 'authenticated', `select collect_cash('${id}')`); await as(C, 'authenticated', `select confirm_delivery('${id}','${s.delivery_otp}')`); return id;
};

// ---- earnings
let id1 = await deliver('E-1'); let r = await as(C, 'authenticated', `select amount from captain_earnings`);
t('delivery earns the default ₹40 fee', r.rows.length === 1 && Number(r.rows[0].amount) === 40);
await as(M, 'authenticated', `select admin_set_setting('captain_fee_per_order', '60')`); await deliver('E-2');
r = await as(C, 'authenticated', `select amount from captain_earnings order by id`); t('fee follows the setting (₹60 for next order)', r.rows.map((x) => Number(x.amount)).join() === '40,60');
await db.exec(`update orders set status='delivered' where id='${id1}'`);                   // re-fire the trigger path
t('earning is created once per order', (await as(C, 'authenticated', `select count(*)::int c from captain_earnings`)).rows[0].c === 2);
r = await as(X, 'authenticated', `select * from captain_earnings`); t("another captain cannot see these earnings", r.rows.length === 0);
r = await as(A, 'authenticated', `select * from captain_earnings`); t('customers cannot see earnings', r.rows.length === 0);
r = await as(C, 'authenticated', `select captain_summary() s`); const s = r.rows[0].s;
t('summary: today ₹100, 2 deliveries', Number(s.today) === 100 && Number(s.deliveries_today) === 2, JSON.stringify(s));
t('summary: cash held = 2 orders paid by cash', Number(s.cash_held) === 276 * 2, s.cash_held);
r = await as(A, 'authenticated', `select captain_summary()`); t('customers cannot call captain_summary', !r.ok);

// ---- tips + rating feed the summary
const tipOrder = (await db.query(`select id from orders where order_code='E-1'`)).rows[0].id;
await as(A, 'authenticated', `select rate_captain('${tipOrder}', 5)`);
await db.exec(`insert into pay_intents(razorpay_order_id,kind,user_id,ref,amount_paise) values ('o_t','tip','${A}','${tipOrder}',5000)`);
await as('', 'service_role', `select apply_intent_payment('o_t','p_t',5000)`);
r = await as(C, 'authenticated', `select captain_summary() s`); t('tip counted in today (₹150) and rating shown', Number(r.rows[0].s.today) === 150 && Number(r.rows[0].s.rating) === 5, JSON.stringify(r.rows[0].s));

// ---- settlement nets cash held against earnings
r = await as(M, 'authenticated', `select admin_captain_balance('${C}') b`); const b = r.rows[0].b;
t('balance: earnings 100 + tips 50 − cash 552 = −402', Number(b.earnings) === 100 && Number(b.tips) === 50 && Number(b.cash_held) === 552 && Number(b.net) === -402, JSON.stringify(b));
r = await as(C, 'authenticated', `select admin_captain_balance('${C}')`); t('captain cannot call admin balance', !r.ok);
r = await as(C, 'authenticated', `select admin_settle_captain('${C}')`); t('captain cannot settle themselves', !r.ok);
r = await as(M, 'authenticated', `select admin_settle_captain('${C}','weekly settlement')`); t('admin settles', r.ok, r.err);
r = await as(C, 'authenticated', `select net, cash_netted from captain_payouts`); t('payout recorded (captain owed us ₹402)', r.rows.length === 1 && Number(r.rows[0].net) === -402);
r = await as(C, 'authenticated', `select captain_summary() s`); t('after settlement nothing is pending and no cash is held', Number(r.rows[0].s.pending_earnings) === 0 && Number(r.rows[0].s.cash_held) === 0);
r = await as(M, 'authenticated', `select admin_settle_captain('${C}')`); t('settling twice with nothing due is rejected', !r.ok, r.err);

// ---- SOS / incidents
r = await as(A, 'authenticated', `select captain_report_incident('sos','help')`); t('customer cannot raise a captain SOS', !r.ok);
r = await as(C, 'authenticated', `select captain_report_incident('sos','Bike skidded near Dairy Circle', 12.9380, 77.6050, null)`); t('captain raises SOS with location', r.ok, r.err);
r = await as(M, 'authenticated', `select severity, message from ops_alerts where kind='incident'`); t('SOS becomes an URGENT admin alert with a map link', r.rows.length === 1 && r.rows[0].severity === 'urgent' && /maps\.google\.com/.test(r.rows[0].message), r.rows[0]?.message);
t('every admin is notified', (await as(M, 'authenticated', `select title from notifications where kind='alert'`)).rows.length >= 1);
await as(C, 'authenticated', `select captain_report_incident('vehicle','flat tyre')`);
r = await as(M, 'authenticated', `select severity from ops_alerts where kind='incident' order by id desc limit 1`); t('vehicle trouble is a warning, not urgent', r.rows[0].severity === 'warn');
r = await as(C, 'authenticated', `select count(*)::int c from incidents`); t('captain sees own incidents', r.rows[0].c === 2);
r = await as(X, 'authenticated', `select count(*)::int c from incidents`); t("other captains cannot see them", r.rows[0].c === 0);
r = await as(C, 'authenticated', `select admin_resolve_incident(1)`); t('captain cannot resolve incidents', !r.ok);
r = await as(M, 'authenticated', `select admin_resolve_incident(1)`); t('admin resolves', r.ok, r.err);
r = await as(M, 'authenticated', `select admin_set_setting('ops_phone','"9800000000"')`); t('admin sets the ops phone', r.ok, r.err);
finish();
