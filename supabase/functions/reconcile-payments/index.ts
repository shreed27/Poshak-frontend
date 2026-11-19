// Admin → compare what Razorpay says it captured with what our database recorded, store the result, alert on differences.
// Body: { days?: 1..31 }  (default 1). The last 15 minutes are left out on purpose: webhooks can still be on their way.
import { handle, json, requireUser, serviceClient, rzp, rateLimit, HttpError } from '../_shared/razorpay.ts';

Deno.serve(handle(async (req) => {
  const { db, user } = await requireUser(req);
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') throw new HttpError(403, 'Admins only');
  rateLimit(`recon:${user.id}`, 6);

  const body = await req.json().catch(() => ({}));
  const days = Math.min(Math.max(Math.floor(Number(body?.days ?? 1)) || 1, 1), 31);
  const to = new Date(Date.now() - 15 * 60_000);
  const from = new Date(to.getTime() - days * 86_400_000);

  const items: { id: string; amount: number; status: string }[] = [];
  let truncated = false;
  for (let page = 0; page < 30; page++) {
    const res = await rzp(`/payments?from=${Math.floor(from.getTime() / 1000)}&to=${Math.floor(to.getTime() / 1000)}&count=100&skip=${page * 100}`);
    for (const p of res.items ?? []) {
      // fully refunded payments were still captured; failed / created-only payments never moved money
      if (p.status === 'captured' || p.status === 'refunded') items.push({ id: p.id, amount: Number(p.amount) / 100, status: 'captured' });
    }
    if ((res.items ?? []).length < 100) break;
    if (page === 29) truncated = true;
  }

  const { data: id, error } = await serviceClient().rpc('record_reconciliation', { p_from: from.toISOString(), p_to: to.toISOString(), p_gateway: items, p_by: user.id });
  if (error) { console.error(error); throw new HttpError(500, 'Could not save the reconciliation'); }
  return json({ ok: true, id, gateway_payments: items.length, truncated });
}));
