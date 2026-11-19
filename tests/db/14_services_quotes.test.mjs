import { makeDb, seedUsers, asUser, ID, t, finish } from './harness.mjs';
const db = await makeDb({ realCatalog: true }); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M } = ID;
const J = (o) => JSON.stringify(o);
const ITEMS = (id, qty) => J([{ service_id: id, qty }]);

// ---- the launch catalogue
let r = await db.query(`select id, name, rate, unit, active, price_on_request from service_rates where kind='standard' order by sort, id`);
const act = r.rows.filter((x) => x.active).map((x) => x.id);
t('only the two priced services are orderable', J(act) === J(['wash-fold', 'wash-iron']), J(act));
t('Wash & Fold is ₹59/kg', r.rows.find((x) => x.id === 'wash-fold').name === 'Wash & Fold' && Number(r.rows.find((x) => x.id === 'wash-fold').rate) === 59 && r.rows.find((x) => x.id === 'wash-fold').unit === 'kg');
t('Wash, Fold & Iron is ₹89/kg', r.rows.find((x) => x.id === 'wash-iron').name === 'Wash, Fold & Iron' && Number(r.rows.find((x) => x.id === 'wash-iron').rate) === 89);
t('Alteration & Dry Cleaning exists as price-on-request and is not orderable', r.rows.find((x) => x.id === 'alteration-dry-clean')?.price_on_request === true && r.rows.find((x) => x.id === 'alteration-dry-clean').active === false);
t('every old service is switched off (not deleted)', ['express-6h', 'dry-clean', 'steam-press', 'shoe-spa', 'heavy-home'].every((id) => r.rows.some((x) => x.id === id && !x.active)));
r = await as(null, 'anon', `select price_order('${ITEMS('wash-fold', 4)}'::jsonb, null, null) p`); t('4 kg Wash & Fold prices at ₹236 (4 × 59)', Number(r.rows[0]?.p?.total) === 236, J(r.rows[0]?.p));
r = await as(null, 'anon', `select price_order('${ITEMS('wash-iron', 3)}'::jsonb, null, null) p`); t('3 kg Wash, Fold & Iron prices at ₹267 (3 × 89)', Number(r.rows[0]?.p?.total) === 267, J(r.rows[0]?.p));
r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('X1','${A}','x',$1,'a',12.9355,77.6052)`, [ITEMS('alteration-dry-clean', 5)]);
t('cannot order the on-request service at its placeholder price', !r.ok, r.err);
r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('X2','${A}','x',$1,'a',12.9355,77.6052)`, [ITEMS('dry-clean', 1)]);
t('retired services can no longer be ordered', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_upsert_rate('alteration-dry-clean','Alteration & Dry Cleaning','pc',1,true)`);
r = await db.query(`select active from service_rates where id='alteration-dry-clean'`); t('admin cannot switch the on-request service on', r.rows[0].active === false);

// ---- requesting a quote
const req = (uid, desc = 'Shorten two trousers and dry clean a wedding sherwani', phone = '9876543210', lat = 12.9355, lng = 77.6052, photos = '[]') =>
  as(uid, 'authenticated', `select request_quote($1,$2,'12 MG Road, SG Palya',${lat},${lng},'near the temple',$3::jsonb) id`, [desc, phone, photos]);
r = await req(A); const q1 = r.rows[0]?.id; t('customer requests a quote', r.ok && q1, r.err);
r = await req(A, 'too short'); t('a too-short description is refused', !r.ok, r.err);
r = await req(A, 'Shorten two trousers please', '12345'); t('a bad phone number is refused', !r.ok, r.err);
r = await req(A, 'Shorten two trousers please', '9876543210', 13.5, 77.9); t('outside the service area is refused', !r.ok, r.err);
r = await req(A, 'Shorten two trousers please', '9876543210', 12.9355, 77.6052, J([`${A}/1.jpg`, `${A}/2.jpg`, `${A}/3.jpg`, `${A}/4.jpg`, `${A}/5.jpg`])); t('more than 4 photos is refused', !r.ok, r.err);
r = await req(A, 'Shorten two trousers please', '9876543210', 12.9355, 77.6052, J([`${B}/1.jpg`])); t("photos from someone else's folder are refused", !r.ok, r.err);
r = await req(A, 'Shorten two trousers please', '9876543210', 12.9355, 77.6052, J([`${A}/ok.jpg`])); t('a valid photo is accepted', r.ok, r.err);
r = await as(null, 'anon', `select request_quote('Shorten two trousers please','9876543210','x',12.9,77.6)`); t('signed-out visitors cannot request', !r.ok);
t('admins are told about new requests', (await as(M, 'authenticated', `select 1 from notifications where kind='quote' and title like 'New quote request%'`)).rows.length >= 1);
for (let i = 0; i < 3; i++) await req(A);
r = await req(A); t('at most 5 open requests per customer', !r.ok, r.err);
r = await as(A, 'authenticated', `select count(*)::int n from quote_requests`); t('customer sees only their own requests', r.rows[0].n === 5);
r = await as(B, 'authenticated', `select count(*)::int n from quote_requests`); t('other customers see none', r.rows[0].n === 0);
r = await as(M, 'authenticated', `select count(*)::int n from quote_requests`); t('admin sees all', r.rows[0].n === 5);

// ---- admin replies
r = await as(A, 'authenticated', `select admin_send_quote('${q1}', 450)`); t('customers cannot send quotes', !r.ok);
r = await as(M, 'authenticated', `select admin_send_quote('${q1}', 20)`); t('a quote below the minimum order charge is refused', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_send_quote('${q1}', 450, 'Two hems + sherwani, ready in 3 days')`); t('admin sends ₹450', r.ok, r.err);
r = await as(A, 'authenticated', `select status, quoted_amount, admin_note, quote_service_id from quote_requests where id='${q1}'`); const row = r.rows[0];
t('customer sees the price and note', row.status === 'quoted' && Number(row.quoted_amount) === 450 && /sherwani/.test(row.admin_note), J(row));
t('customer is notified of the quote', (await as(A, 'authenticated', `select title from notifications where kind='quote' and title like 'Your quote is ready%'`)).rows[0]?.title === 'Your quote is ready: ₹450');
r = await as(A, 'authenticated', `select id, rate from service_rates where id='${row.quote_service_id}'`); t('the quoted customer can read their quote service', r.rows.length === 1 && Number(r.rows[0].rate) === 450);
r = await as(B, 'authenticated', `select id from service_rates where id='${row.quote_service_id}'`); t('other customers cannot see it', r.rows.length === 0);
r = await as(null, 'anon', `select id from service_rates where kind='quote'`); t('nor can the public', r.rows.length === 0);
r = await as(null, 'anon', `select id from service_rates where kind='standard' and active`); t('the public can still see the standard catalogue', r.rows.length === 2);
await as(M, 'authenticated', `select admin_send_quote('${q1}', 520, 'Revised')`); r = await db.query(`select rate from service_rates where id='${row.quote_service_id}'`); t('re-quoting updates the same price row', Number(r.rows[0].rate) === 520);
await as(M, 'authenticated', `select admin_send_quote('${q1}', 450, 'Two hems + sherwani, ready in 3 days')`);

