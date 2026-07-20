# Werkinstructies — Contract Testing Showcase

Deze showcase is het werkende bewijs van het keuzedocument "Contractbased testen tussen deelsystemen".
Bouwopdracht en volgorde: zie `claude-code.prompt.md` (de actuele versie). Bij strijd tussen dit bestand en de prompt: melden, niet gokken.

**Doelstructuur:** verwijzingen naar `CBT-D/` (compose, `start.sh`/`sts.sh`, `tests/`, ci-workflows) beschrijven de beoogde structuur. Bestaat een bestand al (ook untracked): hergebruiken en committen; bestaat het niet: aanmaken conform prompt-onderdeel 0. Nooit blind aannemen dat het er is of dat het ontbreekt — eerst kijken.

## Kernprincipes (uit het keuzedocument — niet van afwijken)

- **Provider-driven, API-first:** de gepubliceerde spec in `contracts/` is het enige contract. Implementatie volgt de spec, nooit andersom.
- **Grens = interface tussen deelsystemen.** Frontend → eigen backend is deelsysteem-intern: de containergrens is niet de contractgrens.
- **Vol regime alleen op echte grenzen** (diff-gate, pins, verificatie beide kanten, healthcheck-deelname): `order-payment`, `payment-notification` (async), `payment-external`. Interne contracten (`order-create`, `order-lookup`, `notification-lookup`) worden spec-gedreven getest maar zonder gate-regime — ze demonstreren squad-autonomie.
- **SemVer met betekenis:** pins expliciet in Git, nooit "latest" in een gate. Contractversies in versie-directories: `contracts/<grens>/<versie>/…`.
- **Alleen OSS:** oasdiff, swagger-request-validator (core + wiremock-junit5 — niet de met Boot 3.5 incompatibele -mockmvc-adapter, zie "Contractverificatie-tooling"), springdoc, networknt json-schema-validator, Spring-WS PayloadValidatingInterceptor, WireMock, Playwright + ajv, Actuator. Géén Pact, géén Specmatic, géén Spring Cloud Contract.
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
  `templates/.gitlab-ci.yml.example` toont hoe ze geconsumeerd worden — **bewust niet in de
  repo-root** en met een `.example`-extensie: een echte root-`.gitlab-ci.yml` zou bij een
  eventuele GitLab-mirror automatisch oppikken en naast de draaiende GitHub Actions-laag een
  tweede, ongewenste CI laten draaien. Alles in `templates/` is gemarkeerd als "draait niet in
  deze GitHub-gehoste repo".
- **Paths-filter-check bij elke deelsysteem-workflow:** moet ook de contract-directories bevatten
  van providers die het deelsysteem consumeert (niet alleen wat het zelf serveert) — anders merkt
  de consumer-pipeline een pin-bump niet op.
- **Compose-profielen per deelsysteem** (`CBT-D/docker-compose.yml`, `profiles:`): `order`,
  `payment`, `notification` starten het eigen deelsysteem + zijn huidige écht-draaiende
  dependencies (nog geen WireMock-stub — die volgt in onderdeel 2 zonder dit mechanisme te
  wijzigen). Profiel `local` (gebruikt door `start.sh`/`sts.sh`) start alles.
- **`ci/diff-gate.sh` is al functioneel** (niet als placeholder gebouwd) — bewijst demo-scenario 1
  end-to-end. `ci/contract-verify.sh` is functioneel voor alle vier de contracten uit de
  bouwprompt: `order-payment` (onderdeel 2, beide kanten), `payment-notification` (onderdeel 3,
  beide kanten), `payment-external` (onderdeel 4, alleen consumerkant — `--side provider` geeft
  een expliciete "n.v.t., buiten de tribe"-melding, geen NOT-IMPLEMENTED). Overige,
  niet-geïmplementeerde contractnamen vallen nog terug op `NOT-IMPLEMENTED`.
  `healthcheck.sh`/`smoke.sh` zijn nog placeholders (onderdelen 6, 7).

## Contractverificatie-tooling (bevindingen uit onderdeel 2 — niet gokken, altijd verifiëren)

