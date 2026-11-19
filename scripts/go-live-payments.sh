#!/usr/bin/env bash
# One-time setup that switches on Razorpay payments for Poshak.
# Run it in your own terminal (it asks for your Razorpay keys; they never go into the code or git):
#   bash scripts/go-live-payments.sh
set -euo pipefail

REF="ypckpieqipvovmfcotgq"                       # Supabase project
SB="npx -y supabase@3.2.0"                       # Supabase CLI, run through npx (no install needed)
FUNCS="create-payment verify-payment delivery-qr create-intent-payment refund-payment reconcile-payments send-notifications"

cd "$(dirname "$0")/.."
echo "== Poshak: switch on Razorpay payments =="
echo
echo "Step 1/4  Sign in to Supabase (a browser window opens)."
$SB login

echo
echo "Step 2/4  Razorpay keys: Razorpay Dashboard → Account & Settings → API Keys."
echo "          Use TEST keys (rzp_test_…) to try it first, LIVE keys (rzp_live_…) to take real money."
read -r -p "  Razorpay Key ID: " KEY_ID
read -r -s -p "  Razorpay Key Secret (hidden): " KEY_SECRET; echo
case "$KEY_ID" in rzp_test_*|rzp_live_*) ;; *) echo "That does not look like a Razorpay Key ID (rzp_test_… or rzp_live_…)."; exit 1;; esac
[ -n "$KEY_SECRET" ] || { echo "Key Secret is empty."; exit 1; }
read -r -p "  Your website domain [pohsak.com]: " DOMAIN; DOMAIN="${DOMAIN:-pohsak.com}"
WEBHOOK_SECRET="$(openssl rand -hex 24)"
ORIGINS="https://${DOMAIN},https://www.${DOMAIN},http://localhost:3000,http://localhost:5173"

echo
echo "Step 3/4  Saving secrets to Supabase (server side only)…"
$SB secrets set --remote="$REF" --yes \
  RAZORPAY_KEY_ID="$KEY_ID" RAZORPAY_KEY_SECRET="$KEY_SECRET" \
  RAZORPAY_WEBHOOK_SECRET="$WEBHOOK_SECRET" ALLOWED_ORIGINS="$ORIGINS"

echo
echo "Step 4/4  Deploying the payment functions…"
# shellcheck disable=SC2086
$SB functions deploy $FUNCS --remote="$REF" --yes --use-api
$SB functions deploy razorpay-webhook --remote="$REF" --yes --use-api --no-verify-jwt

echo
code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "Origin: https://${DOMAIN}" "https://${REF}.supabase.co/functions/v1/create-payment")
if [ "$code" = "404" ]; then echo "!! create-payment is still not reachable (HTTP 404). Check the deploy output above."; else echo "OK: payment functions are live (HTTP $code)."; fi

cat <<EOF

== Last step, in the Razorpay Dashboard (2 minutes) ==
Account & Settings → Webhooks → Add new webhook
  Webhook URL:    https://${REF}.supabase.co/functions/v1/razorpay-webhook
  Secret:         ${WEBHOOK_SECRET}
  Active events:  payment.captured, qr_code.credited, refund.processed, refund.failed
(Copy the secret now; it is not saved anywhere else. If you lose it, just run this script again.)

Then open the app: "Pay online now" switches on by itself.
Test it: place an order, pay online, and check Admin → Finance and Admin → System health (last webhook).
EOF
