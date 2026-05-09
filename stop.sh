#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[stop]${NC} $*"; }

log "Docker services stoppen..."
cd "$ROOT"
docker compose -f infra/docker-compose.yml down --remove-orphans

log "Klaar — alle services gestopt."
