# Prompt voor Claude Code — showcase in lijn brengen met het keuzedocument

> Kopieer alles onder de streep in Claude Code, gestart vanuit de root van de showcase-repo.

---

## Context

Deze repo is een showcase voor contractbased testen tussen deelsystemen: een fictief systeem **Order → Payment → Notification**. Werkelijke structuur: drie deelsystemen met elk een Kotlin Spring Boot-backend (eigen pom, géén multi-module root) en een Angular micro-frontend, plus een portal-shell — frontends via Module Federation, alles met eigen Dockerfiles. Contracten staan in `contracts/`. Er is momenteel **geen** docker-compose, **geen** CI-configuratie en zijn er **geen** tests; van WireMock bestaat één mapping (`CBT-D/wiremock/`). Verifieer dit eerst zelf (ook op untracked bestanden) en hergebruik wat er wél staat.

**Grens-classificatie — type is een eigenschap van de interface (type 1 = intern deelsysteem, type 2 = grens tussen deelsystemen binnen de tribe, type 3 = grens naar buiten de tribe); de gates landen op de grenzen:**

- **Echte grenzen (vol regime — gates aan beide kanten):** `order-payment` (REST, type 2 sync), `payment-notification` (AsyncAPI, type 2 async), `payment-external` (WSDL, type 3 — buiten de tribe, alleen consumerkant). `payment-notification-rest` is een tweede REST-grens tussen dezelfde deelsystemen (zie `NotificationClient.kt`); behandel die als optioneel tweede REST-increment — pas ná de drie primaire grenzen, als demonstratie van patroon-hergebruik.
- **Deelsysteem-intern (type 1 — géén vol regime):** `order-create`, `order-lookup`, `notification-lookup` (frontend → eigen backend). Deze demonstreren squad-autonomie: spec-gedreven ontwikkeling mag, maar geen diff-gate, geen pin-regime, geen healthcheck-deelname. De containergrens is niet de contractgrens.

De showcase moet het werkende bewijs worden van een keuzedocument. Het gekozen model heet **library-orchestratie**: de gepubliceerde spec is het enige contract (provider-driven, API-first); per API-type verifieert een dunne OSS-library beide kanten van de grens in de eigen pipeline.

**Harde kaders:** alleen OSS (Apache 2.0/MIT), geen SaaS, geen Pact, geen Specmatic, geen Spring Cloud Contract. Toolset: oasdiff, swagger-request-validator (mockmvc + wiremock-modules), springdoc, networknt json-schema-validator, javax.xml.validation / Spring-WS PayloadValidatingInterceptor, WireMock, Playwright + ajv, Spring Boot Actuator. Contractversies zijn SemVer; pins zijn expliciet in Git (nooit "latest" in een gate). Registry is Apicurio; als er geen Apicurio in de showcase draait, simuleer de gepinde spec-levering met een `fetch-contract.sh` die uit versie-directories leest (bijv. `contracts/order-payment/1.2.0/openapi.yaml`; migreer de bestaande platte contractbestanden naar deze structuur als versie 1.0.0) — zelfde interface, later omwisselbaar.

## Doel

Alle onderdelen hieronder werkend, met drie demo-scenario's als acceptatiecriteria (zie onderaan). Werk incrementeel per onderdeel: bouwen → pipeline groen → volgende. Leg per onderdeel in één korte README-sectie vast wat het bewijst (dit wordt working-example-documentatie voor testers).

## Onderdelen

