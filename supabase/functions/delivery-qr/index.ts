// Captain taps "Show UPI QR" at the doorstep: creates a single-use, fixed-amount Razorpay UPI QR
// for exactly what is due. The customer scans it with any UPI app; the webhook marks the order paid.
//
// Razorpay needs to enable BOTH "UPI QR" and "single use" on your account (support request).
import { handle, json, requireUser, serviceClient, rzp, dueOf, HttpError } from '../_shared/razorpay.ts';

const QR_MINUTES = 15;   // Razorpay allows close_by between 2 minutes and 2 hours from now

Deno.serve(handle(async (req) => {
  const { db, user } = await requireUser(req);
  const { order_id } = await req.json();

  const { data: o } = await db.from('orders').select('*').eq('id', order_id).eq('captain_id', user.id).maybeSingle();
  if (!o) throw new HttpError(404, 'Order not found');
  if (o.status !== 'out_for_delivery') throw new HttpError(400, 'Order is not out for delivery');

  const due = dueOf(o);
  if (due <= 0) throw new HttpError(400, 'Nothing left to pay');

  // Reuse a still-valid QR for the same amount (captain reopened the screen).
  if (o.qr_id && Number(o.qr_amount) === due && o.qr_expires_at && new Date(o.qr_expires_at).getTime() > Date.now() + 60_000) {
    return json({ image_url: o.qr_image_url, amount: due, expires_at: o.qr_expires_at });
  }

  const closeBy = Math.floor(Date.now() / 1000) + QR_MINUTES * 60;
  const qr = await rzp('/payments/qr_codes', {
    body: {
      type: 'upi_qr',
      name: `Poshak ${o.order_code}`,
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: Math.round(due * 100),
      description: `Laundry order ${o.order_code}`,
      close_by: closeBy,
      notes: { order_id: o.id },
    },
  });

  const expiresAt = new Date((qr.close_by ?? closeBy) * 1000).toISOString();
  await serviceClient().from('orders')
    .update({ qr_id: qr.id, qr_image_url: qr.image_url, qr_amount: due, qr_expires_at: expiresAt })
    .eq('id', o.id);

  return json({ image_url: qr.image_url, amount: due, expires_at: expiresAt });
}));
