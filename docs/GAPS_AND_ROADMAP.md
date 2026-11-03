# What we are still missing (researched)

Evidence is mostly vendor blogs and company pages, so treat it as directional, not proof. Where sources conflict it says so.

## Must fix before real customers (pilot-blocking)
| # | Gap | Why (source summary) |
|---|---|---|
| 1 | **Notifications outside the app** (WhatsApp/SMS/push) for: captain assigned, picked up, bill ready, out for delivery | Every guide lists push/status notifications as core. WhatsApp vendors report far higher open rates than SMS and use replies to reschedule failed deliveries; opt-in is required. Today updates only show while the app is open. |
| 2 | **Garment checklist + photos at pickup and delivery** (count, tag/barcode, condition) | Missing items and damage are the most common laundry complaints; UClean barcode-tags every garment; delivery apps use photo proof to settle disputes. We have OTP + weight only. |
| 3 | **Complaints / claims flow + published policy** ("report a problem" on an order, ticket id, response SLA) | Dhobilite publishes lost/damaged compensation (up to 3× processing cost as credit). India's e-commerce rules summaries require a visible grievance officer with acknowledgement within 48 h and resolution within a month, plus clear refund/cancellation info. We have a grievance email in the legal text but no ticketing. |
| 4 | **GST invoice per order** | One source says laundry is 18% (dry-cleaning code 999712); another says wash/iron/fold is 5%. **Conflict: confirm with a CA / CBIC notification.** Registration threshold ₹20 L turnover (₹10 L special-category states). No invoices are generated today. |
| 5 | **Not-home / reschedule / no-show handling** | Delivery apps live on rescheduling; today the order just sits until an admin cancels. |
| 6 | **Slot capacity** | Slots are unlimited, so 40 people can book 5–7 pm with 2 captains. |
| 7 | **Admin-editable prices, discounts, slots, service area** | Prices live in SQL/code and the 20% "member discount" is applied to everyone. Guides list price/offer/hours management as a basic admin panel feature. |
| 8 | **Who cleans, and "ready for delivery"** | We removed hubs, but someone still washes the clothes. Today the captain taps *Start delivery*; a cleaner/partner-laundry status (received, ready) is missing. |

## Next (retention & ops quality)
- Coupon codes wired into checkout (codes exist in data, unused) · referral · wallet/credit (also how claims get paid) · subscriptions (guides list as retention/revenue).
- Phone-number OTP login (Google-only is a barrier for many Indian customers).
- Captain: accept/decline, earnings screen, support/incident report; installable PWA.
- Admin analytics: repeat-customer rate, average order value, late orders, captain performance; customer list; order search/export.
- Rate the captain separately from the service; tips.
- Kannada/Hindi UI.

## Later
Route batching/heat maps, incentives, SOS button (none of the sources described an explicit SOS), selfie liveness for captains, COD-abuse limits, cash-holding limits per captain (Swiggy-style).

## Engineering hardening
Error monitoring (Sentry) · backups · audit log of admin actions · rate limiting on edge functions · automatic Razorpay refunds + daily reconciliation report · CI with the database test suite · separate staging project.
