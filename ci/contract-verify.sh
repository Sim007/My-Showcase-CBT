#!/usr/bin/env bash
# ci/contract-verify.sh — providerkant (swagger-request-validator-mockmvc +
# springdoc-drift-check) en consumerkant (WireMock-stub + swagger-request-
# validator-wiremock) contractverificatie. Skelet — logica volgt in de
# onderdelen 2-4 van claude-code.prompt.md (REST, async, SOAP per grens).
#
# Gebruik: ci/contract-verify.sh --contract <naam> --side provider|consumer
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

gate_header "contract-verify" "$CONTRACT" "$CONTRACT ($SIDE-kant)" "$SIDE"
gate_not_implemented "contract-verify" "2-4"
