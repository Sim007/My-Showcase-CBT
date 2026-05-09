# Claude Code — Contract Testing Showcase

## Context

Dit is een monorepo voor een showcase van contract testing tussen deelsystemen.
De showcase is bedoeld voor een tribe met 10 feature squads + 1 platform squad.
Doel: aantonen hoe contract testing werkt langs drie API-types.

## Rode draad

```
[Angular] ── Order ──REST──▶ Payment ──Queue/Topic──▶ Notification
                                 │
                              SOAP ▼
                         Ext. Betaalprovider
```

## Drie API-types

| Type | Beschrijving              | Voorbeeld                            |
|------|---------------------------|--------------------------------------|
| 1    | Binnen deelsysteem        | Angular → Backend → DB               |
| 2    | Tussen deelsystemen       | Order → Payment, Payment → Queue     |
| 3    | Extern                    | Payment → Betaalprovider (SOAP)      |

## Stack

- **Backend:** Kotlin + Spring Boot 3 + Maven
- **Frontend:** Angular (in `payment/frontend/`)
- **Tests:** Playwright (in `tests/`)
- **Infra:** Docker Compose + GitHub Actions
- **Contracts:** OpenAPI, AsyncAPI, WSDL (in `contracts/`)

## Wat er al staat

- Scaffolding van de volledige monorepostructuur
- Drie Kotlin Spring Boot services: `order/`, `payment/backend/`, `notification/`
- Contractbestanden: `contracts/order-payment/openapi.yaml`, `contracts/payment-notification/asyncapi.yaml`, `contracts/payment-external/payment.wsdl`
- Playwright test setup met specs per type: `tests/type1/`, `tests/type2/`, `tests/type3/`
- Docker Compose voor lokaal en CI: `infra/docker-compose.yml`, `infra/docker-compose.ci.yml`
- GitHub Actions workflows per deelsysteem: `.github/workflows/`

## Wat nog gebouwd moet worden

### 1. Angular frontend (`payment/frontend/`)
- Initialiseer Angular project met `ng new`
- Betaalformulier met velden: orderId, amount
- HTTP call naar Payment backend (`POST /api/payments`)
- Toon betaalstatus in UI
- Gebruik `data-testid` attributen zodat Playwright tests werken
- Vereiste testids: `order-id`, `amount`, `submit-payment`, `payment-status`, `error-message`

### 2. WireMock mapping voor externe SOAP provider (`infra/wiremock/`)
- Mock voor `POST /soap/payment` (SOAP authorize)
- Happy path: orderId != 999 → approved: true
- Foutpad: orderId == 999 → approved: false
- Formaat: WireMock JSON mapping

### 3. Notification endpoint voor Playwright test
- `GET /api/notifications?orderId={id}` in Notification service
- Zoek notificaties op orderId
- Nodig voor type2/payment-notification.spec.ts

### 4. Spring Boot Actuator health endpoints
- Voeg `spring-boot-starter-actuator` toe aan alle drie de services
- Nodig voor `wait-on` in GitHub Actions workflows

### 5. Playwright type1 test draaiend maken
- Zorg dat `type1/payment-frontend.spec.ts` werkt tegen de Angular app
- Angular moet draaien op poort 4200

### 6. Validatie contract in Playwright tests
- Voeg `ajv` JSON Schema validatie toe aan type2 tests
- Valideer response body tegen het OpenAPI schema uit `contracts/order-payment/openapi.yaml`

## Principes

- Provider is leading — het contract wordt gepubliceerd door de provider, niet de consumer
- CI pipeline faalt als contract tests rood zijn
- Elke service draait in een eigen container
- Tijdelijke CI-omgevingen per deelsysteem via Docker Compose profiles
- Tests zijn het bewijs dat het contract klopt, niet de documentatie

## Opstarten lokaal

```bash
# Alle services starten
docker compose -f infra/docker-compose.yml up

# Playwright tests
cd tests && npm install && npx playwright test

# Alleen type 2 testen
npx playwright test type2/
```

## Conventies

- Kotlin code in `src/main/kotlin/nl/showcase/{service}/`
- Tests in `src/test/kotlin/nl/showcase/{service}/`
- Alle contractwijzigingen gaan via een PR
- Comments in code verwijzen naar het bijbehorende contractbestand
