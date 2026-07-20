#!/usr/bin/env bash
# ci/contract-verify.sh — providerkant (swagger-request-validator-core, zie CLAUDE.md voor
# waarom niet de -mockmvc-adapter, + springdoc-drift-check) en consumerkant (WireMock-stub +
# swagger-request-validator-wiremock-junit5) contractverificatie.
#
# Functioneel voor --contract order-payment (onderdeel 2). Overige contracten geven nog
# NOT-IMPLEMENTED (volgt in de onderdelen 3-4).
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

if [ "$CONTRACT" != "order-payment" ]; then
  gate_not_implemented "contract-verify" "3-4"
  exit 0
fi

if [ "$SIDE" = "provider" ]; then
  MODULE="$ROOT/payment/backend"

  set +e
  MVN_OUTPUT="$(cd "$MODULE" && mvn -B -q -Dtest=PaymentProviderContractTest test 2>&1)"
  MVN_EXIT=$?
  set -e

  if [ "$MVN_EXIT" -ne 0 ]; then
    gate_fail "mvn test (PaymentProviderContractTest) faalde:
$MVN_OUTPUT" \
      "de Payment-implementatie wijkt af van de gepinde OpenAPI-spec — providerkant-verificatie stopt dit vóór een release."
    exit 1
  fi

  GENERATED_SPEC="$MODULE/target/generated-openapi.json"
  PUBLISHED_SPEC="$ROOT/contracts/order-payment/1.0.0/openapi.yaml"

  if [ ! -f "$GENERATED_SPEC" ]; then
    gate_fail "Geen gegenereerde spec gevonden op $GENERATED_SPEC (springdoc-drift-check kon niet draaien)." \
      "zonder gegenereerde spec kan niet worden bewezen dat code en contract synchroon lopen."
    exit 1
  fi

  set +e
  DRIFT_OUTPUT="$(docker run --rm \
    -v "$PUBLISHED_SPEC:/published.yaml:ro" \
    -v "$GENERATED_SPEC:/generated.yaml:ro" \
    tufin/oasdiff diff /published.yaml /generated.yaml 2>&1)"
  set -e

  if [ -n "$(echo "$DRIFT_OUTPUT" | tr -d '[:space:]')" ]; then
    gate_fail "springdoc-drift-check: gegenereerde spec wijkt af van de gepubliceerde spec:
$DRIFT_OUTPUT" \
      "de live Payment-API en het gepubliceerde contract zijn uit sync geraakt — dit voorkomt dat een stilzwijgend afwijkende implementatie ongemerkt blijft."
    exit 1
  fi

  gate_pass "mvn test (PaymentProviderContractTest): alle interacties conform contracts/order-payment/1.0.0/openapi.yaml.
springdoc-drift-check: geen afwijking tussen gegenereerde en gepubliceerde spec." \
    "Payment's daadwerkelijke gedrag komt exact overeen met het gepubliceerde contract, nu en structureel (drift-check)."
  exit 0
fi

if [ "$SIDE" = "consumer" ]; then
  MODULE="$ROOT/order/backend"

  set +e
  MVN_OUTPUT="$(cd "$MODULE" && mvn -B -q -Dtest=OrderPaymentConsumerContractTest test 2>&1)"
  MVN_EXIT=$?
  set -e

  if [ "$MVN_EXIT" -ne 0 ]; then
    gate_fail "mvn test (OrderPaymentConsumerContractTest) faalde:
$MVN_OUTPUT" \
      "Order stuurt een niet-spec-conform verzoek naar Payment — de WireMock-stub-validatie ving dit vóór een release."
    exit 1
  fi

  gate_pass "mvn test (OrderPaymentConsumerContractTest): elk verzoek van Order naar de Payment-stub voldoet aan contracts/order-payment/1.0.0/openapi.yaml." \
    "Order's uitgaande aanroepen zijn spec-conform — een regressie hierin faalt de consumerkant-gate direct."
  exit 0
fi

echo "Onbekende --side: $SIDE (verwacht provider of consumer)" >&2
exit 2
