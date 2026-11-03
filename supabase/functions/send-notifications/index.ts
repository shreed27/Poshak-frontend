// Delivers queued notifications (public.notification_outbox): WhatsApp, SMS, web push.
// Trigger it with a Database Webhook on notification_outbox INSERT (add header x-webhook-secret) or pg_cron (see 0004).
// Providers that are not configured are skipped (row marked "skipped"), so a missing key never blocks the queue.
import webpush from 'npm:web-push@3.6.7';
import { json, serviceClient } from '../_shared/razorpay.ts';

const env = (k: string) => Deno.env.get(k) ?? '';
const clean = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();   // WhatsApp params reject newlines

const sendWhatsApp = async (to: string, name: string, text: string) => {
  const res = await fetch(`https://graph.facebook.com/v20.0/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `91${to}`,
      type: 'template',
      // Template body (approve once in Meta Business Manager, category Utility): "Hi {{1}}, {{2}}"
      template: {
        name: env('WHATSAPP_TEMPLATE') || 'poshak_order_update',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: clean(name) }, { type: 'text', text: clean(text) }] }],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

// India requires DLT-registered SMS templates; with Twilio that is configured on their side.
const sendSms = async (to: string, text: string) => {
  const sid = env('TWILIO_ACCOUNT_SID');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${env('TWILIO_AUTH_TOKEN')}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: `+91${to}`, From: env('TWILIO_FROM'), Body: text }),
  });
  if (!res.ok) throw new Error(`SMS ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

Deno.serve(async (req) => {
  const secret = env('NOTIFY_WEBHOOK_SECRET');
  const bearer = req.headers.get('Authorization') === `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (!bearer && !(secret && req.headers.get('x-webhook-secret') === secret)) return json({ error: 'unauthorized' }, 401);

  const svc = serviceClient();
  const pushOn = Boolean(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'));
  if (pushOn) webpush.setVapidDetails(`mailto:${env('VAPID_EMAIL') || 'support@poshak.in'}`, env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

  const { data: rows } = await svc.from('notification_outbox').select('*').eq('status', 'pending').lt('attempts', 3).order('id').limit(50);
  let sent = 0, failed = 0, skipped = 0;

  for (const row of rows ?? []) {
    try {
      if (row.channel === 'whatsapp') {
        if (!env('WHATSAPP_TOKEN') || !env('WHATSAPP_PHONE_NUMBER_ID')) throw Object.assign(new Error('WhatsApp not configured'), { skip: true });
        await sendWhatsApp(row.to_phone, row.payload.name ?? 'there', row.payload.text);
      } else if (row.channel === 'sms') {
        if (!env('TWILIO_ACCOUNT_SID') || !env('TWILIO_AUTH_TOKEN') || !env('TWILIO_FROM')) throw Object.assign(new Error('SMS not configured'), { skip: true });
        await sendSms(row.to_phone, row.payload.text);
      } else if (row.channel === 'push') {
        if (!pushOn) throw Object.assign(new Error('Push not configured'), { skip: true });
        const { data: subs } = await svc.from('push_subscriptions').select('*').eq('user_id', row.user_id);
        for (const s of subs ?? []) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(row.payload));
          } catch (e) {
            // 404/410 = the browser dropped this subscription; forget it.
            if ((e as { statusCode?: number }).statusCode === 404 || (e as { statusCode?: number }).statusCode === 410) await svc.from('push_subscriptions').delete().eq('id', s.id);
            else throw e;
          }
        }
      }
      await svc.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1 }).eq('id', row.id);
      sent++;
    } catch (e) {
      const isSkip = (e as { skip?: boolean }).skip;
      await svc.from('notification_outbox').update({
        status: isSkip ? 'skipped' : row.attempts + 1 >= 3 ? 'failed' : 'pending',
        attempts: row.attempts + 1, error: String((e as Error).message).slice(0, 300),
      }).eq('id', row.id);
      if (isSkip) skipped++; else failed++;
    }
  }
  return json({ sent, failed, skipped });
});
