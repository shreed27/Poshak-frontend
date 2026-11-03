import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
await db.exec(`update app_settings set value='false' where key='require_photos'`);
await db.exec(`update app_settings set value='false' where key='require_job_accept'`);
const { cust: A, cust2: B, admin: M, cap: C } = ID;
const IN = '12.9355, 77.6052';
const place = (uid, code, extra = '', items = ITEMS(4)) => as(uid, 'authenticated',
  `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng ${extra.cols || ''}) values ($2,'${uid}','x',$1,'a',${extra.coords || IN} ${extra.vals || ''}) returning id, estimated_amount, discount_amount, subtotal_amount`, [items, code]);

// ---- service area is enforced by the database
let r = await place(A, 'S-1', { coords: '12.9784, 77.6408' }); t('order outside service area is rejected', !r.ok, r.err);
r = await place(A, 'S-2'); t('order inside service area accepted', r.ok, r.err);

// ---- settings: public read, admin-only write
r = await as(null, 'anon', `select value from app_settings where key='service_area'`); t('anyone can read settings', r.ok && r.rows.length === 1);
r = await as(A, 'authenticated', `select admin_set_setting('min_charge','500')`); t('customer CANNOT change settings', !r.ok);
r = await as(M, 'authenticated', `select admin_set_setting('member_discount_pct','150')`); t('discount > 90% rejected', !r.ok);
r = await as(M, 'authenticated', `select admin_set_setting('stripe_key','"x"')`); t('unknown setting key rejected', !r.ok);
r = await as(M, 'authenticated', `select admin_set_setting('member_discount_pct','10')`); t('admin sets 10% member discount', r.ok, r.err);
r = await place(A, 'S-3'); t('discount applied server-side (4kg*69=276 → 248)', r.ok && Number(r.rows[0].estimated_amount) === 248, r.err || r.rows[0].estimated_amount);
await as(M, 'authenticated', `select admin_set_setting('member_discount_pct','0')`);

// ---- admin edits prices
r = await as(A, 'authenticated', `select admin_upsert_rate('wash-iron','x','kg',1,true)`); t('customer CANNOT change prices', !r.ok);
r = await as(M, 'authenticated', `select admin_upsert_rate('wash-iron','Wash & Steam Iron','kg',80,true)`); t('admin changes rate to ₹80/kg', r.ok, r.err);
r = await place(A, 'S-4'); t('new rate used (4*80=320)', Number(r.rows[0].estimated_amount) === 320, r.rows[0]?.estimated_amount);
await as(M, 'authenticated', `select admin_upsert_rate('wash-iron','Wash & Steam Iron','kg',69,false)`);
r = await place(A, 'S-5'); t('inactive service cannot be booked', !r.ok, r.err);
await as(M, 'authenticated', `select admin_upsert_rate('wash-iron','Wash & Steam Iron','kg',69,true)`);
r = await as(M, 'authenticated', `select admin_upsert_rate('Bad Id!','x','kg',10,true)`); t('bad service id rejected', !r.ok);

// ---- minimum charge
r = await place(A, 'S-6', {}, ITEMS(1, 'steam-press')); t('minimum charge ₹99 applied to tiny orders', Number(r.rows[0].estimated_amount) === 99, r.rows[0]?.estimated_amount);
await as(M, 'authenticated', `select admin_set_setting('min_charge','150')`);
r = await place(A, 'S-7', {}, ITEMS(1, 'steam-press')); t('minimum charge is editable', Number(r.rows[0].estimated_amount) === 150);
await as(M, 'authenticated', `select admin_set_setting('min_charge','99')`);

