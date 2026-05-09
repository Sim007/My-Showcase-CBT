#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[start]${NC} $*"; }
warn() { echo -e "${YELLOW}[start]${NC} $*"; }
fail() { echo -e "${RED}[start]${NC} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Vereisten controleren
# ---------------------------------------------------------------------------
log "Vereisten controleren..."
command -v docker >/dev/null 2>&1 || fail "Docker niet gevonden"

# ---------------------------------------------------------------------------
# 2. Poorten vrijmaken
# ---------------------------------------------------------------------------
PORTS=(4200 4201 4202 4203 5672 8080 8081 8082 8083 15672)
log "Poorten controleren en vrijmaken..."
for port in "${PORTS[@]}"; do
  PIDS=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    for pid in $PIDS; do
      CMD=$(ps -p "$pid" -o comm= 2>/dev/null || echo "onbekend")
      kill "$pid" 2>/dev/null && warn "Poort $port vrijgemaakt — $CMD (PID $pid) gestopt"
    done
  fi
done

# ---------------------------------------------------------------------------
# 3. Alle services opstarten via Docker Compose
# ---------------------------------------------------------------------------
log "Alle services opstarten (Docker Compose)..."
cd "$ROOT"
docker compose -f infra/docker-compose.yml up --build -d

# ---------------------------------------------------------------------------
# 4. Wachten op health endpoints
# ---------------------------------------------------------------------------
wait_for() {
  local name="$1"
  local url="$2"
  local max=150
  local i=0
  while ! curl -sf "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -ge "$max" ] && fail "$name niet bereikbaar na $((max * 2))s ($url)"
    sleep 2
  done
  log "$name gereed"
}

log "Wachten op services..."
wait_for "WireMock"          "http://localhost:8083/__admin/health"
wait_for "Notification"      "http://localhost:8082/actuator/health"
wait_for "Payment"           "http://localhost:8081/actuator/health"
wait_for "Order"             "http://localhost:8080/actuator/health"
wait_for "mf-order"          "http://localhost:4201/remoteEntry.json"
wait_for "mf-payments"       "http://localhost:4202/remoteEntry.json"
wait_for "mf-notifications"  "http://localhost:4203/remoteEntry.json"
wait_for "Portal shell"      "http://localhost:4200"

log "Alle services draaien. Gebruik './stop.sh' om alles te stoppen."
log ""
log "Tests starten:"
log "  npx playwright test"
