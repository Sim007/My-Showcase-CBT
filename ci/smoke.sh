#!/usr/bin/env bash
# ci/smoke.sh — één happy-path-aanroep over de draaiende compose-omgeving,
# waarvan de drie grenzen elk hun eigen bewijs afleiden. Herhaalt geen
# contract-scenario's (dat deden onderdeel 2-4 op JVM-niveau, onderdeel 5 op
# Playwright-niveau) — alleen bewijzen dat de grens over de échte stack werkt.
#
# Eén POST /api/payments (rechtstreeks naar Payment, niet via Order) volstaat
# voor alle drie: Payment is de enige service die in élk compose-profiel
# (order/payment/notification) draait, en processPayment() raakt binnen die
# ene aanroep order-payment (providerkant), payment-notification (publiceert
# naar RabbitMQ) én payment-external (roept de externe SOAP-provider aan).
#
# Gebruik: ci/smoke.sh [--boundary <naam>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gate-output.sh
source "$SCRIPT_DIR/lib/gate-output.sh"

BOUNDARY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --boundary) BOUNDARY="$2"; shift 2 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

service_url() {
  case "$1" in
    order)        echo "${ORDER_URL:-http://localhost:8080}" ;;
    payment)      echo "${PAYMENT_URL:-http://localhost:8081}" ;;
    notification) echo "${NOTIFICATION_URL:-http://localhost:8082}" ;;
  esac
}

field() {
  echo "$1" | grep -oE "\"$2\":(\"[^\"]*\"|[a-z]+)" | head -1 | sed -E 's/^[^:]*:"?([^"]*)"?$/\1/'
}

SMOKE_ORDER_ID="smoke-$(date +%s)"
BODY=""
STATUS=""

do_payment_call() {
  local response http_code
  response="$(curl -s -w '\n%{http_code}' -X POST "$(service_url payment)/api/payments" \
    -H 'Content-Type: application/json' \
    -d "{\"orderId\":\"$SMOKE_ORDER_ID\",\"amount\":12.34}" 2>/dev/null)" || { STATUS="000"; return; }
  http_code="$(echo "$response" | tail -1)"
  BODY="$(echo "$response" | sed '$d')"
  STATUS="$http_code"
}

# check_boundary <grens>
# Print "OK ..." of "FAIL <grens>: ..." op stdout; retourneert 1 bij FAIL.
check_boundary() {
  local boundary="$1"

  if [ "$STATUS" != "200" ]; then
    echo "FAIL $boundary: kon geen happy-path-aanroep doen (POST /api/payments gaf status ${STATUS:-onbereikbaar})"
    return 1
  fi

  case "$boundary" in
    order-payment)
      local payment_id status
      payment_id="$(field "$BODY" paymentId)"
      status="$(field "$BODY" status)"
      if [ -z "$payment_id" ] || [ -z "$status" ]; then
        echo "FAIL $boundary: respons mist paymentId/status ($BODY)"
        return 1
      fi
      echo "$boundary: OK (POST /api/payments -> 200, paymentId=$payment_id, status=$status)"
      ;;
    payment-external)
      local approved
      approved="$(field "$BODY" approved)"
      if [ "$approved" != "true" ]; then
        echo "FAIL $boundary: approved=$approved (verwacht true — SOAP-roundtrip naar de externe provider niet bevestigd)"
        return 1
      fi
      echo "$boundary: OK (SOAP-roundtrip via WireMock bevestigd, approved=true)"
      ;;
    payment-notification)
      local deadline=$((SECONDS + 10)) notifications
      while [ "$SECONDS" -lt "$deadline" ]; do
        notifications="$(curl -sf "$(service_url notification)/api/notifications?orderId=$SMOKE_ORDER_ID" 2>/dev/null || true)"
        if echo "$notifications" | grep -q "PAYMENT_APPROVED"; then
          echo "$boundary: OK (notificatie PAYMENT_APPROVED ontvangen voor $SMOKE_ORDER_ID)"
          return 0
        fi
        sleep 1
      done
      echo "FAIL $boundary: geen PAYMENT_APPROVED-notificatie ontvangen binnen 10s voor $SMOKE_ORDER_ID"
      return 1
      ;;
    *)
      echo "FAIL $boundary: onbekende grens" >&2
      return 1
      ;;
  esac
}

if [ -n "$BOUNDARY" ]; then
  BOUNDARIES=("$BOUNDARY")
else
  BOUNDARIES=("order-payment" "payment-notification" "payment-external")
fi

gate_header "keten-smoke" "${BOUNDARY:-alle grenzen}" "n.v.t. (happy-path-aanroep, geen schemacheck)" "blokkerend"

do_payment_call

REPORT=""
FAILED=false
for b in "${BOUNDARIES[@]}"; do
  set +e
  line="$(check_boundary "$b")"
  rc=$?
  set -e
  REPORT="$REPORT$line"$'\n'
  [ "$rc" -ne 0 ] && FAILED=true
done

if [ "$FAILED" = true ]; then
  gate_fail "$REPORT" \
    "de grens werkt niet over de daadwerkelijk draaiende stack, ook al zijn de losse contractverificaties (onderdeel 2-4) en de healthcheck (onderdeel 6) beide groen — dit vangt integratiefouten die alleen op de échte stack zichtbaar worden."
  exit 1
fi

gate_pass "$REPORT" \
  "de grens werkt end-to-end op de draaiende compose-omgeving — niet alleen in isolatie (JVM-tests) of tegen gepinde versies (healthcheck), maar in de echte samenstelling."
exit 0
