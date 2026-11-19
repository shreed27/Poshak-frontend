import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M, cleaner: L } = ID;
await db.exec(`update app_settings set value='false' where key in ('require_photos','require_job_accept')`);
const place = async (code, uid = A) => (await as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('${code}','${uid}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(4)])).rows[0].id;

// ---- error log
let r = await as(null, 'anon', `select log_client_error('Cannot read x of undefined', E'Error\\n at foo (a.js:1)', 'http://x/#/admin', '{"k":1}'::jsonb, 'UA')`); t('a signed-out browser can report an error', r.ok, r.err);
await as(A, 'authenticated', `select log_client_error('Cannot read x of undefined', E'Error\\n at foo (a.js:1)', 'http://x/', null, 'UA')`);
r = await as(M, 'authenticated', `select message, count, role from client_errors`); t('same error is deduplicated and counted', r.rows.length === 1 && r.rows[0].count === 2, JSON.stringify(r.rows));
r = await as(A, 'authenticated', `select * from client_errors`); t('customers cannot read the error log', r.rows.length === 0);
r = await as(null, 'anon', `select * from client_errors`); t('neither can anonymous visitors', !r.ok || r.rows.length === 0);
await db.exec(`insert into client_errors (fingerprint, message, last_seen) select 'f'||g, 'spam', now() from generate_series(1,301) g`);
r = await as(null, 'anon', `select log_client_error('another new error')`); const n = (await db.query(`select count(*)::int n from client_errors where message='another new error'`)).rows[0].n; t('flood protection drops new errors past 300/min', r.ok && n === 0, n);
await db.exec(`delete from client_errors where message='spam'`);
const eid = (await db.query(`select id from client_errors limit 1`)).rows[0].id;
r = await as(M, 'authenticated', `select admin_resolve_error(${eid})`); t('admin resolves an error', r.ok, r.err);
r = await as(A, 'authenticated', `select admin_resolve_error(${eid})`); t('customers cannot', !r.ok);

// ---- partner documents
r = await as(C, 'authenticated', `select register_partner_doc('cap@x.in','licence','cap@x.in/licence-1.jpg') id`); t('rider registers a document in their own folder', r.ok, r.err);
r = await as(C, 'authenticated', `select register_partner_doc('cap@x.in','licence','other@x.in/licence-2.jpg')`); t("…but not in someone else's folder", !r.ok, r.err);
r = await as(C, 'authenticated', `select register_partner_doc('cap2@x.in','licence','cap2@x.in/l.jpg')`); t("rider cannot upload for another partner", !r.ok, r.err);
r = await as(A, 'authenticated', `select register_partner_doc('cap@x.in','licence','cap@x.in/x.jpg')`); t('customers cannot', !r.ok);
r = await as(C, 'authenticated', `select status from partner_docs`); t('uploaded document starts pending review', r.rows.length === 1 && r.rows[0].status === 'pending');
t('admins are told about it', (await as(M, 'authenticated', `select 1 from notifications where kind='partner_doc'`)).rows.length >= 1);
r = await as(M, 'authenticated', `select register_partner_doc('clean@x.in','trade_licence','clean@x.in/tl.jpg') id`); t('admin can upload on behalf (auto-verified)', r.ok, r.err);
r = await as(L, 'authenticated', `select * from partner_docs`); t("laundromat sees only its own documents", r.rows.length === 1 && r.rows[0].email === 'clean@x.in');
r = await as(M, 'authenticated', `select admin_review_doc(${(await db.query(`select id from partner_docs where email='cap@x.in'`)).rows[0].id}, 'verified', 'ok')`); t('admin verifies', r.ok, r.err);
r = await as(C, 'authenticated', `select admin_review_doc(1, 'verified')`); t('riders cannot verify their own documents', !r.ok);
r = await as(C, 'authenticated', `select status from partner_docs`); t('rider sees it as verified', r.rows[0].status === 'verified');

// ---- share link
let id = await place('S-1');
r = await as(A, 'authenticated', `select create_share_link('${id}') tok`); const tok = r.rows[0]?.tok; t('customer creates a share link', r.ok && tok?.length >= 24, r.err);
r = await as(A, 'authenticated', `select create_share_link('${id}') tok`); t('link is stable (same token again)', r.rows[0].tok === tok);
r = await as(B, 'authenticated', `select create_share_link('${id}')`); t("another customer cannot create a link for it", !r.ok, r.err);
r = await as(null, 'anon', `select public_track('${tok}') j`); let j = r.rows[0]?.j; t('anyone with the link can read tracking (signed out)', r.ok && j.status === 'placed' && j.rider === null, r.err);
t('destination is rounded to ~100 m', Number(j.dest.lat) === 12.936 && Number(j.dest.lng) === 77.605, JSON.stringify(j.dest));
t('no personal data leaks (no name/phone/address/order code)', !/Asha|phone|address|order_code|customer|S-1|a$/.test(JSON.stringify(Object.keys(j)).replace(/"/g, '')) && !('customer_name' in j) && !('order_code' in j), Object.keys(j).join(','));
r = await as(null, 'anon', `select public_track('nope') j`); t('bad token returns nothing', r.rows[0].j === null);
r = await as(null, 'anon', `select public_track('${tok.slice(0, -1)}x') j`); t('guessing a token fails', r.rows[0].j === null);
await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`); await as(C, 'authenticated', `select captain_update_location(12.9400, 77.6100, 40, 18, '${id}'::uuid, 8, 1.5)`);
r = await as(null, 'anon', `select public_track('${tok}') j`); j = r.rows[0].j; t('shows rider first name, position and ETA', j.rider?.first_name === 'Ravi' && j.rider.lat === 12.94 && j.eta?.minutes === 8, JSON.stringify(j).slice(0, 200));
t('rider surname/phone are not exposed', !JSON.stringify(j).includes('Kumar') && !JSON.stringify(j).includes('9822222222'));
await as(A, 'authenticated', `select revoke_share_link('${id}')`); r = await as(null, 'anon', `select public_track('${tok}') j`); t('revoking the link kills it', r.rows[0].j === null);

// ---- 10-minute heads-up
id = await place('S-2'); await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
const notes = async (like) => (await db.query(`select title from notifications where user_id='${A}' and kind='tracking' and order_id='${id}' and title like '${like}'`)).rows.length;
await as(C, 'authenticated', `select captain_update_location(12.9700, 77.6400, null, null, '${id}'::uuid, 25, 7.0)`);
t('no heads-up while 25 min away', (await notes('%min away')) === 0);
await as(C, 'authenticated', `select captain_update_location(12.9420, 77.6120, null, null, '${id}'::uuid, 9, 2.0)`);
t('"about 9 min away" sent at ≤10 min', (await notes('%about 9 min away')) === 1);
await as(C, 'authenticated', `select captain_update_location(12.9410, 77.6110, null, null, '${id}'::uuid, 8, 1.8)`);
t('…once only', (await notes('%min away')) === 1);
await as(C, 'authenticated', `select captain_update_location(12.9356, 77.6053)`);
t('then the "almost at your door" ping still follows', (await notes('%almost at your door')) === 1);

// ---- daily summary
await db.exec(`insert into payments (order_id, method, amount) select id, 'cash', 100 from orders limit 1`);
r = await as(M, 'authenticated', `select admin_send_daily_summary() s`); t('admin can send the summary now', r.ok && r.rows[0].s.orders >= 0, r.err);
t('admins receive it as a notification', (await as(M, 'authenticated', `select title, body from notifications where kind='summary'`)).rows.length >= 1);
r = await as(A, 'authenticated', `select admin_send_daily_summary()`); t('customers cannot trigger it', !r.ok);
r = await as(A, 'authenticated', `select send_daily_summary()`); t('send_daily_summary is server-only', !r.ok);
r = await db.query(`select build_daily_summary(current_date) s`); t('summary builds for any day', r.rows[0].s.day != null && 'stuck_orders' in r.rows[0].s);

// ---- reconciliation
await db.exec(`update orders set status='cancelled'`);
const oid = await place('R-1');
await db.exec(`insert into payments (order_id, method, amount, razorpay_payment_id) values ('${oid}','online', 300, 'pay_A'), ('${oid}','upi_qr', 120, 'pay_B')`);
r = await db.query(`select record_reconciliation(now() - interval '1 day', now() + interval '1 day', $1::jsonb, null) id`, [JSON.stringify([{ id: 'pay_A', amount: 300, status: 'captured' }, { id: 'pay_C', amount: 99, status: 'captured' }, { id: 'pay_F', amount: 50, status: 'failed' }])]);
r = await as(M, 'authenticated', `select * from reconciliation_runs`); const run = r.rows[0];
t('finds a Razorpay payment we have no record of', run.missing_in_db.length === 1 && run.missing_in_db[0].id === 'pay_C', JSON.stringify(run.missing_in_db));
t('finds a recorded payment Razorpay does not list', run.missing_at_gateway.some((x) => x.id === 'pay_B'), JSON.stringify(run.missing_at_gateway));
t('failed gateway payments are ignored', !JSON.stringify(run.missing_in_db).includes('pay_F'));
t('run is flagged not-OK, urgent alert raised', run.ok === false && (await as(M, 'authenticated', `select 1 from ops_alerts where kind='reconciliation'`)).rows.length === 1);
await db.query(`select record_reconciliation(now() - interval '1 day', now() + interval '1 day', $1::jsonb, null)`, [JSON.stringify([{ id: 'pay_A', amount: 301, status: 'captured' }, { id: 'pay_B', amount: 120 }])]);
r = await as(M, 'authenticated', `select amount_mismatch, ok from reconciliation_runs order by id desc limit 1`); t('amount differences are caught', r.rows[0].amount_mismatch.length === 1 && r.rows[0].amount_mismatch[0].ours == 300 && r.rows[0].ok === false, JSON.stringify(r.rows[0]));
await db.exec(`insert into payments (order_id, method, amount, razorpay_payment_id) values ('${oid}','online', 77, 'pay_Z')`);
await db.query(`delete from payments where razorpay_payment_id in ('pay_B','pay_Z')`);
await db.query(`select record_reconciliation(now() - interval '1 day', now() + interval '1 day', $1::jsonb, null)`, [JSON.stringify([{ id: 'pay_A', amount: 300 }])]);
r = await as(M, 'authenticated', `select ok from reconciliation_runs order by id desc limit 1`); t('a clean day reconciles OK', r.rows[0].ok === true);
r = await as(A, 'authenticated', `select * from reconciliation_runs`); t('customers cannot read reconciliation', r.rows.length === 0);
r = await as(M, 'authenticated', `select record_reconciliation(now(), now(), '[]'::jsonb, null)`); t('record_reconciliation is server-only', !r.ok);
finish();
