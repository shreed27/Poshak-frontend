import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
await db.exec(`update app_settings set value='false' where key='require_job_accept'`);
const { cust: A, cap: C, cap2: X, admin: M, cleaner: L } = ID;
const place = async (code) => {
  const r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ($2,'${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(4), code]);
  const id = r.rows[0].id; await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
  return { id, ...s };
};
const CHECK = JSON.stringify([{ type: 'Shirts', count: 3 }, { type: 'Trousers', count: 2, note: 'ink stain' }]);

// ---- roles
t('cleaner email becomes cleaner', (await db.query(`select role from profiles where id='${L}'`)).rows[0].role === 'cleaner');
let r = await as(L, 'authenticated', `select * from orders`); t('cleaner has NO direct access to orders', r.ok && r.rows.length === 0);
r = await as(L, 'authenticated', `select * from cleaner_queue()`); t('cleaner can call queue (empty at first)', r.ok && r.rows.length === 0, r.err);
r = await as(A, 'authenticated', `select * from cleaner_queue()`); t('customer CANNOT call cleaner queue', !r.ok);
r = await as(M, 'authenticated', `select admin_add_staff('clean2@x.in','cleaner','Laundry Two','9855555555')`); t('admin can add a cleaner', r.ok, r.err);

// ---- pickup requires count + photo (default require_photos = true)
let o = await place('G-1');
r = await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1)`, [ITEMS(4)]); t('pickup without count/photo is rejected', !r.ok, r.err);
r = await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1,5,$2,null,$3)`, [ITEMS(4), CHECK, JSON.stringify([`${o.id}/pickup-1.jpg`])]); t('pickup with 5 pieces + photo accepted', r.ok, r.err);
r = await as(A, 'authenticated', `select piece_count, checklist, photos from order_checks where order_id='${o.id}' and stage='pickup'`); t('customer can read the pickup checklist', r.rows.length === 1 && r.rows[0].piece_count === 5 && r.rows[0].checklist.length === 2);
r = await as(X, 'authenticated', `select * from order_checks`); t('other captain cannot read checks', r.rows.length === 0);

o = await place('G-2');
r = await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1,5,'[]',null,$2)`, [ITEMS(4), JSON.stringify(['someone-elses-order/photo.jpg'])]); t("photo paths outside the order's folder rejected", !r.ok, r.err);
r = await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1,5,'[]',null,$2)`, [ITEMS(4), JSON.stringify([`${o.id}/../x.jpg`])]); t('path traversal rejected', !r.ok);

// ---- cleaner flow with mismatch detection
const g1 = (await db.query(`select id from orders where order_code='G-1'`)).rows[0].id;
r = await as(L, 'authenticated', `select * from cleaner_queue()`); t('cleaner sees the picked-up order (no address/phone columns)', r.rows.length === 1 && !('pickup_address' in r.rows[0]) && !('customer_phone' in r.rows[0]));
r = await as(L, 'authenticated', `select cleaner_receive('${g1}', 0)`); t('cleaner must count garments', !r.ok);
r = await as(L, 'authenticated', `select cleaner_receive('${g1}', 4, 'one shirt missing')`); t('cleaner receives 4 of 5 pieces', r.ok, r.err);
r = await as(M, 'authenticated', `select kind, severity, message from ops_alerts`); t('count mismatch raises an URGENT admin alert', r.rows.length === 1 && r.rows[0].kind === 'count_mismatch' && r.rows[0].severity === 'urgent', r.rows[0]?.message);
r = await as(A, 'authenticated', `select * from ops_alerts`); t('customer cannot read alerts', r.rows.length === 0);
r = await as(C, 'authenticated', `select start_delivery('${g1}')`); t('delivery can start while cleaning (strict mode off)', r.ok, r.err);
await db.exec(`update orders set status='cleaning' where id='${g1}'`);
await as(M, 'authenticated', `select admin_set_setting('require_cleaner_step','true')`);
r = await as(C, 'authenticated', `select start_delivery('${g1}')`); t('strict mode: cannot start delivery before "ready"', !r.ok, r.err);
r = await as(L, 'authenticated', `select cleaner_ready('${g1}', 5)`); t('cleaner marks ready', r.ok, r.err);
r = await as(C, 'authenticated', `select start_delivery('${g1}')`); t('strict mode: delivery starts once ready', r.ok, r.err);
r = await as(M, 'authenticated', `select admin_resolve_alert(id) from ops_alerts limit 1`); t('admin resolves an alert', r.ok, r.err);
r = await as(M, 'authenticated', `select count(*)::int c from ops_alerts where resolved_at is null`); t('resolved alert drops off the open list', r.rows[0].c === 0, r.rows[0].c);   // ready count (5) matched pickup, so no 2nd alert

// ---- delivery needs count + photo, and flags short deliveries
r = await as(C, 'authenticated', `select collect_cash('${g1}')`);
const d1 = (await db.query(`select delivery_otp from order_secrets where order_id='${g1}'`)).rows[0].delivery_otp;
r = await as(C, 'authenticated', `select confirm_delivery('${g1}','${d1}')`); t('delivery without count/photo rejected', !r.ok, r.err);
r = await as(C, 'authenticated', `select confirm_delivery('${g1}','${d1}',4,$1)`, [JSON.stringify([`${g1}/delivery-1.jpg`])]); t('delivery with 4 of 5 pieces completes…', r.ok, r.err);
r = await as(M, 'authenticated', `select message from ops_alerts where message like '%delivered%'`); t('…and flags the shortfall to admin', r.rows.length === 1, r.rows[0]?.message);

// ---- storage policies
r = await as(C, 'authenticated', `insert into storage.objects (bucket_id, name) values ('order-photos', '${o.id}/pickup-1.jpg')`); t('assigned captain can upload into the order folder', r.ok, r.err);
r = await as(X, 'authenticated', `insert into storage.objects (bucket_id, name) values ('order-photos', '${o.id}/evil.jpg')`); t('another captain CANNOT upload there', !r.ok);
r = await as(A, 'authenticated', `select name from storage.objects where bucket_id='order-photos'`); t('customer can see photos of their order', r.rows.length === 1);
r = await as(X, 'authenticated', `select name from storage.objects`); t('other captain sees no photos', r.rows.length === 0);
r = await as(ID.cust2, 'authenticated', `select name from storage.objects`); t("another customer cannot see someone's photos", r.rows.length === 0);
finish();
