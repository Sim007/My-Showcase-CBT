#!/usr/bin/env bash
# demo/run.sh — geleide, stapsgewijze demo-runs van de drie acceptatiescenario's uit
# claude-code.prompt.md plus een bonusdemo. Elk scenario: toon de uitgangssituatie → breng de
# breuk aan en toon de diff → draai de gate en toon het falen → draai terug en toon groen.
# Enter-pauzes per stap — de presentator bepaalt het tempo, geen live typwerk (alle commando's
# staan al in dit script). Draait ALTIJD volledig terug: de repo eindigt schoon.
#
# Gebruik: demo/run.sh <diff-gate|consumer-stub|healthcheck|bonus-minor>
set -uo pipefail
# Bewust geen -e: sommige stappen laten een gate bewust FALEN — dat is het punt van de demo.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

step()  { echo; echo -e "${BLUE}── Stap $1: $2 ──${NC}"; }
pause() { echo; read -rp "$(printf '%b' "${YELLOW}Druk op Enter om verder te gaan...${NC} ")" _; }
run()   { echo -e "${GREEN}\$ $*${NC}"; eval "$*"; }

# Portable in-place sed (GNU vs BSD) — geen presentatorafhankelijke syntaxverschillen.
sed_inplace() {
  local expr="$1" file="$2"
  if sed --version >/dev/null 2>&1; then
    sed -i "$expr" "$file"
  else
    sed -i '' "$expr" "$file"
  fi
}

wait_for_health() {
  local name="$1" url="$2" i=0
  echo -n "Wachten op $name..."
  while ! curl -sf "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -ge 60 ] && { echo; echo -e "${RED}$name niet gezond geworden binnen 120s${NC}"; return 1; }
    sleep 2
  done
  echo " gereed"
}

require_local_stack() {
  if ! curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
    echo -e "${RED}Order (localhost:8080) is niet bereikbaar.${NC}"
    echo "Start eerst de lokale stack: cd CBT-D && ./start.sh"
    exit 1
  fi
}

end_of_scenario() {
  echo
  echo -e "${GREEN}Scenario '$1' voltooid — repo staat weer schoon.${NC}"
  echo "Optioneel: demo/grensrapport.sh voor een volledig grensrapport (vereist een draaiende stack)."
}

# ---------------------------------------------------------------------------
scenario_diff_gate() {
  local base="contracts/order-payment/1.0.0/openapi.yaml"
  local next="contracts/order-payment/1.1.0/openapi.yaml"

  step 1 "Uitgangssituatie — het gepubliceerde contract"
  run "grep -A4 'PaymentResponse:' $base"
  run "./ci/diff-gate.sh --contract order-payment"
  pause

  step 2 "Breuk aanbrengen — orderId niet meer verplicht in de respons"
  run "cp -r contracts/order-payment/1.0.0 contracts/order-payment/1.1.0"
  sed_inplace 's/required: \[paymentId, orderId, status, approved\]/required: [paymentId, status, approved]/' "$next"
  run "diff -u $base $next"
  pause

  step 3 "Gate draaien — verwacht: FAIL"
  run "./ci/diff-gate.sh --contract order-payment"
  pause

  step 4 "Terugdraaien — repo weer schoon"
  run "rm -rf contracts/order-payment/1.1.0"
  run "./ci/diff-gate.sh --contract order-payment"
  pause

  end_of_scenario "diff-gate"
}

# ---------------------------------------------------------------------------
scenario_consumer_stub() {
  local file="order/backend/src/main/kotlin/nl/showcase/order/service/OrderService.kt"

  step 1 "Uitgangssituatie — Order's consumerkant-verificatie"
  run "./ci/contract-verify.sh --contract order-payment --side consumer"
  pause

  step 2 "Breuk aanbrengen — orderId verdwijnt uit Order's uitgaande PaymentRequest"
  sed_inplace 's/data class PaymentRequest(val orderId: String, val amount: Double)/data class PaymentRequest(val amount: Double)/' "$file"
  sed_inplace 's/PaymentRequest(orderId = orderId, amount = amount)/PaymentRequest(amount = amount)/' "$file"
  run "git diff -- $file"
  pause

  step 3 "Gate draaien — verwacht: FAIL (WireMock-validator vangt het ontbrekende orderId)"
  run "./ci/contract-verify.sh --contract order-payment --side consumer"
  pause

  step 4 "Terugdraaien — repo weer schoon"
  run "git checkout -- $file"
  run "./ci/contract-verify.sh --contract order-payment --side consumer"
  pause

  end_of_scenario "consumer-stub"
}

