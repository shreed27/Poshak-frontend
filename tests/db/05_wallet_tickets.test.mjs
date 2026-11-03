import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key='require_photos'`);
await db.exec(`update app_settings set value='false' where key='require_job_accept'`);
const place = async (uid, code, qty = 4) => {
  const r = await as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ($2,'${uid}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(qty), code]);
  const id = r.rows[0].id; await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0]; return { id, ...s };
};
const bal = async (uid) => Number((await as(uid, 'authenticated', `select my_wallet_balance() b`)).rows[0].b);

// ---- wallet
let r = await as(A, 'authenticated', `select admin_wallet_adjust('${A}', 500, 'hack')`); t('customer CANNOT credit own wallet', !r.ok);
r = await as(A, 'authenticated', `insert into wallet_ledger (user_id, amount, kind) values ('${A}', 999, 'adjustment')`); t('customer cannot write the ledger directly', !r.ok);
r = await as(M, 'authenticated', `select admin_wallet_adjust('${A}', 100, 'goodwill')`); t('admin credits ₹100', r.ok && await bal(A) === 100, r.err);
r = await as(M, 'authenticated', `select admin_wallet_adjust('${A}', -500, 'x')`); t('wallet cannot go negative', !r.ok);
r = await as(M, 'authenticated', `select admin_wallet_adjust('${A}', 9000, 'x')`); t('adjustment above ₹5000 rejected', !r.ok);
r = await as(B, 'authenticated', `select * from wallet_ledger`); t("others cannot read someone's ledger", r.rows.length === 0);

// partial wallet payment at pickup
let o = await place(A, 'W-1', 4);                                            // ₹276
r = await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1)`, [ITEMS(4)]); t('pickup with wallet balance', r.ok, r.err);
r = await as(A, 'authenticated', `select paid_amount, payment_status from orders where id='${o.id}'`); t('₹100 wallet applied → partial', Number(r.rows[0].paid_amount) === 100 && r.rows[0].payment_status === 'partial', JSON.stringify(r.rows[0]));
t('wallet is now ₹0', await bal(A) === 0);
r = await as(C, 'authenticated', `select start_delivery('${o.id}')`); r = await as(C, 'authenticated', `select collect_cash('${o.id}') c`); t('captain collects only the remaining ₹176', Number(r.rows[0].c) === 176, r.rows[0]?.c);