// ---- coupons
r = await as(A, 'authenticated', `select admin_upsert_coupon('HACK','x','flat',500,0,null,false,1,null,true,null)`); t('customer CANNOT create coupons', !r.ok);
r = await as(A, 'authenticated', `select * from coupons`); t('customer cannot list coupons', r.ok && r.rows.length === 0);
r = await as(B, 'authenticated', `select preview_price($1,'WELCOME100') p`, [ITEMS(5)]); const p = r.rows[0].p;
t('preview: WELCOME100 on ₹345 → ₹245', p.total === 245 && !p.coupon_error, JSON.stringify(p));
r = await as(B, 'authenticated', `select preview_price($1,'NOPE') p`, [ITEMS(5)]); t('preview: unknown coupon reports error', r.rows[0].p.coupon_error === 'Invalid coupon');
r = await as(B, 'authenticated', `select preview_price($1,'WELCOME100') p`, [ITEMS(1, 'steam-press')]); t('preview: min order enforced', /more to use/.test(r.rows[0].p.coupon_error || ''), r.rows[0].p.coupon_error);
r = await as(B, 'authenticated', `select preview_price($1,'POSHAK20') p`, [ITEMS(20)]); t('percent coupon capped at ₹150', r.rows[0].p.coupon_discount === 150, JSON.stringify(r.rows[0].p));
r = await place(B, 'S-8', { cols: ',coupon_code', vals: ",'welcome100'" }, ITEMS(5)); t('order with coupon priced by server (345-100=245)', r.ok && Number(r.rows[0].estimated_amount) === 245, r.err || r.rows[0].estimated_amount);
r = await place(B, 'S-9', { cols: ',coupon_code', vals: ",'WELCOME100'" }, ITEMS(5)); t('first-order coupon cannot be reused', !r.ok, r.err);
r = await place(A, 'S-10', { cols: ',coupon_code', vals: ",'WELCOME100'" }, ITEMS(5)); t('first-order coupon rejected for existing customer', !r.ok, r.err);
await as(M, 'authenticated', `select admin_upsert_coupon('LIMIT1','x','flat',10,0,null,false,5,1,true,null)`);
r = await place(A, 'S-11', { cols: ',coupon_code', vals: ",'LIMIT1'" }); t('usage-limited coupon redeems once', r.ok, r.err);
r = await place(B, 'S-12', { cols: ',coupon_code', vals: ",'LIMIT1'" }); t('usage-limited coupon refuses the next customer', !r.ok, r.err);
await as(M, 'authenticated', `select admin_upsert_coupon('OLD','x','flat',10,0,null,false,5,null,true,now() - interval '1 day')`);
r = await place(A, 'S-13', { cols: ',coupon_code', vals: ",'OLD'" }); t('expired coupon rejected', !r.ok, r.err);

// coupon honoured at weigh-in (re-priced on the real weight)
r = await place(A, 'S-14', { cols: ',coupon_code', vals: ",'POSHAK20'" }, ITEMS(4)); const id = r.rows[0].id;
t('POSHAK20 at booking: 276 - 20% = 221', Number(r.rows[0].estimated_amount) === 221, r.rows[0].estimated_amount);
await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
const otp = (await db.query(`select pickup_otp from order_secrets where order_id='${id}'`)).rows[0].pickup_otp;
r = await as(C, 'authenticated', `select confirm_pickup('${id}','${otp}',$1) f`, [ITEMS(6)]); t('final bill re-priced with the same coupon (414 - 20% = 331)', Number(r.rows[0].f) === 331, r.err || r.rows[0].f);

// ---- slot capacity
const D = "current_date + 1";
const slot = (uid, code, win) => as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng, pickup_date, pickup_window) values ($2,'${uid}','x',$1,'a',12.9355,77.6052,${D},$3) returning id`, [ITEMS(), code, win]);
await as(M, 'authenticated', `select admin_set_setting('max_orders_per_slot','2')`);
r = await slot(A, 'T-1', '17-19'); t('slot booking 1/2', r.ok, r.err);
r = await slot(B, 'T-2', '17-19'); t('slot booking 2/2', r.ok, r.err);
r = await slot(A, 'T-3', '17-19'); t('slot full → rejected', !r.ok && /full/.test(r.err), r.err);
r = await slot(A, 'T-4', '13-15'); t('other window still open', r.ok, r.err);
r = await slot(A, 'T-5', '99-100'); t('invalid window rejected', !r.ok);
r = await as(A, 'authenticated', `select win, booked, capacity from slot_availability(current_date + 1) where win='17-19'`); t('availability shows 2/2', r.rows[0].booked === 2 && r.rows[0].capacity === 2, JSON.stringify(r.rows[0]));
await as(M, 'authenticated', `select admin_set_setting('slot_capacity_overrides','{"17-19": 5}')`);
r = await slot(A, 'T-6', '17-19'); t('per-window capacity override works', r.ok, r.err);
const ids = (await db.query(`select id from orders where order_code='T-1'`)).rows[0].id;
await as(A, 'authenticated', `select cancel_my_order('${ids}')`);
r = await as(A, 'authenticated', `select booked from slot_availability(current_date + 1) where win='17-19'`); t('cancelled order frees the slot', r.rows[0].booked === 2, r.rows[0].booked);
r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng, pickup_date, pickup_window) values ('T-7','${A}','x',$1,'a',12.9355,77.6052,current_date - 1,'17-19')`, [ITEMS()]); t('past pickup date rejected', !r.ok, r.err);
finish();