Vóór het bouwen van `ci/contract-verify.sh` is de daadwerkelijke Atlassian-repo nagetrokken
(WebSearch/WebFetch/`gh api`, niet uit trainingskennis aangenomen). Twee harde compatibiliteitsgaten
gevonden die bij een volgend contract (onderdelen 3-4) weer kunnen opduiken:

- **`swagger-request-validator-mockmvc` (élke versie) is incompatibel met Spring Boot 3.5/Jakarta.**
  De laatste 2.x-release (`2.44.9`) is nog `javax.servlet`/Spring 5.3/Boot 2.6; de opvolger
  (`openapi-request-validator-mockmvc` v3+) vereist Spring 7+/Boot 4+. Gebruik in plaats daarvan
  **`com.atlassian.oai:swagger-request-validator-core:2.44.9`** rechtstreeks (framework-agnostisch:
  `SimpleRequest`/`SimpleResponse`/`OpenApiInteractionValidator`, geen servlet-dependency) tegen een
  `@SpringBootTest(webEnvironment=RANDOM_PORT)` + `TestRestTemplate`. Zie
  `payment/backend/src/test/kotlin/nl/showcase/payment/PaymentProviderContractTest.kt`.
- **`swagger-request-validator-wiremock-junit5:2.44.9` trekt `com.github.tomakehurst:wiremock-jre8`
  (WireMock 2.x) binnen, waarvan de transitieve Jetty-jars door Spring Boot's BOM naar Jetty 12
  worden opgetrokken terwijl `wiremock-jre8` zelf op Jetty 9.4 leunt — `NoClassDefFoundError`.**
  Fix: exclude `wiremock-jre8` en gebruik in plaats daarvan de **shaded**
  `com.github.tomakehurst:wiremock-jre8-standalone:2.35.2` (relocate't zijn eigen Jetty-klassen,
  geen conflict). Vereist ook `javax.servlet:javax.servlet-api` (test-scope, alleen voor Jetty's
  eigen classloading — geen overlap met de Jakarta-servlet-stack van de app). De feitelijke
  WireMock-extensieklasse in 2.44.9 heet `com.atlassian.oai.validator.wiremock.junit5.OpenApiValidator`
  (niet `OpenApiValidationListener` — dat is de nieuwere, incompatibele v3-API), en
  `assertValidationPassed()` gooit `OpenApiValidationException`, geen `AssertionError`.
  `PostServeAction`-validatie draait **asynchroon** ná het versturen van de respons — een korte
  wachttijd is nodig vóór het rapport wordt uitgelezen (zie de test voor het patroon).
- **springdoc 2.8.6 op JDK 21 crasht op `/v3/api-docs` (élk formaat, niet alleen `.yaml`)** met
  `NoClassDefFoundError: javax/xml/bind/annotation/XmlElement` — `swagger-core` verwijst
  onvoorwaardelijk naar die JAXB-klasse, die sinds Java 11 niet meer bij de JDK zit. Fix:
  `javax.xml.bind:jaxb-api:2.3.1` als dependency (zuivere JDK-gat-dichter, geen contract-testing-tool
  op zich — vergelijkbaar met `javax.servlet-api` hierboven). Ook `springdoc.api-docs.version:
  OPENAPI_3_0` gezet zodat de gegenereerde spec dezelfde OAS-major/minor is als de gepubliceerde
  contracten (3.0.x).
- **springdoc-drift-check vereist volledige OpenAPI-annotatie** van elke provider-controller
  (`@Operation`, `@ApiResponses` met expliciet schema — anders gaat responstype-info verloren via
  `ResponseEntity<Any>` — en `@Schema(example=..., minimum=...)` op DTO-velden) plus een
  `OpenAPI`-bean met `info`/`servers` die exact het gepubliceerde contract spiegelt (springdoc
  gebruikt anders de random test-poort als server-URL en een generieke titel/versie). Zie
  `payment/backend/src/main/kotlin/nl/showcase/payment/config/OpenApiConfig.kt` en de annotaties in
  `PaymentController.kt`.

## Async-contractverificatie (onderdeel 3)

