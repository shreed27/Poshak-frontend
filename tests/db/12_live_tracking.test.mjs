import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, cap2: X, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key in ('require_photos','require_job_accept')`);
// customer address ≈ (12.9355, 77.6052)
const place = async (code) => (await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('${code}','${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(4)])).rows[0].id;
const row = async (id) => (await db.query(`select status, assignment, captain_lat, captain_heading, eta_minutes, eta_km, eta_leg, eta_updated_at, near_notified_for, late_alerted_at from orders where id='${id}'`)).rows[0];
const notes = async () => (await db.query(`select title from notifications where user_id='${A}' and kind='tracking' and title like '%almost at your door%'`)).rows.length;

// ---- offered but not accepted: position yes, ETA no
await db.exec(`update app_settings set value='true' where key='require_job_accept'`);
let id = await place('T-1');
await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
let r = await as(C, 'authenticated', `select captain_update_location(12.9500, 77.6200, 90, 20)`); t('rider updates location', r.ok, r.err);
let o = await row(id);
t('position + heading stored while the offer is pending', o.captain_lat === 12.95 && o.captain_heading === 90, JSON.stringify(o));
t('no ETA promised before the rider accepts', o.eta_minutes === null && o.eta_leg === null);
await as(C, 'authenticated', `select captain_accept_job('${id}')`);

// ---- server-side fallback ETA
r = await as(C, 'authenticated', `select captain_update_location(12.9500, 77.6200)`);
o = await row(id);
t('accepted pickup job gets a pickup ETA', o.eta_leg === 'pickup' && o.eta_minutes >= 1 && Number(o.eta_km) > 2, JSON.stringify(o));
const far = o.eta_minutes;
r = await as(C, 'authenticated', `select captain_update_location(12.9400, 77.6100)`); o = await row(id);
t('ETA shrinks as the rider gets closer', o.eta_minutes < far, `${far} → ${o.eta_minutes}`);
t('closer than 350 m? not yet — no "almost there" ping', (await notes()) === 0);

// ---- phone-provided road ETA is used for the targeted order
r = await as(C, 'authenticated', `select captain_update_location(12.9400, 77.6100, 45, 18, '${id}'::uuid, 9, 3.4)`); o = await row(id);
t('road-routed ETA from the phone is stored (9 min, 3.4 km)', o.eta_minutes === 9 && Number(o.eta_km) === 3.4, JSON.stringify(o));
r = await as(C, 'authenticated', `select captain_update_location(12.9400, 77.6100, 45, 18, '${id}'::uuid, 9999, 3.4)`); o = await row(id);
t('absurd phone ETA is ignored in favour of the server estimate', o.eta_minutes !== 9999 && o.eta_minutes < 100, o.eta_minutes);

// ---- arrival notification: once per leg
await as(C, 'authenticated', `select captain_update_location(12.9356, 77.6053)`);
t('"almost at your door" sent when within 350 m', (await notes()) === 1);
await as(C, 'authenticated', `select captain_update_location(12.9355, 77.6052)`);
t('…and not repeated on the next ping', (await notes()) === 1);

// ---- privacy
r = await as(X, 'authenticated', `select captain_update_location(12.0, 77.0)`); o = await row(id);
t('another rider cannot move this order', o.captain_lat !== 12.0);
r = await as(A, 'authenticated', `select captain_update_location(12.9, 77.6)`); t('customers cannot call it', !r.ok, r.err);
r = await as(A, 'authenticated', `select eta_minutes, eta_km, captain_heading from orders where id='${id}'`); t('customer can read the ETA on their own order', r.ok && r.rows[0].eta_minutes != null, r.err);
r = await as(B, 'authenticated', `select eta_minutes from orders where id='${id}'`); t("other customers can't", r.rows.length === 0);
r = await as(C, 'authenticated', `select captain_update_location(95, 77.6)`); t('bad coordinates are rejected', !r.ok, r.err);

// ---- ETA clears and alerts re-arm when the leg changes
await db.exec(`update orders set pickup_lat = pickup_lat where id='${id}'`);
const s = (await db.query(`select pickup_otp from order_secrets where order_id='${id}'`)).rows[0];
await as(C, 'authenticated', `select confirm_pickup('${id}','${s.pickup_otp}',$1)`, [ITEMS(4)]); o = await row(id);
t('ETA is cleared after pickup', o.eta_minutes === null && o.eta_leg === null && o.status === 'picked_up', JSON.stringify(o));
await as(C, 'authenticated', `select start_delivery('${id}')`);
await as(C, 'authenticated', `select captain_update_location(12.9356, 77.6053)`); o = await row(id);
t('delivery leg gets its own ETA', o.eta_leg === 'delivery' && o.eta_minutes >= 1, JSON.stringify(o));
t('and its own "almost there" ping', (await notes()) === 2);
await as(C, 'authenticated', `select collect_cash('${id}')`);
const d = (await db.query(`select delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
await as(C, 'authenticated', `select confirm_delivery('${id}','${d.delivery_otp}')`); o = await row(id);
t('ETA cleared once delivered', o.eta_minutes === null);

// ---- decline clears everything for the next rider
id = await place('T-2');
await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`); await as(C, 'authenticated', `select captain_accept_job('${id}')`);
await as(C, 'authenticated', `select captain_update_location(12.9356, 77.6053)`);
o = await row(id); t('(precondition) ETA and arrival flag were set', o.eta_minutes != null && o.near_notified_for === 'captain_assigned');
await as(M, 'authenticated', `select admin_assign_captain('${id}','${X}')`); o = await row(id);
t('reassigning to another rider clears ETA, heading and re-arms the arrival ping', o.eta_minutes === null && o.near_notified_for === null && o.captain_heading === null, JSON.stringify(o));

// ---- late-rider alert (slot already over)
id = await place('T-3');
await db.exec(`update orders set pickup_date = current_date - 1, pickup_window = '9-11' where id='${id}'`);
await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`); await as(C, 'authenticated', `select captain_accept_job('${id}')`);
await as(C, 'authenticated', `select captain_update_location(12.9500, 77.6200)`);
let al = await as(M, 'authenticated', `select message from ops_alerts where kind='late_rider'`); t('admin is alerted when the rider will miss the slot', al.rows.length === 1, al.rows[0]?.message);
await as(C, 'authenticated', `select captain_update_location(12.9490, 77.6190)`);
al = await as(M, 'authenticated', `select 1 from ops_alerts where kind='late_rider'`); t('…only once', al.rows.length === 1);

// ---- admin tuning
r = await as(M, 'authenticated', `select admin_set_setting('eta_traffic_factor','1.6')`); t('admin can tune the traffic factor', r.ok, r.err);
r = await as(A, 'authenticated', `select admin_set_setting('eta_traffic_factor','1.6')`); t('customers cannot', !r.ok);
finish();
