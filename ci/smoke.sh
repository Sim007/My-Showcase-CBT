#!/usr/bin/env bash
# ci/smoke.sh — één happy-path-aanroep per grens over de draaiende
# Compose-omgeving; herhaalt geen contract-scenario's, bewijst alleen dat de
# grens over de échte stack werkt. Skelet — logica volgt in onderdeel 7 van
# claude-code.prompt.md, ná de healthcheck en vóór de Playwright-scenario's.
#
# Gebruik: ci/smoke.sh [--boundary <naam>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gate-output.sh
source "$SCRIPT_DIR/lib/gate-output.sh"

BOUNDARY="alle grenzen"

while [ $# -gt 0 ]; do
  case "$1" in
    --boundary) BOUNDARY="$2"; shift 2 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

gate_header "keten-smoke" "$BOUNDARY" "n.v.t. (happy-path-aanroep, geen schemacheck)" "blokkerend"
gate_not_implemented "keten-smoke" "7"
