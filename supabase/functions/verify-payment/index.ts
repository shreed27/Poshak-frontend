// Called by the browser right after Checkout succeeds so the UI flips to "Paid" instantly.
// The webhook is the source of truth; both paths are idempotent (payments.razorpay_payment_id is unique).
import { handle, json, requireUser, serviceClient, rzp, hmacHex, safeEqual, HttpError } from '../_shared/razorpay.ts';

Deno.serve(handle(async (req) => {
  await requireUser(req);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) throw new HttpError(400, 'Missing fields');

  // Razorpay signs "order_id|payment_id" with the key secret.
  const expected = await hmacHex(Deno.env.get('RAZORPAY_KEY_SECRET')!, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!safeEqual(expected, razorpay_signature)) throw new HttpError(400, 'Invalid payment signature');

  // Ask Razorpay what really happened instead of trusting the browser for the amount.
  const payment = await rzp(`/payments/${razorpay_payment_id}`);
  if (payment.order_id !== razorpay_order_id) throw new HttpError(400, 'Payment does not match order');
  if (payment.status !== 'captured') return json({ status: payment.status, applied: false });

  const svc = serviceClient();
  const { data: o } = await svc.from('orders').select('id').eq('razorpay_order_id', razorpay_order_id).maybeSingle();
  if (!o) {
    // Not an order payment: a wallet plan or a tip.
    const { data: res, error: ie } = await svc.rpc('apply_intent_payment', { p_rzp_order: razorpay_order_id, p_payment: razorpay_payment_id, p_amount_paise: payment.amount });
    if (ie) throw ie;
    if (!res?.ok) throw new HttpError(404, 'Payment not recognised');
    return json({ status: 'captured', applied: !res.duplicate, kind: res.kind });
  }

  const { data: applied, error } = await svc.rpc('apply_payment', {
    p_order: o.id, p_amount: payment.amount / 100, p_method: 'online', p_rzp_payment: razorpay_payment_id,
  });
  if (error) throw error;
  return json({ status: 'captured', applied });
}));