// ---- customer responds
r = await as(B, 'authenticated', `select respond_quote('${q1}', true)`); t("another customer cannot accept someone else's quote", !r.ok, r.err);
r = await as(A, 'authenticated', `select respond_quote('${q1}', true) j`); const acc = r.rows[0]?.j; t('customer accepts → an order is created', r.ok && acc?.order_code && acc.status === 'accepted', r.err);
r = await as(A, 'authenticated', `select estimated_amount, service_name, status, pickup_slot, special_instructions, payment_mode from orders where id='${acc.order_id}'`);
t('the order is exactly the quoted ₹450', Number(r.rows[0]?.estimated_amount) === 450 && r.rows[0].status === 'placed' && /Alteration/.test(r.rows[0].service_name), J(r.rows[0]));
t('it carries the request text and is pay-on-delivery', /sherwani/.test(r.rows[0].special_instructions) && r.rows[0].payment_mode === 'cod');
t('pickup/delivery OTPs were generated', (await db.query(`select 1 from order_secrets where order_id='${acc.order_id}'`)).rows.length === 1);
r = await as(M, 'authenticated', `select 1 from notifications where kind='quote' and title like '%accepted%'`); t('admin is told it was accepted', r.rows.length >= 1);
r = await as(A, 'authenticated', `select respond_quote('${q1}', true)`); t('cannot accept twice', !r.ok, r.err);
r = await as(A, 'authenticated', `select status, order_id from quote_requests where id='${q1}'`); t('request is marked accepted and linked to the order', r.rows[0].status === 'accepted' && r.rows[0].order_id === acc.order_id);

// ---- decline, cancel, expiry
r = await req(B); const q2 = r.rows[0].id; await as(M, 'authenticated', `select admin_send_quote('${q2}', 300)`);
r = await as(B, 'authenticated', `select respond_quote('${q2}', false) j`); t('customer declines a quote', r.ok && r.rows[0].j.status === 'declined', r.err);
r = await req(B); const q3 = r.rows[0].id; r = await as(B, 'authenticated', `select cancel_my_quote('${q3}')`); t('customer cancels an open request', r.ok, r.err);
r = await as(M, 'authenticated', `select admin_send_quote('${q3}', 300)`); t('a cancelled request cannot be quoted', !r.ok, r.err);
r = await req(B); const q4 = r.rows[0].id; await as(M, 'authenticated', `select admin_send_quote('${q4}', 300)`);
await db.exec(`update quote_requests set quoted_at = now() - interval '8 days' where id='${q4}'`);
r = await as(B, 'authenticated', `select respond_quote('${q4}', true)`); t('an 8-day-old quote has expired', !r.ok && /expired/.test(r.err), r.err);
r = await req(B); const q5 = r.rows[0].id; r = await as(M, 'authenticated', `select admin_decline_quote('${q5}', 'We do not do leather')`); t('admin declines a request', r.ok, r.err);
r = await as(B, 'authenticated', `select title, body from notifications where kind='quote' and title like 'We can%'`); t('customer is told why', /leather/.test(r.rows[0]?.body || ''), J(r.rows));
r = await as(M, 'authenticated', `select admin_decline_quote('${q5}')`); t('already-closed requests cannot be changed', !r.ok, r.err);
finish();
