// Plan purchase ("add money pack") or a tip for a captain: creates the Razorpay Order and remembers what it is for.
// The webhook / verify-payment then calls apply_intent_payment() which credits the wallet or records the tip.
import { handle, json, requireUser, serviceClient, rzp, HttpError } from '../_shared/razorpay.ts';

Deno.serve(handle(async (req) => {
  const { db, user } = await requireUser(req);
  const body = await req.json();
  let amountPaise = 0;
  let ref = '';
  let description = '';

  if (body.kind === 'plan') {
    const { data: plan } = await db.from('plans').select('*').eq('id', body.plan_id).eq('active', true).maybeSingle();
    if (!plan) throw new HttpError(404, 'Plan not found');
    amountPaise = Math.round(Number(plan.price) * 100);
    ref = plan.id;
    description = `${plan.name} (wallet credit ₹${plan.credit})`;
  } else if (body.kind === 'tip') {
    const rupees = Number(body.amount);
    if (!Number.isFinite(rupees) || rupees < 10 || rupees > 1000) throw new HttpError(400, 'Tip must be between ₹10 and ₹1000');
    const { data: o } = await db.from('orders').select('id, order_code, status, captain_id').eq('id', body.order_id).eq('customer_id', user.id).maybeSingle();
    if (!o || o.status !== 'delivered' || !o.captain_id) throw new HttpError(400, 'You can tip after delivery');
    amountPaise = Math.round(rupees * 100);
    ref = o.id;
    description = `Tip for order ${o.order_code}`;
  } else {
    throw new HttpError(400, 'Unknown payment kind');
  }

  const order = await rzp('/orders', { body: { amount: amountPaise, currency: 'INR', receipt: `${body.kind}-${Date.now()}`, notes: { kind: body.kind, ref, user_id: user.id } } });
  const { error } = await serviceClient().from('pay_intents').insert({ razorpay_order_id: order.id, kind: body.kind, user_id: user.id, ref, amount_paise: amountPaise });
  if (error) throw error;

  return json({ key_id: Deno.env.get('RAZORPAY_KEY_ID'), razorpay_order_id: order.id, amount: order.amount, order_code: description, name: user.user_metadata?.full_name ?? '', email: user.email });
}));
