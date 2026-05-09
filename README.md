# Contract Testing Showcase

Monorepo voor een showcase van contract testing langs drie API-typen.
Bedoeld voor een tribe met 10 feature squads + 1 platform squad.

## Rode draad

```
[Angular] ── Order ──REST──▶ Payment ──Queue/Topic──▶ Notification
                                 │
                              SOAP ▼
                         Ext. Betaalprovider (WireMock)
```

## Vier API-typen

| Type | Beschrijving               | Voorbeeld                                       | Contract |
|------|----------------------------|-------------------------------------------------|----------|
| 0    | UI → Backend               | Angular → Payment / Order / Notification        | `contracts/order-payment/openapi.yaml`<br>`contracts/order-create/openapi.yaml`<br>`contracts/order-lookup/openapi.yaml`<br>`contracts/notification-lookup/openapi.yaml` |
| 1    | Tussen deelsystemen (REST) | Order → Payment, Payment → Notification         | `contracts/order-payment/openapi.yaml`<br>`contracts/payment-notification-rest/openapi.yaml` |
| 2    | Async queue                | Payment → RabbitMQ → Notification               | `contracts/payment-notification/asyncapi.yaml` |
| 3    | Extern (SOAP)              | Payment → Betaalprovider (WireMock)             | `contracts/payment-external/payment.wsdl` |

## Stack

| Onderdeel      | Technologie                                           |
|----------------|-------------------------------------------------------|
| Backend        | Kotlin 2.1 + Spring Boot 3.5 + Maven                  |
| Frontend       | Angular 21 (standalone components, Native Federation) |
| Messaging      | RabbitMQ 4 (Alpine)                                   |
| Tests          | Playwright + AJV schema validatie                     |
| SOAP mock      | WireMock 3                                            |
| Infra          | Docker Compose (`CBT-D/`) — alle images Alpine, behalve WireMock (geen ARM64 Alpine beschikbaar) |
| CI             | GitHub Actions                                        |

## Projectstructuur

```
├── contracts/
│   ├── order-payment/openapi.yaml              # Type 0+1: POST /api/payments
│   ├── order-create/openapi.yaml               # Type 0:   POST /api/orders
│   ├── order-lookup/openapi.yaml               # Type 0:   GET  /api/orders/{id}
│   ├── notification-lookup/openapi.yaml        # Type 0:   GET  /api/notifications
│   ├── payment-notification-rest/openapi.yaml  # Type 1:   Payment → Notification (REST)
│   ├── payment-notification/asyncapi.yaml      # Type 2:   Payment → Notification (queue)
│   └── payment-external/payment.wsdl           # Type 3:   Payment → Ext. provider (SOAP)
├── order/                    # Order squad
│   ├── backend/              # Spring Boot service (poort 8080)
│   └── frontend/             # mf-order – Angular MF (poort 4201)
├── payment/                  # Payment squad
│   ├── backend/              # Spring Boot service (poort 8081)
│   └── frontend/             # mf-payments – Angular MF (poort 4202)
├── notification/             # Notification squad
│   ├── backend/              # Spring Boot service (poort 8082)
│   └── frontend/             # mf-notifications – Angular MF (poort 4203)
├── portal/                   # Platform squad – Angular shell (poort 4200)
├── CBT-D/                    # Docker deployment context (volledig)
│   ├── docker-compose.yml
│   ├── docker-compose.ci.yml
│   ├── wiremock/mappings/                  # SOAP mock responses
│   ├── start.sh              # Start alle services via Docker Compose
│   ├── stop.sh               # Stop alle Docker services
│   ├── sts.sh                # Start → Test → Stop in één keer
│   └── tests/
│       ├── type0/   # UI + contract API tests (Angular → Backend)
│       ├── type1/   # REST tussen deelsystemen (Order → Payment)
│       ├── type2/   # Queue tests (Payment → Notification)
│       └── type3/   # SOAP tests (Payment → WireMock)
└── .github/workflows/                      # CI pipelines
```

## Lokaal opstarten

### Vereisten

- Docker + Docker Compose
- Node.js 24+
- Java 21 (alleen voor lokale ontwikkeling zonder Docker)

### Scripts

| Script          | Omschrijving                                              |
|-----------------|-----------------------------------------------------------|
| `CBT-D/start.sh` | Start alle services via Docker Compose en wacht op health |
| `CBT-D/stop.sh`  | Stopt alle Docker services                                |
| `CBT-D/sts.sh`   | **Start → Test → Stop** in één keer (voor CI/demo)        |

#### Start en handmatig testen

```bash
cd CBT-D
./start.sh                              # bouwt en start alles in Docker

cd tests
npx playwright test                     # alle types
npx playwright test type0/              # alleen UI tests (Angular → Backend)
npx playwright test type1/              # alleen REST tussen deelsystemen
npx playwright test type2/              # alleen queue tests
npx playwright test type3/              # alleen SOAP tests

cd .. && ./stop.sh                      # stopt alles netjes af
```

#### Volledig geautomatiseerd (start + test + stop)

```bash
cd CBT-D && ./sts.sh
```

### Handmatig via Docker Compose

```bash
# Alle services (backends + frontends + RabbitMQ + WireMock)
docker compose -f CBT-D/docker-compose.yml up --build
```

### Omgevingsvariabelen voor tests

```bash
export ORDER_URL=http://localhost:8080
export PAYMENT_URL=http://localhost:8081
export NOTIFICATION_URL=http://localhost:8082
export WIREMOCK_URL=http://localhost:8083
```

> `CBT-D/start.sh` toont het testcommando automatisch na het opstarten.

## WireMock SOAP-gedrag

| orderId | Resultaat      |
|---------|----------------|
| `999`   | `approved: false` (fraude) |
| overig  | `approved: true`           |

## Principes

- **Provider is leading** — het contract wordt gepubliceerd door de provider, niet de consumer
- **CI faalt bij rode contracttests** — zie `.github/workflows/contract-tests.yml`
- Elke service draait in een eigen container
- Contractwijzigingen gaan altijd via een PR

## Poorten

| Service               | Poort |
|-----------------------|-------|
| Order                 | 8080  |
| Payment               | 8081  |
| Notification          | 8082  |
| WireMock              | 8083  |
| Portal Shell          | 4200  |
| mf-order              | 4201  |
| mf-payments           | 4202  |
| mf-notifications      | 4203  |
| RabbitMQ AMQP         | 5672  |
| RabbitMQ UI           | 15672 |
