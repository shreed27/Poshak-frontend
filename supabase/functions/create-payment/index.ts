// Customer taps "Pay online": creates a Razorpay Order for what is still due and returns what Checkout needs.
import { handle, json, requireUser, serviceClient, rzp, dueOf, HttpError } from '../_shared/razorpay.ts';

Deno.serve(handle(async (req) => {
  const { db, user } = await requireUser(req);
  const { order_id } = await req.json();

  const { data: o } = await db.from('orders').select('*').eq('id', order_id).eq('customer_id', user.id).maybeSingle();
  if (!o) throw new HttpError(404, 'Order not found');
  if (o.status === 'cancelled' || o.status === 'delivered') throw new HttpError(400, 'This order is closed');

  const due = dueOf(o);
  if (due <= 0) throw new HttpError(400, 'Nothing left to pay');

  const order = await rzp('/orders', {
    body: { amount: Math.round(due * 100), currency: 'INR', receipt: o.order_code, notes: { order_id: o.id } },
  });
  await serviceClient().from('orders').update({ razorpay_order_id: order.id }).eq('id', o.id);

  return json({
    key_id: Deno.env.get('RAZORPAY_KEY_ID'),
    razorpay_order_id: order.id,
    amount: order.amount,
    order_code: o.order_code,
    name: o.customer_name,
    email: o.customer_email,
  });
}));
