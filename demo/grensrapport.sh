#!/usr/bin/env bash
# demo/grensrapport.sh — genereert demo/grensrapport.md uit de /actuator/info-endpoints en de
# gate-resultaten van de draaiende compose-omgeving (ci/healthcheck.sh + ci/smoke.sh, alle
# grenzen). Vereist een draaiende stack (CBT-D/start.sh). Markdown in terminal-esthetiek —
# fenced code-blocks met de rauwe, uniforme gate-output — geen dashboard, geen UI (CLAUDE.md).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
  echo "Order (localhost:8080) is niet bereikbaar. Start eerst de lokale stack: cd CBT-D && ./start.sh" >&2
  exit 1
fi

OUT="demo/grensrapport.md"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"

set +e
HEALTHCHECK_OUTPUT="$(./ci/healthcheck.sh 2>&1)"
SMOKE_OUTPUT="$(./ci/smoke.sh 2>&1)"
set -e

{
  echo "# Grensrapport"
  echo
  echo "Gegenereerd: $TIMESTAMP"
  echo
  echo "## Deployment-healthcheck (pinned vs served, per grens)"
  echo
  echo '```text'
  echo "$HEALTHCHECK_OUTPUT"
  echo '```'
  echo
  echo "## Keten-smoke (happy path over de draaiende stack, per grens)"
  echo
  echo '```text'
  echo "$SMOKE_OUTPUT"
  echo '```'
} > "$OUT"

echo "Grensrapport geschreven naar $OUT"
