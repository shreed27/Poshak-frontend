import { makeDb, seedUsers, asUser, ID, ITEMS, t, finish } from './harness.mjs';
const db = await makeDb(); await seedUsers(db); const as = asUser(db);
const { cust: A, cust2: B, cap: C, admin: M } = ID;
await db.exec(`update app_settings set value='false' where key='require_photos'`);
await db.exec(`update app_settings set value='false' where key='require_job_accept'`);
const deliver = async (uid, code, items = ITEMS(5)) => {
  let r = await as(uid, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, customer_name, pickup_address, pickup_lat, pickup_lng) values ($2,'${uid}','Wash',$1,'Asha Rao','Block 2',12.9355,77.6052) returning id`, [items, code]);
  const id = r.rows[0].id; await as(M, 'authenticated', `select admin_assign_captain('${id}','${C}')`);
  const s = (await db.query(`select pickup_otp, delivery_otp from order_secrets where order_id='${id}'`)).rows[0];
  await as(C, 'authenticated', `select confirm_pickup('${id}','${s.pickup_otp}',$1)`, [items]);
  await as(C, 'authenticated', `select start_delivery('${id}')`); await as(C, 'authenticated', `select collect_cash('${id}')`);
  r = await as(C, 'authenticated', `select confirm_delivery('${id}','${s.delivery_otp}')`); if (!r.ok) throw new Error(r.err);
  return id;
};
const inv = async (id) => (await db.query(`select * from invoices where order_id='${id}'`)).rows[0];

// ---- not GST-registered → plain receipt, no tax
let id1 = await deliver(A, 'I-1'); let i = await inv(id1);
t('invoice generated on delivery', Boolean(i));
t('unregistered business gets a receipt with no tax', i.kind === 'receipt' && Number(i.cgst) === 0 && Number(i.total) === 345, `${i.kind} ${i.total}`);
t('invoice number is PSK/<FY>/000001', /^PSK\/\d{4}\/000001$/.test(i.invoice_no), i.invoice_no);
t('lines carry service, qty and rate', i.lines[0].qty === 5 && Number(i.lines[0].rate) === 69 && i.lines[0].amount === 345, JSON.stringify(i.lines[0]));

// ---- registered, GST-inclusive 18%
let r = await as(M, 'authenticated', `select admin_set_setting('business', $1)`, [JSON.stringify({ legal_name: 'Poshak Pvt Ltd', gstin: '29ABCDE1234F1Z5', address: 'SG Palya, Bengaluru', state: 'Karnataka', state_code: '29', gst_registered: true, gst_rate: 18, prices_include_gst: true, invoice_prefix: 'PSK' })]);
t('admin saves business details with a valid GSTIN', r.ok, r.err);
r = await as(M, 'authenticated', `select admin_set_setting('business', $1)`, [JSON.stringify({ legal_name: 'X', gstin: '12345', address: 'y', gst_registered: true, gst_rate: 18 })]); t('bad GSTIN rejected', !r.ok, r.err);
r = await as(M, 'authenticated', `select admin_set_setting('business', $1)`, [JSON.stringify({ gst_registered: false, gst_rate: 40 })]); t('GST rate above 28 rejected', !r.ok);
r = await as(A, 'authenticated', `select admin_set_setting('business','{}')`); t('customer cannot change business settings', !r.ok);
const id2 = await deliver(A, 'I-2'); i = await inv(id2);
t('registered business gets a tax invoice', i.kind === 'tax_invoice');
t('GST-inclusive: taxable 292.37 + tax 52.63 = ₹345', Number(i.taxable_value) === 292.37 && (Number(i.cgst) + Number(i.sgst)).toFixed(2) === '52.63' && (Number(i.taxable_value) + Number(i.cgst) + Number(i.sgst)).toFixed(2) === '345.00', JSON.stringify([i.taxable_value, i.cgst, i.sgst]));
t('CGST and SGST split (no IGST)', Number(i.cgst) > 0 && Number(i.sgst) > 0 && Number(i.igst) === 0 && Math.abs(i.cgst - i.sgst) < 0.011);
t('sequence continues: …/000002', i.invoice_no.endsWith('/000002'), i.invoice_no);
t('seller snapshot stored on the invoice', i.seller.gstin === '29ABCDE1234F1Z5');

// ---- exclusive pricing
await as(M, 'authenticated', `select admin_set_setting('business', $1)`, [JSON.stringify({ legal_name: 'Poshak Pvt Ltd', gstin: '29ABCDE1234F1Z5', address: 'SG Palya', gst_registered: true, gst_rate: 18, prices_include_gst: false, invoice_prefix: 'PSK' })]);
const id3 = await deliver(A, 'I-3', ITEMS(1, 'steam-press'));            // min charge ₹99
i = await inv(id3);
t('GST-exclusive: ₹99 + 18% = ₹116.82', Number(i.taxable_value) === 99 && Number(i.total) === 116.82, JSON.stringify([i.taxable_value, i.total]));
t('minimum-charge adjustment shown as a line', i.lines.some((l) => l.description === 'Minimum charge adjustment'), JSON.stringify(i.lines.map((l) => l.description)));

// ---- price changes later do not rewrite history
await as(M, 'authenticated', `select admin_upsert_rate('wash-iron','Wash & Steam Iron','kg',500,true)`);
i = await inv(id2); t('old invoice keeps the rate it was issued with', Number(i.lines[0].rate) === 69);

// ---- access + immutability + one per order
r = await as(A, 'authenticated', `select count(*)::int c from invoices`); t('customer sees own invoices (3)', r.rows[0].c === 3);
r = await as(B, 'authenticated', `select count(*)::int c from invoices`); t("another customer sees none", r.rows[0].c === 0);
r = await as(M, 'authenticated', `select count(*)::int c from invoices`); t('admin sees all', r.rows[0].c === 3);
r = await as(M, 'authenticated', `update invoices set total = 1`); t('invoices cannot be edited (even by admin)', !r.ok, r.err);
r = await db.query(`select 1`).then(() => ({ ok: true })); await db.exec(`select public._generate_invoice('${id1}')`); t('regenerating is a no-op (one invoice per order)', (await db.query(`select count(*)::int c from invoices where order_id='${id1}'`)).rows[0].c === 1);
try { await db.exec(`delete from invoices where order_id='${id1}'`); t('invoices cannot be deleted', false); } catch { t('invoices cannot be deleted', true); }
r = await as(A, 'authenticated', `insert into orders (order_code, customer_id, service_name, items, pickup_address, pickup_lat, pickup_lng) values ('I-4','${A}','x',$1,'a',12.9355,77.6052) returning id`, [ITEMS(2)]); const id4 = r.rows[0].id;
await as(A, 'authenticated', `select cancel_my_order('${id4}')`); t('cancelled orders get no invoice', !(await inv(id4)));
r = await as(M, 'authenticated', `select admin_set_service_sac('dry-clean','999712')`); t('admin edits a SAC code', r.ok, r.err);
r = await as(M, 'authenticated', `select admin_set_service_sac('dry-clean','ab')`); t('bad SAC rejected', !r.ok);
finish();
