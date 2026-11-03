# Supabase setup

1. SQL Editor → run `schema.sql`.
2. Authentication → Providers → Google: enable (same client ID/secret you use for sign-in).
3. Razorpay Dashboard (test mode first): copy Key ID + Key Secret; ask Razorpay support to enable **UPI QR** and **single-use QR codes**.
4. Deploy the functions and set secrets:

```bash
npm i -g supabase && supabase login && supabase link --project-ref YOUR_REF
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-string
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy delivery-qr
supabase functions deploy razorpay-webhook --no-verify-jwt
```

5. Razorpay → Settings → Webhooks → add `https://YOUR_REF.supabase.co/functions/v1/razorpay-webhook`
   with the same secret as `RAZORPAY_WEBHOOK_SECRET`; tick **payment.captured** and **qr_code.credited**.
6. Authentication → URL Configuration: add your site URL (e.g. `http://localhost:3000` and your live domain) to **Redirect URLs**.
7. Make the first admin (once, in the SQL Editor):
   `insert into public.staff_emails (email, role, name, phone) values ('your-gmail@gmail.com', 'admin', 'Your Name', '9876543210');`
8. Open `https://YOUR-SITE/#/staff`, sign in with that Google account → you land on the dashboard.
   From **Team** inside the dashboard, add every other maker (admin) or delivery partner with their Google email, **name, mobile number and vehicle**. These details are pre-filled on their profile the moment they sign in (customers see a captain's name, phone and vehicle on the order). Send them the same `/#/staff` link. Team members only ever see their own app, never the customer app.
