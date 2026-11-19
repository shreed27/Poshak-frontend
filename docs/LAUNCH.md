# Poshak — launch & operations guide

Everything the code needs from the outside world, in the order you do it. Tick as you go.

## 1. Database (Supabase → SQL Editor, run in order, once each)
Run every file in `supabase/migrations/` from `0001` to `0014`. `0014` sets the three launch services and adds the quote flow. Each says **Success. No rows returned.** Nothing existing is deleted.
- Turn on **pg_cron** (Database → Extensions) *before* `0013` if you want the 8:00 AM admin summary scheduled automatically. If you enable it later, re-run the last `do $$ … cron.schedule …` block of `0013`.
- Authentication → Providers: enable **Google**. Optional: **Phone** (needs an SMS provider such as Twilio; India requires DLT registration for SMS) and **Email** (set custom SMTP — the built-in mailer allows only a few emails an hour).
- Authentication → URL Configuration: Site URL = your domain; add `https://yourdomain/**` and `http://localhost:3000/**` to Redirect URLs.

## 2. Edge functions and Razorpay
Quickest: run `bash scripts/go-live-payments.sh` in your terminal. It signs you in to Supabase, asks for your Razorpay keys, saves them as secrets, deploys every function and prints the webhook URL + secret to paste into Razorpay. The manual steps it performs are below.

```bash
SB="npx -y supabase@3.2.0"; REF=ypckpieqipvovmfcotgq
$SB login
$SB secrets set --remote=$REF RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=a-long-random-string
$SB secrets set --remote=$REF ALLOWED_ORIGINS=https://pohsak.com,https://www.pohsak.com     # only your site may call the functions
$SB functions deploy create-payment verify-payment delivery-qr create-intent-payment refund-payment reconcile-payments send-notifications --remote=$REF --use-api
$SB functions deploy razorpay-webhook --remote=$REF --use-api --no-verify-jwt
```
Optional notification secrets: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`.

## 3. Razorpay
1. Finish KYC. Ask support to enable **UPI QR** and **single-use QR codes**.
2. Test mode first. Settings → Webhooks → add `https://YOUR_REF.supabase.co/functions/v1/razorpay-webhook` with your `RAZORPAY_WEBHOOK_SECRET`. Tick `payment.captured`, `qr_code.credited`, `refund.processed`, `refund.failed`.
3. Do one of each in test mode: online payment, UPI QR, cash, full refund, partial refund. Admin → **System health** should show a recent webhook.
4. Switch to live: new keys → `supabase secrets set …`, and add the same webhook under live mode.
5. Run **Finance → Reconciliation → Last 24 h** daily (or after each busy day).

## 4. Website (Vercel / Netlify)
Build command `npm run build`, output `dist`. Environment variables:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`, and for production routing `VITE_OSRM_URL` (see below).
Add your domain; DNS records are shown by the host. Then add the domain to the Google OAuth client (authorized JavaScript origins, and the Supabase callback `https://YOUR_REF.supabase.co/auth/v1/callback` as a redirect URI).

## 5. Live tracking: routing service
The default `router.project-osrm.org` is a free demo server: fine for a pilot, **not** for launch traffic. Use one of:
- Your own OSRM (docker `osrm/osrm-backend` with an India extract), or
- A hosted OSRM-compatible service, then set `VITE_OSRM_URL=https://your-routing-host`.
ETAs are stretched by *Prices & settings → Operations → Live tracking & ETA* (traffic factor, buffer). Compare 10–20 real trips and tune.

## 6. First data (Admin dashboard)
The catalogue is Wash & Fold ₹59/kg, Wash, Fold & Iron ₹89/kg, and Alteration & Dry Cleaning (price on request). Change prices under Prices & settings → Services. Quote requests arrive in **Quotes** (reply with a price; the customer accepts from their app and it becomes a normal order). Prices & settings → services, prices, slots, service area, business & GST, support contacts, claims policy. Riders / Laundromats → add Gmail + details. Make the first admin with:
`insert into public.staff_emails (email, role, name, phone) values ('you@gmail.com','admin','Your Name','98xxxxxxxx');`

## 7. Pilot checklist (15–20 real orders before opening up)
- [ ] Place → assign → accept → pickup (weigh, count, photos, OTP) → laundry receives → ready → delivery (payment, OTP) with real people and phones
- [ ] Customer sees the ETA card and map move; rider's phone stays awake; admin Live map matches
- [ ] Online pay, UPI QR, cash, refund to wallet, refund to Razorpay — each once
- [ ] Complaint → resolve; wallet credit; invoice downloads with the right GST
- [ ] Pause and suspend a rider; confirm they lose access
- [ ] System health shows no unresolved errors; reconciliation matches

## 8. Safety nets in the product
- **System health** page: app errors (we collect them ourselves — no third-party account), last Razorpay webhook, failed refunds, open alerts.
- **Audit log**: every price, setting, team, wallet, payout and order change.
- **Backups**: Supabase free plan has none you can rely on. Turn on daily backups / point-in-time recovery (Pro plan) before real money flows.
- **Staging**: create a second Supabase project, run the same migrations, and point a Vercel preview at it. Never test on the live project.
- **Private photo buckets** (`order-photos`, `partner-docs`, `quote-photos`) are created by the migrations.

## 9. Known limits
- Hindi / Kannada cover navigation, order tracking, live ETA and the rider app's main screens; admin screens and long forms are English. The translations are a first pass — get a native speaker to review.
- Rate limiting on payment functions is in-memory per instance (stops loops and casual abuse, not a determined attacker). Add Supabase's captcha / WAF for more.
- Masked calling between rider and customer needs a telephony provider (Exotel / Twilio Proxy) — not built.
- Payouts to riders and laundromats are recorded in the app but paid manually (UPI / bank). RazorpayX Payouts can automate this later.
