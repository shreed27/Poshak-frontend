// Razorpay → us. Subscribe to: payment.captured, qr_code.credited, refund.processed, refund.failed
// Deploy with --no-verify-jwt (Razorpay is not a signed-in user); authenticity comes from the HMAC below.
import { json, serviceClient, hmacHex, safeEqual } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  const raw = await req.text();                                  // must be the RAW body for the signature
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected = await hmacHex(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!, raw);
  if (!safeEqual(expected, signature)) return json({ error: 'bad signature' }, 401);

  const eventId = req.headers.get('x-razorpay-event-id') ?? '';
  const svc = serviceClient();

  if (eventId) {
    const { data: seen } = await svc.from('webhook_events').select('id').eq('id', eventId).maybeSingle();
    if (seen) return json({ ok: true, duplicate: true });
  }

  const event = JSON.parse(raw);
  const payment = event?.payload?.payment?.entity;
  let orderId: string | null = null;
  let method: 'online' | 'upi_qr' | null = null;

  if (event.event === 'qr_code.credited' && payment) {
    const qrId = event.payload.qr_code?.entity?.id;
    const { data } = await svc.from('orders').select('id').eq('qr_id', qrId).maybeSingle();
    orderId = data?.id ?? null;
    method = 'upi_qr';
  } else if (event.event === 'payment.captured' && payment?.order_id) {
    const { data } = await svc.from('orders').select('id').eq('razorpay_order_id', payment.order_id).maybeSingle();
    orderId = data?.id ?? null;
    method = 'online';
    if (!orderId) {
      // Wallet plan or tip (see create-intent-payment). Idempotent on the payment id.
      const { error } = await svc.rpc('apply_intent_payment', { p_rzp_order: payment.order_id, p_payment: payment.id, p_amount_paise: payment.amount });
      if (error) { console.error('apply_intent_payment failed', error); return json({ error: 'retry' }, 500); }
    }
  }

  if ((event.event === 'refund.processed' || event.event === 'refund.failed') && event.payload?.refund?.entity) {
    const rf = event.payload.refund.entity;
    const { error } = await svc.rpc('update_refund_status', { p_rzp_refund: rf.id, p_status: event.event === 'refund.failed' ? 'failed' : 'processed' });
    if (error) { console.error('update_refund_status failed', error); return json({ error: 'retry' }, 500); }
  }

  if (orderId && method && payment) {
    // Idempotent: a payment id is only ever applied once, even if QR + payment.captured both fire.
    const { error } = await svc.rpc('apply_payment', {
      p_order: orderId, p_amount: payment.amount / 100, p_method: method, p_rzp_payment: payment.id,
    });
    if (error) {
      console.error('apply_payment failed', error);
      return json({ error: 'retry' }, 500);                      // non-2xx → Razorpay retries
    }
  }

  if (eventId) await svc.from('webhook_events').insert({ id: eventId });
  return json({ ok: true });
});
