# Werkinstructies — Contract Testing Showcase

Deze showcase is het werkende bewijs van het keuzedocument "Contractbased testen tussen deelsystemen".
Bouwopdracht en volgorde: zie `claude-code.prompt.md` (de actuele versie). Bij strijd tussen dit bestand en de prompt: melden, niet gokken.

**Doelstructuur:** verwijzingen naar `CBT-D/` (compose, `start.sh`/`sts.sh`, `tests/`, ci-workflows) beschrijven de beoogde structuur. Bestaat een bestand al (ook untracked): hergebruiken en committen; bestaat het niet: aanmaken conform prompt-onderdeel 0. Nooit blind aannemen dat het er is of dat het ontbreekt — eerst kijken.

## Kernprincipes (uit het keuzedocument — niet van afwijken)

- **Provider-driven, API-first:** de gepubliceerde spec in `contracts/` is het enige contract. Implementatie volgt de spec, nooit andersom.
- **Grens = interface tussen deelsystemen.** Frontend → eigen backend is deelsysteem-intern: de containergrens is niet de contractgrens.
- **Vol regime alleen op echte grenzen** (diff-gate, pins, verificatie beide kanten, healthcheck-deelname): `order-payment`, `payment-notification` (async), `payment-external`. Interne contracten (`order-create`, `order-lookup`, `notification-lookup`) worden spec-gedreven getest maar zonder gate-regime — ze demonstreren squad-autonomie.
- **SemVer met betekenis:** pins expliciet in Git, nooit "latest" in een gate. Contractversies in versie-directories: `contracts/<grens>/<versie>/…`.
- **Alleen OSS:** oasdiff, swagger-request-validator (mockmvc + wiremock), springdoc, networknt json-schema-validator, Spring-WS PayloadValidatingInterceptor, WireMock, Playwright + ajv, Actuator. Géén Pact, géén Specmatic, géén Spring Cloud Contract.
- **Vaste verificatievolgorde per pipeline:** diff-gate (op spec-wijziging) → contractverificatie provider-/consumerkant → compose up → deployment-healthcheck (compositie: pinned vs served, beide richtingen) → keten-smoke (één happy path per grens over de echte stack) → Playwright-scenario's. Latere lagen herhalen nooit wat eerdere lagen bewezen.
- **Zelfverklaring overal:** elk deelsysteem exposeert serves/consumes-contractversies via `/actuator/info` én als OCI-labels, gevuld vanuit de build — nooit hardcoded gedupliceerd.
- **Dunste oplossing die het demo-scenario bewijst.** Dit is een showcase, geen productplatform.

## CI-architectuur (afwijking van het prompt-document)

`claude-code.prompt.md` gaat uit van "GitLab CI is leidend, GitHub Actions is een dunne wrapper".
In deze repo is dat omgedraaid — bewuste beslissing, vastgelegd tijdens het plannen van onderdeel 0:

- **GitHub Actions is de draaiende laag.** Eén workflow per deelsysteem
  (`.github/workflows/order.yml`, `payment.yml`, `notification.yml`) simuleert een
  squad-pipeline: build → unit → contractverificatie → docker build → compose up (ci-profiel) →
  healthcheck → keten-smoke → Playwright-scenario's, als losse stappen met de laagnaam als
  stapnaam. Een aparte `diff-gate.yml` triggert op PR's die `contracts/**` wijzigen.
- **Alle logica leeft in `ci/*.sh`**, lokaal draaibaar zonder CI. Workflows zijn dunne wrappers
  zonder eigen logica — een stap is altijd één aanroep naar een `ci/`-script.
- **GitLab CI/CD-componenten in `templates/` zijn een niet-draaiende referentie**, elk met
  `spec: inputs:` die 1-op-1 de parametersignatuur van het bijbehorende `ci/*.sh`-script volgt.
  Root `.gitlab-ci.yml` toont hoe ze geconsumeerd worden. Beide zijn gemarkeerd als "draait niet
  in deze GitHub-gehoste repo".
