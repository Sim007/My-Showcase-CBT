#!/usr/bin/env bash
# ci/healthcheck.sh — leest /actuator/info van alle draaiende services, bouwt
# de grens-graaf en valideert per grens in beide richtingen: zelfde major én
# pin-minor <= served-minor. Skelet — logica volgt in onderdeel 6 van
# claude-code.prompt.md. Draait standaard blokkerend; --report-only degradeert
# een FAIL naar een niet-blokkerende melding (zelfde patroon als diff-gate.sh).
#
# Gebruik: ci/healthcheck.sh [--report-only] [--boundary <naam>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gate-output.sh
source "$SCRIPT_DIR/lib/gate-output.sh"

REPORT_ONLY=false
BOUNDARY="alle grenzen"

while [ $# -gt 0 ]; do
  case "$1" in
    --report-only) REPORT_ONLY=true; shift ;;
    --boundary) BOUNDARY="$2"; shift 2 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

MODE="blokkerend"
$REPORT_ONLY && MODE="report-only"

gate_header "healthcheck" "$BOUNDARY" "pinned vs served (alle contracten)" "$MODE"
gate_not_implemented "healthcheck" "6"
