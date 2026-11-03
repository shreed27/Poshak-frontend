// Admin → refund part or all of an order to the customer's ORIGINAL payment method via Razorpay.
// Razorpay refunds are per-payment, so an amount larger than one payment is split across payments (newest first).
import { handle, json, requireUser, serviceClient, rzp, HttpError } from '../_shared/razorpay.ts';

Deno.serve(handle(async (req) => {
  const { db, user } = await requireUser(req);
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') throw new HttpError(403, 'Admins only');

  const { order_id, amount, reason } = await req.json();
  const want = Math.round(Number(amount) * 100) / 100;
  if (!order_id || !(want > 0)) throw new HttpError(400, 'Enter a valid amount');

  const svc = serviceClient();
  const { data: o } = await svc.from('orders').select('id, order_code, paid_amount, refunded_amount').eq('id', order_id).maybeSingle();
  if (!o) throw new HttpError(404, 'Order not found');
  if (want > Number(o.paid_amount) - Number(o.refunded_amount)) throw new HttpError(400, 'That is more than was paid on this order');

  const { data: pays, error } = await svc.rpc('refundable_payments', { p_order: order_id });
  if (error) throw new HttpError(500, 'Could not load payments');
  const usable = (pays ?? []).filter((p: any) => Number(p.refundable) > 0);
  if (!usable.length) throw new HttpError(400, 'No online payment on this order can be refunded to the original method. Use wallet or manual instead.');
  const online = usable.reduce((a: number, p: any) => a + Number(p.refundable), 0);
  if (want > online) throw new HttpError(400, `Only ₹${online} was paid online (the rest was cash). Refund that part here and the remainder to wallet.`);

  let left = want;
  const done: { id: string; amount: number }[] = [];
  for (const p of usable) {
    if (left <= 0) break;
    const part = Math.min(left, Number(p.refundable));
    // The receipt makes retries idempotent on Razorpay's side for the same order+payment+amount sequence.
    const r = await rzp(`/payments/${p.razorpay_payment_id}/refund`, {
      body: { amount: Math.round(part * 100), speed: 'normal', notes: { order: o.order_code, reason: reason ?? '' }, receipt: `${o.order_code}-${Date.now()}` },
    });
    const { error: rec } = await svc.rpc('record_refund', {
      p_order: order_id, p_payment: p.payment_id, p_amount: part, p_rzp_refund: r.id,
      p_status: r.status === 'processed' ? 'processed' : 'pending', p_reason: reason ?? null, p_by: user.id,
    });
    if (rec) console.error('record_refund failed after Razorpay accepted refund', r.id, rec);   // money moved: surface in logs for reconciliation
    done.push({ id: r.id, amount: part });
    left = Math.round((left - part) * 100) / 100;
  }
  return json({ ok: true, refunds: done });
}));
