import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, cap2: X, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key='require_photos'`);
const place = async (uid, code, extra = '') => (await as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng ${extra ? ',' + extra.split('=')[0] : ''}) values ($2,'${uid}','x',$1,'a',12.9355,77.6052 ${extra ? ',' + extra.split('=')[1] : ''}) returning id`, [ITEMS(4), code])).rows[0].id;
const row = async (id) => (await db.query(`select status, assignment, captain_id, declined_by, failed_attempts, reschedule_count, delivery_slot, pickup_slot from orders where id='${id}'`)).rows[0];
const otp = async (id) => (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];

// ---- offers
let id = await place(A, 'D-1');
await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
let o = await row(id); t('assignment is an OFFER (status captain_assigned, assignment offered)', o.status === 'captain_assigned' && o.assignment === 'offered');
let r = await as(C, 'authenticated', `select confirm_pickup('${id}','${(await otp(id)).pickup_otp}',$1)`, [ITEMS(4)]); t('cannot start the job before accepting', !r.ok, r.err);
r = await as(X, 'authenticated', `select captain_accept_job('${id}')`); t("another captain cannot accept someone else's offer", !r.ok);
r = await as(C, 'authenticated', `select captain_accept_job('${id}')`); t('captain accepts', r.ok, r.err);
r = await as(C, 'authenticated', `select confirm_pickup('${id}','${(await otp(id)).pickup_otp}',$1)`, [ITEMS(4)]); t('pickup works after accepting', r.ok, r.err);

// ---- decline → back to queue, admin alerted
id = await place(A, 'D-2'); await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
r = await as(C, 'authenticated', `select captain_decline_job('${id}','too far')`); t('captain declines', r.ok, r.err);
o = await row(id); t('declined order returns to the queue unassigned', o.status === 'placed' && o.assignment === 'unassigned' && o.captain_id === null && o.declined_by.includes(C));
t('admin alerted about the decline', (await as(M, 'authenticated', `select message from ops_alerts where kind='job_declined'`)).rows.length === 1);

// ---- expiry
id = await place(A, 'D-3'); await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
await db.exec(`update orders set offered_at = now() - interval '10 minutes' where id='${id}'`);
r = await as(M, 'authenticated', `select expire_stale_offers() n`); t('stale offer (10 min, limit 5) expires', r.ok && r.rows[0].n === 1, r.err);
o = await row(id); t('expired offer back in queue', o.status === 'placed' && o.assignment === 'unassigned');
id = await place(A, 'D-4'); await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
r = await as(M, 'authenticated', `select expire_stale_offers() n`); t('fresh offer is not expired', r.rows[0].n === 0);

// ---- auto-assign
await db.exec(`update orders set status='cancelled' where status not in ('delivered','cancelled')`);   // clean slate: nobody is busy
id = await place(A, 'D-5');
r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('no online captain → nobody assigned + urgent alert', r.rows[0].p === null && (await as(M, 'authenticated', `select 1 from ops_alerts where kind='no_captain'`)).rows.length === 1);
await as(C, 'authenticated', `select captain_set_online(true)`); await as(X, 'authenticated', `select captain_set_online(true)`);
await as(C, 'authenticated', `select captain_update_location(12.9360, 77.6055)`);      // ~60 m away
await as(X, 'authenticated', `select captain_update_location(12.9700, 77.6400)`);      // ~5 km away
r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('nearest online captain is chosen', r.rows[0].p === C, r.rows[0].p);
r = await as(A, 'authenticated', `select captain_name, assignment from orders where id='${id}'`); t('customer sees the assigned captain', r.rows[0].captain_name === 'Ravi Kumar' && r.rows[0].assignment === 'offered');
await db.exec(`update orders set status='cancelled' where id='${id}'`);
// workload beats distance: give C two active jobs
const j1 = await place(B, 'D-6'); const j2 = await place(B, 'D-7');
await as(M, 'authenticated', `select admin_assign_captain('${j1}','${C}')`); await as(M, 'authenticated', `select admin_assign_captain('${j2}','${C}')`);
id = await place(A, 'D-8');
r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('least-busy captain wins over nearest (C has 2 jobs)', r.rows[0].p === X, r.rows[0].p);
r = await as(C, 'authenticated', `select captain_set_online(false)`); await db.exec(`update orders set status='cancelled' where id='${id}'`);
id = await place(A, 'D-9'); r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('offline captain is skipped', r.rows[0].p === X);
await db.exec(`update orders set status='cancelled' where id='${id}'`);
await as(M, 'authenticated', `select admin_set_setting('auto_assign','true')`); await as(C, 'authenticated', `select captain_set_online(true)`);
id = await place(A, 'D-10'); o = await row(id); t('auto_assign setting assigns new orders on creation', o.status === 'captain_assigned' && o.captain_id !== null);
await as(M, 'authenticated', `select admin_set_setting('auto_assign','false')`);
id = await place(A, 'D-11'); await db.exec(`update orders set declined_by = array['${C}'::uuid, '${X}'::uuid] where id='${id}'`);
r = await as(M, 'authenticated', `select admin_auto_assign('${id}') p`); t('captains who already declined are skipped', r.rows[0].p === null);

