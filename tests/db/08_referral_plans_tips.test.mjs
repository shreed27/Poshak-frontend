import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key in ('require_photos','require_job_accept')`);
const bal = async (uid) => Number((await as(uid, 'authenticated', `select my_wallet_balance() b`)).rows[0].b);
const deliver = async (uid, code, qty) => {
  let r = await as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ($2,'${uid}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(qty), code]);
  const id = r.rows[0].id; await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
  await as(C, 'authenticated', `select confirm_pickup('${id}','${s.pickup_otp}',$1)`, [ITEMS(qty)]); await as(C, 'authenticated', `select start_delivery('${id}')`);
  await as(C, 'authenticated', `select collect_cash('${id}')`); await as(C, 'authenticated', `select confirm_delivery('${id}','${s.delivery_otp}')`); return id;
};

// ---- referral
let r = await as(A, 'authenticated', `select my_referral() j`); const codeA = r.rows[0].j.code;
t('every user gets a referral code', /^[A-Z0-9]{7}$/.test(codeA), codeA);
r = await as(A, 'authenticated', `select apply_referral('${codeA}')`); t('cannot use your own code', !r.ok, r.err);
r = await as(B, 'authenticated', `select apply_referral('NOPE123')`); t('invalid code rejected', !r.ok);
r = await as(B, 'authenticated', `select apply_referral(lower('${codeA}'))`); t('B applies A\'s code (case-insensitive)', r.ok, r.err);
r = await as(B, 'authenticated', `select apply_referral('${codeA}')`); t('cannot apply twice', !r.ok);
r = await as(A, 'authenticated', `select my_referral() j`); t('A sees 1 friend, 0 rewarded', r.rows[0].j.friends === 1 && r.rows[0].j.rewarded === 0);
await deliver(B, 'F-1', 2);                                                  // ₹138 < ₹199 minimum
t('order below the minimum does not trigger the bonus', await bal(A) === 0 && await bal(B) === 0);
await deliver(B, 'F-2', 4);                                                  // ₹276
t('first qualifying delivery credits BOTH (₹100 each)', await bal(A) === 100 && await bal(B) === 100, `${await bal(A)} / ${await bal(B)}`);
await deliver(B, 'F-3', 4);   // B's wallet bonus is spent on this order (wallet pays first)
t('bonus is paid only once (A still ₹100; B has a single referral credit)', await bal(A) === 100 && Number((await db.query(`select count(*) c from wallet_ledger where user_id='${B}' and kind='referral'`)).rows[0].c) === 1);
r = await as(A, 'authenticated', `select my_referral() j`); t('A now sees 1 rewarded', r.rows[0].j.rewarded === 1);
await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('F-9','${A}','x',$1,'a',12.9355,77.6052)`, [ITEMS(2)]);
r = await as(A, 'authenticated', `select apply_referral('${(await as(B, 'authenticated', 'select my_referral() j')).rows[0].j.code}')`); t('customers with an order cannot apply a code', !r.ok, r.err);

// ---- plans
r = await as(A, 'authenticated', `select count(*)::int c from plans`); t('customers see active plans', r.rows[0].c === 3);
r = await as(A, 'authenticated', `select admin_upsert_plan('x','x',100,100,'x',true)`); t('customer cannot create plans', !r.ok);
r = await as(M, 'authenticated', `select admin_upsert_plan('bad','Bad',500,400,'credit < price',true)`); t('credit must be ≥ price', !r.ok);
r = await as(M, 'authenticated', `select admin_upsert_plan('diwali','Diwali pack',800,1000,'Festive',true)`); t('admin adds a plan', r.ok, r.err);
await db.exec(`insert into pay_intents (razorpay_order_id, kind, user_id, ref, amount_paise) values ('order_P1','plan','${A}','regular',100000)`);
r = await as(A, 'authenticated', `select apply_intent_payment('order_P1','pay_1',100000)`); t('customer CANNOT credit themselves via apply_intent_payment', !r.ok);
r = await as('', 'service_role', `select apply_intent_payment('order_P1','pay_1',50000) j`); t('underpaid plan is rejected', r.rows[0].j.ok === false && r.rows[0].j.reason === 'amount mismatch');
const before = await bal(A);
r = await as('', 'service_role', `select apply_intent_payment('order_P1','pay_1',100000) j`); t('paid plan credits ₹1,150 to the wallet', r.rows[0].j.ok && await bal(A) === before + 1150, r.err);
r = await as('', 'service_role', `select apply_intent_payment('order_P1','pay_1',100000) j`); t('duplicate webhook does not credit twice', r.rows[0].j.duplicate === true && await bal(A) === before + 1150);
r = await as(A, 'authenticated', `select count(*)::int c from plan_purchases`); t('customer sees own purchase', r.rows[0].c === 1);
r = await as(B, 'authenticated', `select count(*)::int c from plan_purchases`); t("not others' purchases", r.rows[0].c === 0);

// ---- rating + tips
const id = (await db.query(`select id from orders where order_code='F-2'`)).rows[0].id;
r = await as(A, 'authenticated', `select rate_captain('${id}',5)`); t("cannot rate a stranger's order", !r.ok);
r = await as(B, 'authenticated', `select rate_captain('${id}',9)`); t('rating must be 1–5', !r.ok);
r = await as(B, 'authenticated', `select rate_captain('${id}',2,'late and rude')`); t('customer rates the captain 2★', r.ok, r.err);
r = await as(B, 'authenticated', `select rate_captain('${id}',5)`); t('captain can be rated only once', !r.ok);
t('low rating raises an admin alert', (await as(M, 'authenticated', `select 1 from ops_alerts where kind='low_rating'`)).rows.length === 1);
await db.exec(`insert into pay_intents (razorpay_order_id, kind, user_id, ref, amount_paise) values ('order_T1','tip','${B}','${id}',5000)`);
r = await as('', 'service_role', `select apply_intent_payment('order_T1','pay_tip1',5000) j`); t('tip recorded for the order\'s captain', r.rows[0].j.ok, r.err);
r = await as(C, 'authenticated', `select amount from tips`); t('captain sees the ₹50 tip', r.rows.length === 1 && Number(r.rows[0].amount) === 50);
t('captain notified of the tip', (await as(C, 'authenticated', `select title from notifications`)).rows.some((n) => /tip/i.test(n.title)));
await db.exec(`insert into pay_intents (razorpay_order_id, kind, user_id, ref, amount_paise) values ('order_T2','tip','${A}','${id}',5000)`);
r = await as('', 'service_role', `select apply_intent_payment('order_T2','pay_tip2',5000) j`); t("cannot tip on someone else's order", r.rows[0].j.ok === false);
r = await as(A, 'authenticated', `select count(*)::int c from tips`); t('other customers cannot see tips', r.rows[0].c === 0);
finish();
