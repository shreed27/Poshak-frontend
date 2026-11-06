import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cap: C, admin: M, cleaner: L } = ID;
await db.exec(`update app_settings set value='false' where key in ('require_photos','require_job_accept')`);
const J = (o) => JSON.stringify(o);

// ---- admin saves full details (before the person has ever signed in)
let r = await as(M, 'authenticated', `select admin_save_partner('new.rider@x.in','captain',$1::jsonb)`, [J({ name: 'Sunil Rao', phone: '+91 98765 43210', vehicle_model: 'Hero Splendor', vehicle_number: 'ka01ab1234', city: 'Bengaluru', pincode: '560029', bank_ifsc: 'hdfc0001234', bank_account: '123456789012', upi_id: 'sunil@okhdfc', license_expiry: '2027-03-01', work_days: [1, 2, 3, 4, 5], fee_override: 55 })]);
t('admin creates a rider with full details', r.ok, r.err);
r = await db.query(`select e.name, e.phone, e.vehicle, p.status, p.kyc_status, p.payout_cycle, p.bank_ifsc, p.vehicle_number, p.fee_override, p.work_days from staff_emails e join staff_profiles p using (email) where email='new.rider@x.in'`);
t('details stored, phone normalised, vehicle line built for customers', r.rows[0].phone === '9876543210' && r.rows[0].vehicle === 'Hero Splendor · KA01AB1234' && r.rows[0].bank_ifsc === 'HDFC0001234' && r.rows[0].status === 'active' && r.rows[0].kyc_status === 'pending' && r.rows[0].payout_cycle === 'weekly', J(r.rows[0]).slice(110));
r = await as(M, 'authenticated', `select admin_save_partner('bad@x.in','captain',$1::jsonb)`, [J({ name: 'X', phone: '9876543210', bank_ifsc: 'NOPE' })]); t('bad IFSC rejected', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_save_partner('bad@x.in','captain',$1::jsonb)`, [J({ name: 'X', phone: '9876543210', id_type: 'aadhaar', id_number: '123412341234' })]); t('full Aadhaar number refused (last 4 only)', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_save_partner('bad@x.in','captain',$1::jsonb)`, [J({ name: 'X', phone: '12345' })]); t('bad phone rejected', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_save_partner('bad@x.in','cleaner',$1::jsonb)`, [J({ name: 'X', phone: '9876543210', gstin: '123' })]); t('bad GSTIN rejected', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_save_partner('new.rider@x.in','cleaner',$1::jsonb)`, [J({ name: 'Sunil', phone: '9876543210' })]); t('cannot silently change a person’s role', !r.ok, r.err);
r = await as(A, 'authenticated', `select admin_save_partner('x@x.in','captain',$1::jsonb)`, [J({ name: 'X', phone: '9876543210' })]); t('customers cannot create partners', !r.ok);
r = await as(C, 'authenticated', `select admin_save_partner('x@x.in','captain',$1::jsonb)`, [J({ name: 'X', phone: '9876543210' })]); t('riders cannot create partners', !r.ok);

// ---- privacy: partner sees own profile without admin-only data
await as(M, 'authenticated', `select admin_save_partner('cap@x.in','captain',$1::jsonb)`, [J({ name: 'Ravi Kumar', phone: '9822222222', bank_account: '999988887777', notes: 'late twice', kyc_notes: 'blurry photo', tags: ['night'], emergency_name: 'Mum', emergency_phone: '9000000000' })]);
r = await as(C, 'authenticated', `select my_partner_profile() p`); const me = r.rows[0]?.p || {};
t('rider reads own profile', r.ok && me.emergency_name === 'Mum', r.err);
t('own profile hides notes, KYC remarks and full account number', me.notes === undefined && me.kyc_notes === undefined && me.bank_account === undefined && me.bank_last4 === '7777', J(me));
r = await as(C, 'authenticated', `select * from staff_profiles`); t('riders cannot read the staff_profiles table', r.rows.length === 0);
r = await as(M, 'authenticated', `select * from staff_profiles`); t('admin can read it', r.rows.length >= 2);
r = await as(C, 'authenticated', `select partner_update_profile('9811112222','12 MG Road','Dad','9000000001')`); t('rider updates contact + emergency details', r.ok, r.err);
r = await db.query(`select alt_phone, emergency_name, bank_account, notes from staff_profiles where email='cap@x.in'`); t('self-update touches only allowed fields', r.rows[0].alt_phone === '9811112222' && r.rows[0].emergency_name === 'Dad' && r.rows[0].bank_account === '999988887777' && r.rows[0].notes === 'late twice');
r = await as(A, 'authenticated', `select partner_update_profile('9811112222','x','y','9000000001')`); t('customers cannot use the partner profile update', !r.ok);

