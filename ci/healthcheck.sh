#!/usr/bin/env bash
# ci/healthcheck.sh — leest /actuator/info van de draaiende services, bouwt de
# grens-graaf en valideert per grens in beide richtingen: zelfde major én
# pin-minor <= served-minor. Draait standaard blokkerend; --report-only
# degradeert een FAIL naar een niet-blokkerende melding (zelfde patroon als
# diff-gate.sh). Geen jq — grep/sed/cut, zelfde stijl als diff-gate.sh.
#
# Gebruik: ci/healthcheck.sh [--report-only] [--boundary <naam>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gate-output.sh
source "$SCRIPT_DIR/lib/gate-output.sh"

REPORT_ONLY=false
BOUNDARY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --report-only) REPORT_ONLY=true; shift ;;
    --boundary) BOUNDARY="$2"; shift 2 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

MODE="blokkerend"
$REPORT_ONLY && MODE="report-only"

service_url() {
  case "$1" in
    order)        echo "${ORDER_URL:-http://localhost:8080}" ;;
    payment)      echo "${PAYMENT_URL:-http://localhost:8081}" ;;
    notification) echo "${NOTIFICATION_URL:-http://localhost:8082}" ;;
  esac
}

# extract_version <json> <serves|consumes> <contractnaam>
extract_version() {
  echo "$1" | grep -oE "\"$3\":\"[^\"]*\"" | head -1 | sed -E 's/.*:"([^"]*)"/\1/'
}

major() { echo "$1" | cut -d. -f1; }
minor() { echo "$1" | cut -d. -f2; }

# check_boundary <grens> <provider-service|""> <consumer-service>
# Print "OK" of "FAIL <grens>: pinned X.Y.Z, served A.B.C" op stdout; retourneert 1 bij FAIL.
check_boundary() {
  local boundary="$1" provider="$2" consumer="$3"

  if [ -z "$provider" ]; then
    echo "$boundary: n.v.t. — geen lokale provider (buiten de tribe, alleen consumerkant)"
    return 0
  fi

  local provider_json consumer_json served pinned
  if ! provider_json="$(curl -sf "$(service_url "$provider")/actuator/info")"; then
    echo "FAIL $boundary: kon /actuator/info van $provider niet bereiken"
    return 1
  fi
  if ! consumer_json="$(curl -sf "$(service_url "$consumer")/actuator/info")"; then
    echo "FAIL $boundary: kon /actuator/info van $consumer niet bereiken"
    return 1
  fi

  served="$(extract_version "$provider_json" serves "$boundary")"
  pinned="$(extract_version "$consumer_json" consumes "$boundary")"

  if [ -z "$served" ] || [ -z "$pinned" ]; then
    echo "FAIL $boundary: kon serves/consumes-waarde niet vinden (served='$served', pinned='$pinned')"
    return 1
  fi

  if [ "$(major "$pinned")" != "$(major "$served")" ]; then
    echo "FAIL $boundary: pinned $pinned, served $served (major komt niet overeen)"
    return 1
  fi
  if [ "$(minor "$pinned")" -gt "$(minor "$served")" ]; then
    echo "FAIL $boundary: pinned $pinned, served $served"
    return 1
  fi

  echo "$boundary: OK (pinned $pinned, served $served)"
  return 0
}

if [ -n "$BOUNDARY" ]; then
  BOUNDARIES=("$BOUNDARY")
else
  BOUNDARIES=("order-payment" "payment-notification" "payment-external")
fi

gate_header "healthcheck" "${BOUNDARY:-alle grenzen}" "pinned vs served" "$MODE"

REPORT=""
FAILED=false
for b in "${BOUNDARIES[@]}"; do
  set +e
  case "$b" in
    order-payment)         line="$(check_boundary "$b" payment order)" ;;
    payment-notification)  line="$(check_boundary "$b" payment notification)" ;;
    payment-external)      line="$(check_boundary "$b" "" payment)" ;;
    *)
      echo "Onbekende grens: $b (verwacht order-payment, payment-notification of payment-external)" >&2
      exit 2
      ;;
  esac
  rc=$?
  set -e
  REPORT="$REPORT$line"$'\n'
  [ "$rc" -ne 0 ] && FAILED=true
done

if [ "$FAILED" = true ]; then
  gate_fail "$REPORT" \
    "een pin die verder staat dan wat de provider serveert (of een major-mismatch) zou de omgeving stilzwijgend incompatibel maken — de healthcheck weigert dit vóór de testsuite draait."
  if $REPORT_ONLY; then
    exit 0
  fi
  exit 1
fi

gate_pass "$REPORT" \
  "elke consumer is gepind op een versie die de provider daadwerkelijk serveert — de omgeving is compositie-compatibel."
exit 0
