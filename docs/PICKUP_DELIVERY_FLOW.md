# How pickup & delivery works at Poshak

## 0. What the research did and didn't confirm
- **Razorpay (official docs, verified):** a UPI QR can be `single_use` + `fixed_amount`, `close_by` must be 2 min–2 h ahead, and both "UPI QR" and "single use" must be enabled by Razorpay support. A paid QR fires `qr_code.credited`. Webhooks are signed with HMAC-SHA256 of the *raw* body, can arrive more than once (dedupe on `x-razorpay-event-id`), and Checkout payments are verified with HMAC over `order_id|payment_id`.
- **Laundry apps (general sources):** price is an *estimate* until the clothes are weighed at pickup; the rider app is where weighing, proof and handover happen.
- **Swiggy's rider app:** its internals are not published. The only public facts: customers can pay cash or UPI at delivery, and COD cash is Swiggy's money that the rider owes back (riders have cash-holding limits). Everything below is *our* design using those proven patterns, not a copy of Swiggy's code.

## 1. The three people
| Who | Where | Sees |
|---|---|---|
| Customer | main app | live map, status, **pickup OTP / delivery OTP**, estimated → final bill, pay-online button |
| Captain | `/#/captain` | assigned jobs, address + tap-to-call + navigate, weigh-in screen, payment screen, **never sees OTPs** |
| Admin | `/#/admin` | all orders, assign captain, payments, refunds owed, cash held by each captain |

## 1b. Who gets which screen (login & roles)
One Google login for everyone. The server matches the signed-in email against the `staff_emails` list and assigns the role:

| Email is… | Role | Lands on |
|---|---|---|
| in `staff_emails` as **admin** (the makers) | admin | `/#/admin` – all orders, payments, cash, refunds, **Team** |
| in `staff_emails` as **captain** (delivery partners) | captain | `/#/captain` – only their own jobs |
| not listed | customer | the customer app |

- The team link to share is `/#/staff`. Anyone who signs in anywhere (even the customer login) is redirected to their own screen once per session.
- Admins add/remove people from **Dashboard → Team**; removing someone demotes them on the spot. Only the very first admin needs one line of SQL.
- Roles are checked **in the database**, not just hidden in the UI, so a customer who types `/#/admin` sees "Not on the team list" and the data calls are refused.

## 2. Order life
```
placed → captain_assigned → picked_up → out_for_delivery → delivered
   └────────── cancelled (only before pickup) ──────────┘
```
1. **Placed** – customer books. Server prices the items itself (client number is ignored). OTPs are generated server-side into a table captains cannot read.
2. **Captain assigned** (admin) – customer sees the captain, tracks them live (captain app streams GPS every 4 s).
3. **Pickup** – captain arrives, customer reads the **pickup OTP**. Captain enters it and the **actual weight/count**. Server checks the OTP, recomputes the **final bill**, moves to `picked_up`. Customer's app updates instantly.
4. **Cleaning** – clothes are processed. Captain taps *Start delivery* → `out_for_delivery`.
5. **Delivery** – captain must collect any amount due (below) and then enter the customer's **delivery OTP**. The server refuses `delivered` unless due = 0 **and** the OTP matches.

## 3. Money
`due = (final bill, else estimate) − paid`. Three ways it gets paid:

**A. Pay online now (prepaid)** – customer picks it at checkout → Razorpay Checkout (UPI/cards). Flow: `create-payment` function makes a Razorpay Order → browser pays → `verify-payment` checks the signature and asks Razorpay what was really paid → `apply_payment()` records it. The webhook (`payment.captured`) does the same; the unique payment id makes it idempotent. If the weigh-in raises the bill, the difference is simply "due" at delivery; if it lowers it, admin sees **refund owed**.

**B. Pay on delivery – cash** – captain taps *Cash received ₹X* → `collect_cash()` records a `payments` row (method `cash`, `collected_by` = captain). That cash is now **owed back by the captain** and shows in their "Cash in hand"; admin taps *Mark deposited* when they hand it over.

**C. Pay on delivery – UPI QR (the "Swiggy QR" flow)** – captain taps *Show UPI QR* → `delivery-qr` creates a **single-use, fixed-amount Razorpay QR** for exactly what is due (15 min expiry). Customer scans with any UPI app → Razorpay fires `qr_code.credited` → webhook → `apply_payment()` → order flips to paid → captain's screen updates by itself (realtime) and the OTP box unlocks. Money goes straight to your Razorpay account, so the captain holds no cash.

## 4. Why it's safe
- Browsers can only read (RLS) and insert an order. **Every change is a server function** that checks who you are: a captain cannot mark paid, edit a bill, read an OTP, or deliver without payment+OTP. (30 automated checks of this passed against real Postgres.)
- Prices come from `service_rates` in the database, not from the browser.
- Payment truth comes only from Razorpay (signature-checked), applied by a server-only function.

## 5. Edge cases to handle operationally
| Case | What happens today |
|---|---|
| Customer not home at pickup | Captain can't proceed without the OTP; admin cancels or reassigns. (No "reschedule" button yet.) |
| Weight disagrees with estimate | Customer sees the final bill the moment the captain confirms. (No dispute button yet.) |
| QR paid *and* cash taken | Second payment is stored; order shows **refund owed**. |
| Cancel after prepaying | Allowed only before pickup; admin sees refund owed, refunds in Razorpay, records it. |
| Webhook retried | No double count (unique payment id + event id). |

## 6. Not built yet
Push/SMS notifications · photo proof at pickup/delivery · captain payouts & cash limits · GST invoices · automatic Razorpay refunds · scheduled-slot dispatching · customer phone numbers for existing addresses (new ones require it).

## 7. Test checklist (Razorpay **test mode**)
1. Run `supabase/schema.sql`, deploy functions, set secrets, add webhook (see `supabase/README.md`).
2. Make yourself admin and a second Google account a captain.
3. Place a prepaid order → pay with Razorpay's test UPI/card → card shows **PAID**.
4. Place a COD order → assign captain → on the captain page weigh with a different weight → customer sees new bill.
5. Out for delivery → *Show UPI QR* → pay it from Razorpay's test tools → captain screen unlocks → delivery OTP → delivered.
6. Another COD order → *Cash received* → check **Cash in hand** → admin *Mark deposited*.
