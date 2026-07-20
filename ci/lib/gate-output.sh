#!/usr/bin/env bash
# Gedeelde output-helpers voor alle ci/*.sh gate-scripts.
# Eén implementatie van het uniforme formaat (onderdeel 9): kop, PASS/FAIL-voet
# met bewijsmateriaal, en een slotregel "Dit bewijst: …". Wordt gesourced, niet
# los uitgevoerd.

gate_header() {
  local gate="$1" boundary="$2" contract="$3" mode="$4"
  echo "==============================================================="
  echo "gate:     $gate"
  echo "grens:    $boundary"
  echo "contract: $contract"
  echo "modus:    $mode"
  echo "==============================================================="
}

gate_pass() {
  local evidence="$1" proves="$2"
  echo "---------------------------------------------------------------"
  echo "PASS"
  [ -n "$evidence" ] && printf '%s\n' "$evidence"
  echo "---------------------------------------------------------------"
  echo "Dit bewijst: $proves"
}

gate_fail() {
  local evidence="$1" proves="$2"
  echo "---------------------------------------------------------------"
  echo "FAIL"
  [ -n "$evidence" ] && printf '%s\n' "$evidence"
  echo "---------------------------------------------------------------"
  echo "Dit bewijst: $proves"
}

gate_not_implemented() {
  local gate="$1" onderdeel="$2"
  echo "---------------------------------------------------------------"
  echo "NOT-IMPLEMENTED (onderdeel $onderdeel)"
  echo "Skelet aanwezig; gate-logica volgt in onderdeel $onderdeel van claude-code.prompt.md."
  echo "---------------------------------------------------------------"
  echo "Dit bewijst: nog niets — placeholder voor toekomstige gate-logica."
}
