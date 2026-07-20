#!/usr/bin/env bash
# ci/docker-build.sh — gedeeld build-script (onderdeel 1), 3x aangeroepen (één
# per deelsysteem) vanuit de GitHub-workflows. Leest de pin-configuratie uit de
# pom.xml van het deelsysteem (ci/lib/pins.sh) en geeft die als --build-arg mee,
# zodat de OCI-labels in de Dockerfile exact overeenkomen met wat
# /actuator/info straks toont — één bron van waarheid, geen duplicatie.
#
# Gebruik: ci/docker-build.sh --service <naam> --context <pad> [--tag <tag>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pins.sh
source "$SCRIPT_DIR/lib/pins.sh"

SERVICE=""
CONTEXT=""
TAG="latest"

while [ $# -gt 0 ]; do
  case "$1" in
    --service) SERVICE="$2"; shift 2 ;;
    --context) CONTEXT="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$SERVICE" ] || [ -z "$CONTEXT" ]; then
  echo "Gebruik: ci/docker-build.sh --service <naam> --context <pad> [--tag <tag>]" >&2
  exit 2
fi

POM="$CONTEXT/pom.xml"
if [ ! -f "$POM" ]; then
  echo "Geen pom.xml gevonden op $POM" >&2
  exit 2
fi

SERVES="$(pins_extract serves "$POM")"
CONSUMES="$(pins_extract consumes "$POM")"

echo "docker-build: $SERVICE (context: $CONTEXT, tag: $TAG)"
echo "  contracts.serves:   ${SERVES:-<geen>}"
echo "  contracts.consumes: ${CONSUMES:-<geen>}"

docker build \
  --build-arg "CONTRACTS_SERVES=$SERVES" \
  --build-arg "CONTRACTS_CONSUMES=$CONSUMES" \
  -t "showcase/$SERVICE:$TAG" \
  "$CONTEXT"
