#!/usr/bin/env bash
# ci/diff-gate.sh — faalt op breaking changes in een contract die niet met een
# major-bump zijn aangekondigd. Vergelijkt de hoogste versie-directory onder
# contracts/<naam>/ met de op-één-na-hoogste via oasdiff (OpenAPI only, via het
# officiële tufin/oasdiff Docker-image — geen lokale install nodig).
#
# Gebruik: ci/diff-gate.sh --contract <naam> [--report-only]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/gate-output.sh
source "$SCRIPT_DIR/lib/gate-output.sh"

CONTRACT=""
REPORT_ONLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --contract) CONTRACT="$2"; shift 2 ;;
    --report-only) REPORT_ONLY=true; shift ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$CONTRACT" ]; then
  echo "Gebruik: ci/diff-gate.sh --contract <naam> [--report-only]" >&2
  exit 2
fi

CONTRACT_DIR="$ROOT/contracts/$CONTRACT"
if [ ! -d "$CONTRACT_DIR" ]; then
  echo "Onbekend contract: $CONTRACT ($CONTRACT_DIR bestaat niet)" >&2
  exit 2
fi

MODE="blokkerend"
$REPORT_ONLY && MODE="report-only"

# Versie-directories oplopend sorteren (SemVer-aware via sort -V) — bash 3.2-
# compatibel, dus geen mapfile en geen negatieve array-indices.
VERSIONS=()
while IFS= read -r d; do
  [ -n "$d" ] && VERSIONS+=("$(basename "$d")")
done < <(find "$CONTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | sort -V)

COUNT=${#VERSIONS[@]}

if [ "$COUNT" -eq 0 ]; then
  echo "Geen versie-directories gevonden onder $CONTRACT_DIR" >&2
  exit 2
fi

NEW_VERSION="${VERSIONS[$((COUNT - 1))]}"

if [ "$COUNT" -lt 2 ]; then
  gate_header "diff-gate" "$CONTRACT" "$CONTRACT@$NEW_VERSION" "$MODE"
  gate_pass "Eerste gepubliceerde versie ($NEW_VERSION) — geen voorganger om tegen te vergelijken." \
    "een nieuw contract zonder voorganger kan per definitie geen breaking change bevatten."
  exit 0
fi

PREV_VERSION="${VERSIONS[$((COUNT - 2))]}"

gate_header "diff-gate" "$CONTRACT" "$CONTRACT@$NEW_VERSION" "$MODE"

find_spec_file() {
  find "$1" -maxdepth 1 -type f \( -name '*.yaml' -o -name '*.yml' -o -name '*.wsdl' \) | head -1
}

PREV_FILE="$(find_spec_file "$CONTRACT_DIR/$PREV_VERSION")"
NEW_FILE="$(find_spec_file "$CONTRACT_DIR/$NEW_VERSION")"

if [ -z "$PREV_FILE" ] || [ -z "$NEW_FILE" ]; then
  echo "Geen specbestand gevonden in $PREV_VERSION of $NEW_VERSION" >&2
  exit 2
fi

FILENAME="$(basename "$NEW_FILE")"

if [[ "$FILENAME" != *openapi* ]]; then
  gate_pass "Brontype '$FILENAME' wordt door diff-gate nog niet ondersteund (alleen OpenAPI via oasdiff)." \
    "dit contract wordt momenteel NIET automatisch op breaking changes gecontroleerd — bewuste, zichtbare beperking, geen silent pass."
  exit 0
fi

major() { echo "$1" | cut -d. -f1; }

set +e
BREAKING_OUTPUT="$(docker run --rm \
  -v "$CONTRACT_DIR/$PREV_VERSION:/base:ro" \
  -v "$CONTRACT_DIR/$NEW_VERSION:/revision:ro" \
  tufin/oasdiff breaking "/base/$FILENAME" "/revision/$FILENAME" --fail-on ERR 2>&1)"
BREAKING_EXIT=$?
set -e

if [ "$BREAKING_EXIT" -eq 0 ]; then
  gate_pass "oasdiff breaking $PREV_VERSION -> $NEW_VERSION: geen breaking changes gevonden." \
    "een non-breaking wijziging kost consumers niets — de gate laat hem ongehinderd door."
  exit 0
fi

if [ "$(major "$NEW_VERSION")" != "$(major "$PREV_VERSION")" ]; then
  gate_pass "oasdiff breaking $PREV_VERSION -> $NEW_VERSION:
$BREAKING_OUTPUT

Major-versie is gebumpt ($PREV_VERSION -> $NEW_VERSION), dus de breaking change is expliciet aangekondigd." \
    "een breaking change mag, mits aangekondigd met een major-bump — hier is dat het geval."
  exit 0
fi

gate_fail "oasdiff breaking $PREV_VERSION -> $NEW_VERSION:
$BREAKING_OUTPUT

Major-versie is NIET gebumpt ($PREV_VERSION -> $NEW_VERSION)." \
  "een breaking change zonder major-bump breekt bestaande consumers stilzwijgend — de gate stopt dit vóór implementatie."

if $REPORT_ONLY; then
  exit 0
fi
exit 1
