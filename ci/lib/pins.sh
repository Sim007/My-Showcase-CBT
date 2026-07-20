#!/usr/bin/env bash
# Gedeelde helper (onderdeel 1): leest de contracts.serves.*/contracts.consumes.*
# pin-properties uit een backend-pom.xml. Enige bron van waarheid — zowel
# Maven resource filtering (application.yml -> /actuator/info) als
# ci/docker-build.sh (OCI-labels) lezen uit dezelfde pom.xml-properties.
# Wordt gesourced, niet los uitgevoerd.

# pins_extract <serves|consumes> <pad-naar-pom.xml>
# Print "naam=versie,naam=versie,..." (leeg als er geen properties zijn).
pins_extract() {
  local side="$1" pom="$2"
  grep -oE "<contracts\.${side}\.[a-zA-Z0-9_-]+>[^<]+</contracts\.${side}\.[a-zA-Z0-9_-]+>" "$pom" \
    | sed -E "s#<contracts\.${side}\.([a-zA-Z0-9_-]+)>([^<]+)</contracts\.${side}\.[a-zA-Z0-9_-]+>#\1=\2#" \
    | paste -sd, -
}