// ---- reschedule pickup
const tom = "current_date + 1";
id = await place(A, 'R-1');
r = await as(A, 'authenticated', `select reschedule_pickup('${id}', ${tom}, '9-11')`); t('customer reschedules pickup', r.ok, r.err);
o = await row(id); t('slot label rebuilt', /9:00 AM - 11:00 AM/.test(o.pickup_slot) && o.reschedule_count === 1, o.pickup_slot);
r = await as(B, 'authenticated', `select reschedule_pickup('${id}', ${tom}, '9-11')`); t("cannot reschedule someone else's order", !r.ok);
r = await as(A, 'authenticated', `select reschedule_pickup('${id}', current_date - 1, '9-11')`); t('past date rejected', !r.ok);
r = await as(A, 'authenticated', `select reschedule_pickup('${id}', ${tom}, '3-4')`); t('invalid window rejected', !r.ok);
await as(A, 'authenticated', `select reschedule_pickup('${id}', ${tom}, '11-13')`);
r = await as(A, 'authenticated', `select reschedule_pickup('${id}', ${tom}, '13-15')`); t('reschedule limit (2) enforced', !r.ok, r.err);
await as(M, 'authenticated', `select admin_set_setting('max_orders_per_slot','1')`);
const id2 = await place(B, 'R-2'); await db.exec(`update orders set pickup_date = current_date + 2, pickup_window='15-17' where id='${id2}'`);
const id3 = await place(A, 'R-3');
r = await as(A, 'authenticated', `select reschedule_pickup('${id3}', current_date + 2, '15-17')`); t('reschedule respects slot capacity', !r.ok && /full/.test(r.err), r.err);
await db.exec(`update orders set status='picked_up' where id='${id3}'`);
r = await as(A, 'authenticated', `select reschedule_pickup('${id3}', current_date + 3, '15-17')`); t('cannot reschedule pickup after pickup', !r.ok);

// ---- no-show at pickup
id = await place(A, 'N-1'); await as(M, 'authenticated', `select admin_assign_captain('${id}','${X}')`); await as(X, 'authenticated', `select captain_accept_job('${id}')`);
r = await as(C, 'authenticated', `select captain_report_no_show('${id}','pickup')`); t("other captain cannot report on someone else's job", !r.ok);
r = await as(X, 'authenticated', `select captain_report_no_show('${id}','pickup','phone switched off')`); t('captain reports customer unavailable at pickup', r.ok, r.err);
o = await row(id); t('attempt counted, status unchanged', o.failed_attempts === 1 && o.status === 'captain_assigned');
t('customer told to reschedule', (await as(A, 'authenticated', `select title from notifications`)).rows.some((n) => /could not reach/i.test(n.title)));
r = await as(M, 'authenticated', `select severity from ops_alerts where kind='no_show' order by id desc limit 1`); t('first no-show is a warning', r.rows[0].severity === 'warn');
await as(X, 'authenticated', `select captain_report_no_show('${id}','pickup')`);
r = await as(M, 'authenticated', `select severity from ops_alerts where kind='no_show' order by id desc limit 1`); t('second failed attempt escalates to urgent', r.rows[0].severity === 'urgent');
r = await as(A, 'authenticated', `select count(*)::int c from order_attempts where order_id='${id}'`); t('customer can see the attempts log', r.rows[0].c === 2);

// ---- no-show at delivery + delivery reschedule
id = await place(B, 'N-2'); await as(M, 'authenticated', `select admin_assign_captain('${id}','${X}')`); await as(X, 'authenticated', `select captain_accept_job('${id}')`);
await as(X, 'authenticated', `select confirm_pickup('${id}','${(await otp(id)).pickup_otp}',$1)`, [ITEMS(4)]); await as(X, 'authenticated', `select start_delivery('${id}')`);
r = await as(X, 'authenticated', `select captain_report_no_show('${id}','delivery','nobody home')`); t('delivery no-show recorded', r.ok, r.err);
o = await row(id); t('order returns to "ready" awaiting a new delivery slot', o.status === 'ready' && o.failed_attempts === 1);
r = await as(B, 'authenticated', `select reschedule_delivery('${id}', current_date + 1, '17-19')`); t('customer picks a new delivery window', r.ok, r.err);
o = await row(id); t('delivery slot stored', /5:00 PM - 7:00 PM/.test(o.delivery_slot), o.delivery_slot);
r = await as(A, 'authenticated', `select reschedule_delivery('${id}', current_date + 1, '17-19')`); t("others cannot set someone's delivery slot", !r.ok);
finish();