# ---------------------------------------------------------------------------
scenario_healthcheck() {
  require_local_stack

  step 1 "Uitgangssituatie — healthcheck op order-payment"
  run "./ci/healthcheck.sh --boundary order-payment"
  pause

  step 2 "Breuk aanbrengen — Order pint 2.5.0, Payment serveert 2.3.0, containers herbouwen"
  sed_inplace 's/<contracts.consumes.order-payment>1.0.0<\/contracts.consumes.order-payment>/<contracts.consumes.order-payment>2.5.0<\/contracts.consumes.order-payment>/' order/backend/pom.xml
  sed_inplace 's/<contracts.serves.order-payment>1.0.0<\/contracts.serves.order-payment>/<contracts.serves.order-payment>2.3.0<\/contracts.serves.order-payment>/' payment/backend/pom.xml
  run "git diff -- order/backend/pom.xml payment/backend/pom.xml"
  run "(cd CBT-D && docker compose -f docker-compose.yml --profile local up -d --build order payment-backend)"
  wait_for_health "Order" "http://localhost:8080/actuator/health"
  wait_for_health "Payment" "http://localhost:8081/actuator/health"
  pause

  step 3 "Gate draaien — verwacht: FAIL order-payment: pinned 2.5.0, served 2.3.0"
  run "./ci/healthcheck.sh --boundary order-payment"
  pause

  step 4 "Terugdraaien — pins herstellen, containers herbouwen, repo weer schoon"
  run "git checkout -- order/backend/pom.xml payment/backend/pom.xml"
  run "(cd CBT-D && docker compose -f docker-compose.yml --profile local up -d --build order payment-backend)"
  wait_for_health "Order" "http://localhost:8080/actuator/health"
  wait_for_health "Payment" "http://localhost:8081/actuator/health"
  run "./ci/healthcheck.sh --boundary order-payment"
  pause

  end_of_scenario "healthcheck"
}

# ---------------------------------------------------------------------------
scenario_bonus_minor() {
  local base="contracts/order-payment/1.0.0/openapi.yaml"
  local next="contracts/order-payment/1.1.0/openapi.yaml"

  step 1 "Uitgangssituatie — het gepubliceerde contract"
  run "./ci/diff-gate.sh --contract order-payment"
  pause

  step 2 "Wijziging aanbrengen — een nieuw, optioneel veld toegevoegd (backward-compatible)"
  run "cp -r contracts/order-payment/1.0.0 contracts/order-payment/1.1.0"
  python3 - "$next" <<'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
anchor = "        approved:\n          type: boolean\n          example: true\n"
addition = "        discountCode:\n          type: string\n          example: \"WELKOM10\"\n"
assert anchor in content, "anchor niet gevonden — is het contract gewijzigd?"
content = content.replace(anchor, anchor + addition, 1)
with open(path, "w") as f:
    f.write(content)
PYEOF
  run "diff -u $base $next"
  pause

  step 3 "Gate draaien — verwacht: PASS (non-breaking, geen major-bump nodig)"
  run "./ci/diff-gate.sh --contract order-payment"
  pause

  step 4 "Terugdraaien — repo weer schoon"
  run "rm -rf contracts/order-payment/1.1.0"
  run "./ci/diff-gate.sh --contract order-payment"
  pause

  end_of_scenario "bonus-minor"
}

# ---------------------------------------------------------------------------
case "${1:-}" in
  diff-gate)      scenario_diff_gate ;;
  consumer-stub)  scenario_consumer_stub ;;
  healthcheck)    scenario_healthcheck ;;
  bonus-minor)    scenario_bonus_minor ;;
  *)
    echo "Gebruik: demo/run.sh <diff-gate|consumer-stub|healthcheck|bonus-minor>" >&2
    exit 2
    ;;
esac