// ---- suspend / pause
r = await as(M, 'authenticated', `select admin_set_partner_status('cap@x.in','paused','on leave')`); t('admin pauses a rider', r.ok, r.err);
await as(C, 'authenticated', `select captain_set_online(true)`); await as(C, 'authenticated', `select captain_update_location(12.9360, 77.6055)`);
await db.exec(`update profiles set is_online = true, last_seen_at = now() where id='${C}'`);
let id = (await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('P-1','${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(4)])).rows[0].id;
r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('paused rider is skipped by auto-assign', r.rows[0].p === null, r.rows[0]?.p);
await as(M, 'authenticated', `select admin_set_partner_status('cap@x.in','active')`); await db.exec(`update profiles set is_online = true, last_seen_at = now() where id='${C}'`);
r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('active again → assigned', r.rows[0].p === C, r.rows[0]?.p);
r = await as(M, 'authenticated', `select admin_set_partner_status('cap@x.in','suspended','complaints')`); t('admin suspends', r.ok, r.err);
r = await as(C, 'authenticated', `select captain_set_online(true)`); t('suspended rider loses server access immediately', !r.ok, r.err);
r = await as(C, 'authenticated', `select claim_staff_role() r`); t('claim_staff_role returns customer for suspended', r.rows[0].r === 'customer', r.rows[0]?.r);
await as(M, 'authenticated', `select admin_set_partner_status('cap@x.in','active')`);
r = await as(C, 'authenticated', `select claim_staff_role() r`); t('reinstated rider is a captain again', r.rows[0].r === 'captain', r.rows[0]?.r);
r = await as(M, 'authenticated', `select admin_set_partner_status('admin@x.in','suspended')`); t('admin cannot suspend themselves', !r.ok, r.err);
t('status changes are audited', (await as(M, 'authenticated', `select 1 from audit_log where action='staff_profiles.update'`)).rows.length >= 1);

// ---- per-rider fee override
await as(M, 'authenticated', `select admin_save_partner('cap@x.in','captain',$1::jsonb)`, [J({ name: 'Ravi Kumar', phone: '9822222222', fee_override: 70 })]);
await db.exec(`update orders set status='cancelled' where id='${id}'`);
const deliver = async (code) => {
  const oid = (await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('${code}','${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(4)])).rows[0].id;
  await as(M, 'authenticated', `select admin_assign_captain('${oid}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${oid}'`)).rows[0];
  await as(C, 'authenticated', `select confirm_pickup('${oid}','${s.pickup_otp}',$1)`, [ITEMS(4)]); return { oid, s };
};
let o1 = await deliver('F-1');
await as(C, 'authenticated', `select start_delivery('${o1.oid}')`); await as(C, 'authenticated', `select collect_cash('${o1.oid}')`); await as(C, 'authenticated', `select confirm_delivery('${o1.oid}','${o1.s.delivery_otp}')`);
r = await db.query(`select amount from captain_earnings where order_id='${o1.oid}'`); t('rider earns their personal fee (₹70), not the default', Number(r.rows[0]?.amount) === 70, r.rows[0]?.amount);

// ---- laundromats
await as(M, 'authenticated', `select admin_save_partner('clean@x.in','cleaner',$1::jsonb)`, [J({ name: 'Clean Co', phone: '9833333333', business_name: 'Clean Co Laundry', gstin: '29ABCDE1234F1Z5', capacity_kg_per_day: 200, max_active_jobs: 2, payout_per_kg: 12, payout_per_order: 5, services: [] })]);
await as(M, 'authenticated', `select admin_save_partner('cleaner2@x.in','cleaner',$1::jsonb)`, [J({ name: 'Wash Hub', phone: '9844444444', business_name: 'Wash Hub', payout_per_kg: 10, services: ['wash-iron'] })]);
const L2 = '00000000-0000-0000-0000-0000000000c2';
await db.exec(`insert into auth.users(id,email) values ('${L2}','cleaner2@x.in') on conflict do nothing`);
r = await as(L, 'authenticated', `select claim_staff_role() r`); t('laundromat signs in as cleaner', r.rows[0].r === 'cleaner', r.rows[0]?.r);

let o2 = await deliver('L-1');
r = await as(L, 'authenticated', `select * from cleaner_queue()`); t('unassigned picked-up order is in the open pool for laundromats', r.rows.some((x) => x.order_code === 'L-1' && !x.assigned_to_me), r.err);
r = await as(M, 'authenticated', `select admin_assign_cleaner('${o2.oid}','${L}')`); t('admin assigns the order to a laundromat', r.ok, r.err);
r = await as(L2, 'authenticated', `select * from cleaner_queue()`); t('other laundromat no longer sees it', !r.rows.some((x) => x.order_code === 'L-1'), r.err);
r = await as(L2, 'authenticated', `select cleaner_receive('${o2.oid}', 4)`); t('other laundromat cannot receive it', !r.ok, r.err);
r = await as(L, 'authenticated', `select cleaner_receive('${o2.oid}', 4)`); t('assigned laundromat receives it', r.ok, r.err);
r = await as(L, 'authenticated', `select cleaner_ready('${o2.oid}', 4)`); t('and marks it ready', r.ok, r.err);
r = await db.query(`select e.kg, e.pieces, e.amount, o.cleaner_id from cleaner_earnings e join orders o on o.id=e.order_id where o.order_code='L-1'`);
t('earning = ₹12/kg × 4kg + ₹5 per order = ₹53', r.rows.length === 1 && Number(r.rows[0].amount) === 53 && Number(r.rows[0].kg) === 4, J(r.rows[0]));
r = await as(L, 'authenticated', `select cleaner_summary() s`); const s = r.rows[0]?.s || {};
t('summary shows ready jobs, today’s earnings and pending payout', Number(s.ready) === 1 && Number(s.earn_today) === 53 && Number(s.pending_payout) === 53 && Number(s.done_today) === 1, J(s));
r = await as(L2, 'authenticated', `select * from cleaner_earnings`); t('laundromats cannot see each other’s earnings', r.rows.length === 0);
r = await as(M, 'authenticated', `select admin_cleaner_balance('${L}') b`); t('admin sees balance owed ₹53', Number(r.rows[0]?.b?.owed) === 53, J(r.rows[0]));
r = await as(L, 'authenticated', `select admin_settle_cleaner('${L}')`); t('laundromat cannot settle itself', !r.ok);
r = await as(M, 'authenticated', `select admin_settle_cleaner('${L}','weekly')`); t('admin settles', r.ok, r.err);
r = await as(M, 'authenticated', `select admin_cleaner_balance('${L}') b`); t('balance is zero after settling', Number(r.rows[0]?.b?.owed) === 0);
r = await as(M, 'authenticated', `select admin_settle_cleaner('${L}')`); t('nothing left to settle', !r.ok, r.err);
r = await as(L, 'authenticated', `select * from cleaner_history(30)`); t('history lists the finished job with its earning', r.rows.length === 1 && Number(r.rows[0].amount) === 53, r.err);
r = await as(L, 'authenticated', `select * from cleaner_payouts`); t('laundromat sees its payout record', r.rows.length === 1);

// service restriction: Wash Hub only does wash-iron
let o3 = await deliver('L-2');
r = await as(M, 'authenticated', `select admin_assign_cleaner('${o3.oid}','${L2}')`); t('wash-iron order CAN go to the wash-iron-only laundromat', r.ok, r.err);
const wf = (await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('L-WF','${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(2, 'wash-fold')])).rows[0].id;
r = await as(M, 'authenticated', `select admin_assign_cleaner('${wf}','${L2}')`); t('wash-fold order cannot go to a wash-iron-only laundromat', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_assign_cleaner('${wf}','${L}')`); t('…but can go to an all-services laundromat', r.ok, r.err);
// auto-assign: least loaded, respects capacity + status
await as(M, 'authenticated', `select admin_set_setting('laundry_auto_assign','true')`);
let o4 = await deliver('L-3');
r = await db.query(`select cleaner_id from orders where order_code='L-3'`); t('auto-assign picks a laundromat when the clothes are picked up', r.rows[0].cleaner_id === L || r.rows[0].cleaner_id === L2, r.rows[0]?.cleaner_id);
await as(M, 'authenticated', `select admin_set_partner_status('clean@x.in','paused')`); await as(M, 'authenticated', `select admin_set_partner_status('cleaner2@x.in','paused')`);
let o5 = await deliver('L-4');
r = await db.query(`select cleaner_id from orders where order_code='L-4'`); t('paused laundromats are never auto-assigned', r.rows[0].cleaner_id === null, r.rows[0]?.cleaner_id);
t('admin alerted when no laundromat is available', (await as(M, 'authenticated', `select 1 from ops_alerts where kind='no_laundry'`)).rows.length === 1);
r = await as(L, 'authenticated', `select * from cleaner_queue()`); t('paused laundromat does not see the open pool', !r.rows.some((x) => x.order_code === 'L-4'), r.err);
r = await as(L, 'authenticated', `select cleaner_receive('${o5.oid}', 4)`); t('paused laundromat cannot claim new orders', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_assign_cleaner('${o5.oid}', null)`); t('admin can unassign', r.ok, r.err);
r = await as(L, 'authenticated', `select admin_assign_cleaner('${o5.oid}','${L}')`); t('laundromats cannot assign orders', !r.ok);
finish();