- **Paths-filter-check bij elke deelsysteem-workflow:** moet ook de contract-directories bevatten
  van providers die het deelsysteem consumeert (niet alleen wat het zelf serveert) — anders merkt
  de consumer-pipeline een pin-bump niet op.
- **Compose-profielen per deelsysteem** (`CBT-D/docker-compose.yml`, `profiles:`): `order`,
  `payment`, `notification` starten het eigen deelsysteem + zijn huidige écht-draaiende
  dependencies (nog geen WireMock-stub — die volgt in onderdeel 2 zonder dit mechanisme te
  wijzigen). Profiel `local` (gebruikt door `start.sh`/`sts.sh`) start alles.
- **`ci/diff-gate.sh` is al functioneel** (niet als placeholder gebouwd) — bewijst demo-scenario 1
  end-to-end. `contract-verify.sh`, `healthcheck.sh`, `smoke.sh` zijn nog placeholders die het
  uniforme outputformaat tonen (`NOT-IMPLEMENTED (onderdeel N)`); logica volgt in de onderdelen
  2-4, 6 en 7.

## Terminologie

**Type is een eigenschap van de interface**, conform het keuzedocument: **type 1** = intern binnen een deelsysteem, **type 2** = grens tussen deelsystemen binnen de tribe (sync én async), **type 3** = grens naar een systeem buiten de tribe. Het keuzedocument en het gate-regime focussen op de grenzen (type 2 en de consumerkant van type 3); type 1 valt onder squad-autonomie. Testmappen gebruiken géén typenummers maar sprekende namen — zo kan de nummering nooit botsen:

| Testmap                | Dekt                          | Contract(en)                                   |
|------------------------|-------------------------------|------------------------------------------------|
| `CBT-D/tests/intern/`  | type 1: UI → eigen backend    | `order-create`, `order-lookup`, `notification-lookup`, `order-payment` (UI-kant) |
| `CBT-D/tests/rest/`    | type 2 sync: Order → Payment  | `contracts/order-payment/`                     |
| `CBT-D/tests/async/`   | type 2 async: Payment → Notif.| `contracts/payment-notification/` (AsyncAPI)   |
| `CBT-D/tests/soap/`    | type 3: Payment → buiten de tribe | `contracts/payment-external/`              |

`payment-notification-rest` is een tweede type-2-sync-grens; pas oppakken ná de drie primaire grenzen.

## Altijd meteen aanpassen

Bij elke wijziging worden **alle onderstaande afhankelijkheden** in dezelfde taak meegenomen. Vraag niet of je ze ook moet aanpassen — doe het gewoon.

### Contract gewijzigd (`contracts/`)
- [ ] Nieuwe **versie-directory** aanmaken (nooit een gepubliceerde versie muteren); SemVer bepalen: breaking → major, backward-compatible uitbreiding → minor
- [ ] `ci/diff-gate.sh` draaien tegen de vorige versie; bij onbedoelde breaking change: stoppen en melden
- [ ] Pins van consumers alleen bumpen als dat de bedoeling van de taak is
- [ ] Bijbehorende service-code, examples en specs (Playwright + provider-verificatie) bijwerken
- [ ] `README.md` — contractentabel

### Nieuwe API of endpoint toegevoegd
- [ ] Contract in `contracts/<grens-of-intern>/<versie>/` (spec eerst, dan code)
- [ ] Kotlin controller + service in het betreffende deelsysteem
- [ ] Angular component + route in de juiste frontend (`order/frontend/`, `payment/frontend/`, `notification/frontend/`)
- [ ] Portal-routes en proxy (`portal/src/app/app.routes.ts`, `portal/proxy.conf.json`, `portal/nginx.conf`)
- [ ] Playwright-specs in de juiste testmap (zie terminologietabel)
- [ ] Zelfverklaring bijwerken (serves/consumes in `application.yml` via build-property) als het een grens raakt
- [ ] `CBT-D/start.sh` / `CBT-D/sts.sh` — wait_for/env vars
- [ ] CI-configuratie — env vars en teststap
- [ ] `README.md` — type-tabel, projectstructuur, contractenlijst

