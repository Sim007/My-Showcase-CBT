#!/usr/bin/env bash
# ci/contract-verify.sh — providerkant en consumerkant contractverificatie, per grens.
#
# Functioneel voor:
#   --contract order-payment       (onderdeel 2, REST): swagger-request-validator-core
#                                   (providerkant, + springdoc-drift-check) en
#                                   swagger-request-validator-wiremock-junit5 (consumerkant).
#   --contract payment-notification (onderdeel 3, async): networknt json-schema-validator
#                                   tegen het uit de AsyncAPI geëxtraheerde JSON Schema.
# Overige contracten geven nog NOT-IMPLEMENTED (volgt in onderdeel 4, SOAP).
#
# Gebruik: ci/contract-verify.sh --contract <naam> --side provider|consumer
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/gate-output.sh
source "$SCRIPT_DIR/lib/gate-output.sh"

CONTRACT=""
SIDE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --contract) CONTRACT="$2"; shift 2 ;;
    --side) SIDE="$2"; shift 2 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$CONTRACT" ] || [ -z "$SIDE" ]; then
  echo "Gebruik: ci/contract-verify.sh --contract <naam> --side provider|consumer" >&2
  exit 2
fi

gate_header "contract-verify" "$CONTRACT" "$CONTRACT@1.0.0 ($SIDE-kant)" "$SIDE"

# run_mvn_test <module-pad> <testklasse>
# Zet MVN_OUTPUT/MVN_EXIT; gebruikt geen 'local' buiten een functie-context nodig hier.
run_mvn_test() {
  local module="$1" test_class="$2"
  set +e
  MVN_OUTPUT="$(cd "$module" && mvn -B -q -Dtest="$test_class" test 2>&1)"
  MVN_EXIT=$?
  set -e
}

verify_order_payment_provider() {
  local module="$ROOT/payment/backend"
  run_mvn_test "$module" "PaymentProviderContractTest"

  if [ "$MVN_EXIT" -ne 0 ]; then
    gate_fail "mvn test (PaymentProviderContractTest) faalde:
$MVN_OUTPUT" \
      "de Payment-implementatie wijkt af van de gepinde OpenAPI-spec — providerkant-verificatie stopt dit vóór een release."
    exit 1
  fi

  local generated_spec="$module/target/generated-openapi.json"
  local published_spec="$ROOT/contracts/order-payment/1.0.0/openapi.yaml"

  if [ ! -f "$generated_spec" ]; then
    gate_fail "Geen gegenereerde spec gevonden op $generated_spec (springdoc-drift-check kon niet draaien)." \
      "zonder gegenereerde spec kan niet worden bewezen dat code en contract synchroon lopen."
    exit 1
  fi

  set +e
  local drift_output
  drift_output="$(docker run --rm \
    -v "$published_spec:/published.yaml:ro" \
    -v "$generated_spec:/generated.yaml:ro" \
    tufin/oasdiff diff /published.yaml /generated.yaml 2>&1)"
  set -e

  if [ -n "$(echo "$drift_output" | tr -d '[:space:]')" ]; then
    gate_fail "springdoc-drift-check: gegenereerde spec wijkt af van de gepubliceerde spec:
$drift_output" \
      "de live Payment-API en het gepubliceerde contract zijn uit sync geraakt — dit voorkomt dat een stilzwijgend afwijkende implementatie ongemerkt blijft."
    exit 1
  fi

  gate_pass "mvn test (PaymentProviderContractTest): alle interacties conform contracts/order-payment/1.0.0/openapi.yaml.
springdoc-drift-check: geen afwijking tussen gegenereerde en gepubliceerde spec." \
    "Payment's daadwerkelijke gedrag komt exact overeen met het gepubliceerde contract, nu en structureel (drift-check)."
  exit 0
}

verify_order_payment_consumer() {
  local module="$ROOT/order/backend"
  run_mvn_test "$module" "OrderPaymentConsumerContractTest"

  if [ "$MVN_EXIT" -ne 0 ]; then
    gate_fail "mvn test (OrderPaymentConsumerContractTest) faalde:
$MVN_OUTPUT" \
      "Order stuurt een niet-spec-conform verzoek naar Payment — de WireMock-stub-validatie ving dit vóór een release."
    exit 1
  fi

  gate_pass "mvn test (OrderPaymentConsumerContractTest): elk verzoek van Order naar de Payment-stub voldoet aan contracts/order-payment/1.0.0/openapi.yaml." \
    "Order's uitgaande aanroepen zijn spec-conform — een regressie hierin faalt de consumerkant-gate direct."
  exit 0
}

verify_payment_notification_provider() {
  local module="$ROOT/payment/backend"
  run_mvn_test "$module" "PaymentNotificationProducerContractTest"

  if [ "$MVN_EXIT" -ne 0 ]; then
    gate_fail "mvn test (PaymentNotificationProducerContractTest) faalde:
$MVN_OUTPUT" \
      "het bericht dat Payment naar de payment.notifications-queue publiceert wijkt af van de gepinde AsyncAPI-payload — providerkant-verificatie stopt dit vóór een release."
    exit 1
  fi

  gate_pass "mvn test (PaymentNotificationProducerContractTest): gepubliceerde berichten (approved en rejected) voldoen aan contracts/payment-notification/1.0.0/asyncapi.yaml." \
    "Payment's daadwerkelijke queue-berichten komen overeen met het gepubliceerde AsyncAPI-contract."
  exit 0
}

verify_payment_notification_consumer() {
  local module="$ROOT/notification/backend"
  run_mvn_test "$module" "NotificationConsumerContractTest"

  if [ "$MVN_EXIT" -ne 0 ]; then
    gate_fail "mvn test (NotificationConsumerContractTest) faalde:
$MVN_OUTPUT" \
      "een inkomend bericht wijkt af van de gepinde AsyncAPI-payload, of Notification verwerkt een conform bericht niet correct."
    exit 1
  fi

  gate_pass "mvn test (NotificationConsumerContractTest): een schema-conform bericht wordt correct verwerkt; een bericht zonder verplicht veld wordt door de schema-validator gevangen." \
    "Notification's consumptie van payment.notifications is spec-conform, en het detectiemechanisme voor niet-conforme berichten werkt."
  exit 0
}

case "$CONTRACT-$SIDE" in
  order-payment-provider) verify_order_payment_provider ;;
  order-payment-consumer) verify_order_payment_consumer ;;
  payment-notification-provider) verify_payment_notification_provider ;;
  payment-notification-consumer) verify_payment_notification_consumer ;;
  *-provider|*-consumer)
    gate_not_implemented "contract-verify" "4"
    exit 0
    ;;
  *)
    echo "Onbekende --side: $SIDE (verwacht provider of consumer)" >&2
    exit 2
    ;;
esac