### 0. Fundament (eerst — er is nu geen compose, CI of test)
- `docker-compose.yml` met alle backends, frontends/portal en WireMock (voor de externe SOAP-provider, hergebruik de bestaande mapping in `CBT-D/wiremock/`), plus een CI-profiel per deelsysteem zodat een pipeline alleen het eigen deelsysteem + stubs van zijn providers start.
- Voor async: RabbitMQ in Compose (poort 5672, conform de poorttabel in CLAUDE.md) — controleer eerst hoe `payment` nu daadwerkelijk naar `notification` communiceert (`NotificationClient.kt` oogt REST); bouw zo nodig de async-publicatie conform de AsyncAPI.
- Basis-`ci/`-scriptstructuur en een minimale GitLab CI-yaml die per deelsysteem bouwt; gates komen in de volgende onderdelen.
- **Opruiming:** vervang de inhoud van `claude-code-prompt.md` door deze prompt (zelfde bestandsnaam, zodat de verwijzing in CLAUDE.md blijft kloppen); harmoniseer testmap-namen naar `CBT-D/tests/{intern,rest,async,soap}/` conform CLAUDE.md — géén typenummers in mapnamen.
- **Verifieer untracked bestanden:** CLAUDE.md verwijst naar `CBT-D/docker-compose.yml`, `CBT-D/start.sh`/`sts.sh`, `CBT-D/tests/` en CI-workflows die niet in git staan. Bestaan ze lokaal → committen en hergebruiken; bestaan ze niet → bouwen.

### 1. Zelfverklaring per deelsysteem
Elke service exposeert via Actuator `/actuator/info` welke contractversies hij **serveert** en welke hij **pint als consumer**, gevuld vanuit de build (Maven resource filtering vanuit de pin-configuratie — geen hardcoded duplicatie):

```yaml
info:
  contracts:
    serves:   { payment-api: "2.3" }
    consumes: { notification-events: "1.4", psp-soap: "1.0" }
```

Zelfde waarden als OCI-labels in de Dockerfiles. Eén gedeeld build-snippet, drie keer toegepast.

### 2. REST-grens Order → Payment (beide kanten)
- **Providerkant (Payment-pipeline):** verificatie tegen de gepinde OpenAPI met `swagger-request-validator-mockmvc`; springdoc-drift-check (gegenereerde spec vs. gepubliceerde spec faalt bij afwijking).
- **Consumerkant (Order-pipeline):** WireMock-stub voor Payment, opgebouwd vanuit de examples in de gepinde spec, met `swagger-request-validator-wiremock` erop — elk request van Order wordt tegen de spec gevalideerd; een niet-conforme aanroep laat de Order-pipeline falen.
- **Diff-gate:** GitLab CI-job die bij elke wijziging aan een OpenAPI-bestand oasdiff draait tegen de laatst gepubliceerde versie en faalt op breaking changes.

### 3. Async-grens Payment → Notification
JSON Schema's uit de AsyncAPI extraheren (buildstap of vooraf-geëxtraheerd in `contracts/`); producer- en consumertests valideren berichten met networknt json-schema-validator tegen de gepinde schemaversie.

### 4. SOAP-grens Payment → extern
Spring-WS `PayloadValidatingInterceptor` valideert uitgaande requests tegen de WSDL/XSD; WireMock-SOAP-stub voor de externe provider in de Payment-pipeline.

### 5. Playwright-laag (tester-eigenaarschap)
API-scenariotests per grens in Playwright, draaiend tegen de services in de CI-profile van Docker Compose. Response-validatie via een herbruikbare **ajv-fixture** die JSON Schema uit de gepinde OpenAPI/AsyncAPI laadt. Structuur: scenario's (happy paths, foutscenario's, grenswaarden, verplichte velden) leesbaar gescheiden van de fixture-lijm, zodat een tester scenario's kan toevoegen zonder de lijm aan te raken. Plus één dunne semantische ketentest over Order → Payment → Notification.

### 6. Deployment-healthcheck (compositiebewaking)
Standalone script/container (bash of Kotlin, klein houden): leest de `/actuator/info`-endpoints van alle draaiende services in de Compose-omgeving, bouwt de grens-graaf en valideert per grens **in beide richtingen**: zelfde major én pin-minor ≤ served-minor. Output per grens `OK` of `FAIL payment-api: pinned 2.5, served 2.3`; exitcode ≠ 0 bij een fail. Als CI-job direct na het opstarten van de Compose-omgeving, vóór alle tests. Ondersteun een `--report-only`-vlag.