// full wallet payment
await as(M, 'authenticated', `select admin_wallet_adjust('${A}', 1000, 'topup')`);
o = await place(A, 'W-2', 4);
await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1)`, [ITEMS(4)]);
r = await as(A, 'authenticated', `select payment_status, paid_amount from orders where id='${o.id}'`); t('wallet covers the whole bill → paid', r.rows[0].payment_status === 'paid' && Number(r.rows[0].paid_amount) === 276);
t('wallet reduced by ₹276', await bal(A) === 724);
await as(C, 'authenticated', `select start_delivery('${o.id}')`);
r = await as(C, 'authenticated', `select confirm_delivery('${o.id}','${o.delivery_otp}')`); t('no cash needed: delivery completes with OTP only', r.ok, r.err);
r = await as(C, 'authenticated', `select count(*)::int c from payments where method='cash' and order_id='${o.id}'`); t('no cash row recorded', r.rows[0].c === 0);

// opt out of wallet
o = await place(A, 'W-3', 2); await db.exec(`update orders set use_wallet=false where id='${o.id}'`);
await as(C, 'authenticated', `select confirm_pickup('${o.id}','${o.pickup_otp}',$1)`, [ITEMS(2)]);
r = await as(A, 'authenticated', `select paid_amount from orders where id='${o.id}'`); t('use_wallet=false leaves wallet untouched', Number(r.rows[0].paid_amount) === 0 && await bal(A) === 724);

// cancel refunds wallet payments
o = await place(A, 'W-4', 4);
await db.exec(`insert into wallet_ledger(user_id, amount, kind, order_id) values ('${A}', -50, 'order_payment', '${o.id}'); insert into payments(order_id, method, amount) values ('${o.id}','wallet',50); update orders set paid_amount=50, payment_status='partial' where id='${o.id}'`);
const before = await bal(A);
await as(A, 'authenticated', `select cancel_my_order('${o.id}')`); t('cancelling returns wallet money', await bal(A) === before + 50, `${before} → ${await bal(A)}`);

// ---- tickets
const done = await place(B, 'T-1', 4);
await as(C, 'authenticated', `select confirm_pickup('${done.id}','${done.pickup_otp}',$1)`, [ITEMS(4)]);
r = await as(B, 'authenticated', `select open_ticket('${done.id}','missing_item','One shirt is missing from my order')`); t('customer opens a ticket on own order', r.ok, r.err); const tid = r.rows[0].open_ticket;
r = await as(A, 'authenticated', `select open_ticket('${done.id}','missing_item','not mine at all')`); t("cannot complain about someone else's order", !r.ok);
r = await as(B, 'authenticated', `select open_ticket('${done.id}','missing_item','hi')`); t('too-short description rejected', !r.ok);
r = await as(B, 'authenticated', `select open_ticket('${done.id}','nonsense','long enough text here')`); t('invalid category rejected', !r.ok);
r = await as(B, 'authenticated', `select ticket_no, status, due_ack_at - created_at as ack_window, due_resolve_at - created_at as res_window from tickets where id='${tid}'`);
t('ticket gets a number and 48h / 30d deadlines', /^TKT-\d{6}$/.test(r.rows[0].ticket_no) && r.rows[0].ack_window === '2 days' && r.rows[0].res_window === '30 days', JSON.stringify(r.rows[0]));
r = await as(A, 'authenticated', `select * from tickets`); t("other customers cannot read tickets", r.rows.length === 0);
t('admin was notified of the complaint', (await as(M, 'authenticated', `select title from notifications where kind='ticket'`)).rows.length >= 1);
r = await as(A, 'authenticated', `select ticket_reply('${tid}','hacking')`); t('stranger cannot reply to a ticket', !r.ok);
r = await as(M, 'authenticated', `select ticket_reply('${tid}','We are checking the photos taken at pickup.')`); t('admin replies', r.ok, r.err);
r = await as(B, 'authenticated', `select status, ack_at is not null as acked from tickets where id='${tid}'`); t('first admin reply acknowledges + moves to in_review', r.rows[0].status === 'in_review' && r.rows[0].acked);
r = await as(B, 'authenticated', `select count(*)::int c from ticket_messages where ticket_id='${tid}'`); t('customer sees the whole thread (2 messages)', r.rows[0].c === 2, r.rows[0].c);
r = await as(B, 'authenticated', `select admin_resolve_ticket('${tid}','resolved','credit',100,'x')`); t('customer CANNOT resolve tickets', !r.ok);
r = await as(M, 'authenticated', `select admin_resolve_ticket('${tid}','resolved','credit',5000,'sorry')`); t('credit above 3× order value rejected (policy cap)', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_resolve_ticket('${tid}','resolved','credit',300,'Sorry about the missing shirt')`); t('admin resolves with ₹300 credit', r.ok, r.err);
t("credit landed in the customer's wallet", await bal(B) === 300, await bal(B));
r = await as(B, 'authenticated', `select status, resolution, resolution_amount from tickets where id='${tid}'`); t('ticket closed with resolution recorded', r.rows[0].status === 'resolved' && r.rows[0].resolution === 'credit');
t('customer notified of the resolution', (await as(B, 'authenticated', `select title from notifications`)).rows.some((n) => /resolved/.test(n.title)));
r = await as(M, 'authenticated', `select admin_resolve_ticket('${tid}','resolved','credit',10,'again')`); t('cannot resolve twice', !r.ok);
r = await as(B, 'authenticated', `select ticket_reply('${tid}','one more thing')`); t('customer cannot reply on a closed ticket', !r.ok);
for (let i = 0; i < 5; i++) await as(B, 'authenticated', `select open_ticket('${done.id}','quality','Quality issue number ${i} text')`);
r = await as(B, 'authenticated', `select open_ticket('${done.id}','quality','Yet another complaint text')`); t('max 5 open complaints per customer (anti-spam)', !r.ok, r.err);
finish();