`contracts/payment-notification/1.0.0/schemas/payment-notification-payload.schema.json` is een
**vooraf geëxtraheerd, standalone JSON Schema** (draft-07), 1:1 overgenomen uit
`components.schemas.PaymentNotificationPayload` in de AsyncAPI. Geen buildstap — de
payload-schema was refloos genoeg om dit mechanisch te doen. **Wijzigt de AsyncAPI-payload,** dan
moet dit bestand handmatig opnieuw worden afgeleid (zie ook de "Contract gewijzigd"-checklist
hieronder).

## SOAP-contractverificatie (onderdeel 4)

`contracts/payment-external/1.0.0/schemas/payment-external.xsd` is, zelfde patroon als
onderdeel 3, **vooraf geëxtraheerd** uit het `<xsd:schema>`-blok in `<wsdl:types>` — de WSDL heeft
geen losse `.xsd`. **Bewuste, gedocumenteerde uitzondering op "geen dubbele kopie":**
`payment/backend/src/main/resources/schemas/payment-external.xsd` is een handmatig
gesynchroniseerde kopie — eerst geprobeerd via een extra `<resource>`-blok in `pom.xml` dat
rechtstreeks vanuit `contracts/` bundelde (zoals bij het pin-mechanisme uit onderdeel 1), maar dat
faalt in productie: `docker build`'s buildcontext voor dit deelsysteem is beperkt tot
`payment/backend/`, dus `contracts/` (erbuiten) is onbereikbaar tijdens de image-build — pas
ontdekt door de echte `docker compose --profile payment up --build` te draaien, niet door alleen
`mvn test` (die mount het hele repo). Bij een WSDL-schemawijziging moeten **beide** bestanden
worden bijgewerkt (extra bullet in de "Contract gewijzigd"-checklist).

Type 3 is **alleen consumerkant** (buiten de tribe): `SoapClient.kt` is gerefactored van een kale
`RestTemplate` naar Spring-WS's `WebServiceTemplate` (zie `SoapConfig.kt`) — dat is de enige manier
waarop `PayloadValidatingInterceptor` (client-side, package
`org.springframework.ws.client.support.interceptor`, **niet**
`org.springframework.ws.soap.server.endpoint.*` — dat is de serverkant-variant) uitgaande
verzoeken kan valideren. `spring-ws-core:4.0.13` trekt zelf `jakarta.xml.soap-api` en
`saaj-impl` mee — **geen** handmatige SAAJ-dependency nodig (in tegenstelling tot de JAXB-glue uit
onderdeel 2, bevestigd via `mvn dependency:tree` vóórdat de rest gebouwd werd).

**Alleen `setValidateRequest(true)`, niet de respons:** de bestaande WireMock-fixtures voor de
externe provider (`CBT-D/wiremock/mappings/soap-authorize-*.json`) sturen namespace-gequalificeerde
child-elementen (`tns:transactionId` etc.) terug, terwijl de WSDL-schema geen
`elementFormDefault="qualified"` heeft — child-elementen horen dus ongekwalificeerd te zijn.
Responsvalidatie zou daarom altijd stuklopen op bestaande, ongewijzigde fixtures. `SoapClient`'s
eigen uitgaande payload bouwt daarom bewust ongekwalificeerde kinderen (`<orderId>`, `<amount>`,
geen `tns:`-prefix, geen default-`xmlns`) onder een wél gekwalificeerd root-element
(`<tns:AuthorizeRequest>`) — dat is wat de schema letterlijk voorschrijft.

`PayloadValidatingInterceptor` implementeert `InitializingBean`; in productie roept Spring's
bean-lifecycle `afterPropertiesSet()` vanzelf aan, maar in een test die de interceptor buiten een
Spring-context instantieert (zoals `PaymentExternalContractTest.kt`, bewust snel/zonder
`@SpringBootTest`) moet dat expliciet — anders blijft de interne `XmlValidator` `null`.