### Gate- of ci-script gewijzigd (`ci/`)
- [ ] Uniforme output behouden: kop (gate | grens | contract@versie | modus), voet (PASS/FAIL + bewijsmateriaal), slotregel `Dit bewijst: …`
- [ ] Parametersignatuur stabiel houden (contractnaam, pin, `--report-only`) — dit wordt later een GitLab CI/CD-component-input
- [ ] GitHub-workflow (draaiend) én GitLab-componenttemplate in `templates/` (referentie) synchroon houden
- [ ] `demo/run.sh`-scenario's die het script gebruiken opnieuw draaien
- [ ] `README.md` — gate-overzicht

### Demo-scenario toegevoegd of gewijzigd (`demo/`)
- [ ] Scenario brengt de breuk aan, toont het falen, en draait **altijd volledig terug** (repo eindigt schoon)
- [ ] Enter-pauzes per stap; presentator bepaalt het tempo
- [ ] `README.md` — demotabel

### Nieuwe service of poort
- [ ] `CBT-D/docker-compose.yml` — service + healthcheck + `profiles:` (minstens `local`, plus elk deelsysteem-profiel dat de service als dependency nodig heeft); CI-override in `docker-compose.ci.yml`
- [ ] Portal-proxy (`portal/proxy.conf.json`, `portal/nginx.conf`)
- [ ] `CBT-D/start.sh` / `CBT-D/sts.sh` — wait_for + env vars
- [ ] CI-configuratie — env vars
- [ ] Poorttabel hieronder + `README.md`

### Nieuw deelsysteem toegevoegd (`<naam>/`)
- [ ] `<naam>/backend/` (Kotlin Spring Boot) + `<naam>/frontend/` (Angular MF met `federation.config.js`, routes, `src/main.ts` dynamic-import-pattern)
- [ ] Portal: remote entry in federation-config, `loadRemoteModule`-route, proxy
- [ ] Compose, scripts, CI, poorttabel
- [ ] Zelfverklaring + OCI-labels vanaf dag één
- [ ] `docs/architecture.drawio` + `.png`, `README.md`, dit bestand — structuur + poorten

## Poorten

| Service          | Poort | Env var            |
|------------------|-------|--------------------|
| Order            | 8080  | `ORDER_URL`        |
| Payment          | 8081  | `PAYMENT_URL`      |
| Notification     | 8082  | `NOTIFICATION_URL` |
| WireMock         | 8083  | `WIREMOCK_URL`     |
| Portal           | 4200  | —                  |
| order/frontend   | 4201  | —                  |
| payment/frontend | 4202  | —                  |
| notification/frontend | 4203 | —              |
| RabbitMQ         | 5672  | —                  |

## Deelsystemen per squad

| Deelsysteem  | Squad          | Backend                  | Frontend                  |
|--------------|----------------|--------------------------|---------------------------|
| Order        | Order squad    | `order/backend/`         | `order/frontend/`         |
| Payment      | Payment squad  | `payment/backend/`       | `payment/frontend/`       |
| Notification | Notif. squad   | `notification/backend/`  | `notification/frontend/`  |
| Portal       | Platform squad | —                        | `portal/`                 |

## Conventies

- Kotlin: `src/main/kotlin/nl/showcase/{service}/`; tests: `src/test/kotlin/nl/showcase/{service}/`
- Alle contractwijzigingen via een merge/pull request; commits verwijzen naar het onderdeelnummer uit de bouwprompt
- Comments in code verwijzen naar het bijbehorende contractbestand mét versie
- Lokaal opstarten en testen: zie `README.md` (start.sh / compose / Playwright)