### 7. Keten-smoke
Nà de healthcheck, vóór de scenariotests: één happy-path-aanroep per grens over de draaiende omgeving. Geen contract-scenario's herhalen — alleen bewijzen dat de grens over de echte stack werkt.

### 8. Pipeline-volgorde per deelsysteem (GitLab CI)
build → unit → contractverificatie (provider- en/of consumerkant) → docker build met OCI-labels → compose up → **healthcheck** → **keten-smoke** → Playwright-scenario's. Diff-gate als aparte job, getriggerd op spec-wijzigingen.

### 9. Demo-transparantie (de showcase vertelt zijn eigen verhaal)
- **Uniforme gate-output:** elk `ci/`-script print een vaste kop (gate | grens | contract@versie | modus) en voet (PASS/FAIL mét bewijsmateriaal: de oasdiff-regels, de spec-violation, de pinned-vs-served-vergelijking) en sluit af met één regel `Dit bewijst: …` die het detectiemoment benoemt.
- **Geleide demo-runs:** `demo/run.sh <scenario>` voert elk demo-scenario stapsgewijs uit met een enter-pauze per stap (toon uitgangssituatie → breng de breuk aan en toon de diff → draai de gate en toon het falen → draai terug en toon groen). Presentator bepaalt het tempo; geen live typwerk.
- **Grensrapport:** na elke volledige run genereert een klein script `grensrapport.md` uit de info-endpoints en gate-resultaten: per grens gepinde vs. geserveerde versies, uitgevoerde checks, resultaat. Houd het bij markdown in de terminal-esthetiek — geen dashboard, geen UI.

## Acceptatiecriteria: drie demo-scenario's

Maak elk scenario reproduceerbaar via een apart demo-branch of een `demo/`-script dat de breuk aanbrengt en weer terugdraait:

1. **Diff-gate:** verwijder een verplicht veld uit `contracts/order-payment` → de spec-MR-pipeline faalt op oasdiff met een leesbare melding, vóór enige implementatie.
2. **Spec-validerende stub:** laat Order een verplicht veld weglaten in zijn aanroep → de Order-pipeline faalt op de stub-validatie, met de spec-violation in de output.
3. **Healthcheck:** pin Order op `order-payment 2.5.0` terwijl Payment `2.3.0` serveert → de healthcheck weigert de omgeving met `FAIL order-payment: pinned 2.5.0, served 2.3.0`; de suite draait niet.

Bonus-demo als tijd het toelaat: een backward-compatible minor (optioneel veld toevoegen) die overal groen doorloopt — het bewijs dat non-breaking changes consumers níets kosten.

## Werkwijze

- **CI-architectuur in drie lagen:** (1) alle gate- en testlogica in CI-agnostische scripts onder `ci/` (diff-gate, contract-verify per type, healthcheck, smoke), draaiend tegen de Compose-omgeving — de volledige showcase moet **lokaal zonder enige CI** kunnen draaien; (2) GitLab CI is leidend en **component-gereed**: elk script krijgt een parametersignatuur (contractnaam, pin, `--report-only`, …) die 1-op-1 kan worden omgezet naar een GitLab CI/CD-component met inputs, en leg de beoogde component-templates alvast aan volgens de GitLab-conventie (`templates/`-map); (3) een eventuele GitHub Actions-workflow is uitsluitend een dunne wrapper van dezelfde scripts — bouwsteiger, geen onderdeel van het patroon.
- Verken eerst; wijzig daarna. Geen bestaande werkende onderdelen herbouwen.
- Kleine commits per onderdeel met een boodschap die verwijst naar het onderdeelnummer hierboven.
- Bij twijfel over een ontwerpkeuze: kies de dunste oplossing die het demo-scenario bewijst; dit is een showcase, geen productplatform.
- Repo: de huidige werkdirectory.
- Bestaande afspraken in CLAUDE.md respecteren en aanvullen, niet vervangen.