Producer- (`payment/backend`) en consumertests (`notification/backend`) draaien met
`com.networknt:json-schema-validator:1.5.6` (Apache 2.0, puur Jackson-gebaseerd — geen
servlet/JAXB-koppeling zoals bij de tooling uit onderdeel 2) en hebben **geen live RabbitMQ-broker
nodig**: `PaymentService`/`NotificationService` hebben alleen constructor-dependencies, dus
rechtstreeks geïnstantieerd (met Mockito voor Payment's externe calls) in plaats van via een
`@SpringBootTest`. Consistent met de vaste pijplijnvolgorde: contractverificatie loopt vóór
compose-up, dus vóór er een broker draait.

## Terminologie

**Type is een eigenschap van de interface**, conform het keuzedocument: **type 1** = intern binnen een deelsysteem, **type 2** = grens tussen deelsystemen binnen de tribe (sync én async), **type 3** = grens naar een systeem buiten de tribe. Het keuzedocument en het gate-regime focussen op de grenzen (type 2 en de consumerkant van type 3); type 1 valt onder squad-autonomie. Testmappen gebruiken géén typenummers maar sprekende namen — zo kan de nummering nooit botsen:

| Testmap                | Dekt                          | Contract(en)                                   |
|------------------------|-------------------------------|------------------------------------------------|
| `CBT-D/tests/intern/`  | type 1: UI → eigen backend    | `order-create`, `order-lookup`, `notification-lookup`, `order-payment` (UI-kant) |
| `CBT-D/tests/rest/`    | type 2 sync: Order → Payment  | `contracts/order-payment/`                     |
| `CBT-D/tests/async/`   | type 2 async: Payment → Notif.| `contracts/payment-notification/` (AsyncAPI)   |
| `CBT-D/tests/soap/`    | type 3: Payment → buiten de tribe | `contracts/payment-external/`              |
| `CBT-D/tests/chain/`   | cross-cutting — geen eigen type | `order-payment` + `payment-notification` (semantische keten, geen schemaherhaling) |

`payment-notification-rest` is een tweede type-2-sync-grens; pas oppakken ná de drie primaire grenzen.

## Playwright-conventie (onderdeel 5)

Response-validatie loopt via één herbruikbare fixture, `CBT-D/tests/fixtures/ajv-schema.ts`:
`assertMatchesSchema(contractFile, schemaName, data)` en `getSchema(contractFile, schemaName)`.
Beide OpenAPI en AsyncAPI gebruiken hier dezelfde `components.schemas.<Naam>`-structuur, dus één
generieke helper volstaat voor alle contracten (geen aparte OpenAPI-/AsyncAPI-variant nodig).
**Nieuwe scenario's toevoegen: schrijf een test die de fixture aanroept, raak
`fixtures/ajv-schema.ts` zelf niet aan** tenzij de contractvorm (bv. `components.schemas`-pad)
verandert. `CBT-D/tests/chain/order-to-notification.spec.ts` is de enige, dunne semantische
ketentest — herhaalt geen scenario's uit `intern/`/`rest/`/`async/`/`soap/`, bewijst alleen de
zakelijke uitkomst van de volledige keten.

## Altijd meteen aanpassen

Bij elke wijziging worden **alle onderstaande afhankelijkheden** in dezelfde taak meegenomen. Vraag niet of je ze ook moet aanpassen — doe het gewoon.

### Contract gewijzigd (`contracts/`)
- [ ] Nieuwe **versie-directory** aanmaken (nooit een gepubliceerde versie muteren); SemVer bepalen: breaking → major, backward-compatible uitbreiding → minor
- [ ] `ci/diff-gate.sh` draaien tegen de vorige versie; bij onbedoelde breaking change: stoppen en melden
- [ ] Pins van consumers alleen bumpen als dat de bedoeling van de taak is
- [ ] Bijbehorende service-code, examples en specs (Playwright + provider-verificatie) bijwerken
- [ ] Bij een AsyncAPI-payloadwijziging: het geëxtraheerde JSON Schema onder `contracts/<grens>/<versie>/schemas/` handmatig opnieuw afleiden
- [ ] Bij een WSDL-schemawijziging: `contracts/payment-external/<versie>/schemas/payment-external.xsd` opnieuw afleiden **én** de kopie in `payment/backend/src/main/resources/schemas/` bijwerken (Docker-buildcontext kan `contracts/` niet bereiken — zie CLAUDE.md, onderdeel 4)
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
