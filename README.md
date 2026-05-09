# Contract Testing Showcase

Monorepo voor een showcase van contract testing langs vier API-typen.
Bedoeld voor een tribe met 10 feature squads + 1 platform squad.

> **Opstarten en testen → [CBT-D/README.md](CBT-D/README.md)**

## Rode draad

```
[Angular] ── Order ──REST──▶ Payment ──Queue/Topic──▶ Notification
                                 │
                              SOAP ▼
                         Ext. Betaalprovider (WireMock)
```

## Vier API-typen

| Type | Beschrijving               | Voorbeeld                                | Contract |
|------|----------------------------|------------------------------------------|----------|
| 0    | UI → Backend               | Angular → Payment / Order / Notification | `contracts/order-payment/openapi.yaml`<br>`contracts/order-create/openapi.yaml`<br>`contracts/order-lookup/openapi.yaml`<br>`contracts/notification-lookup/openapi.yaml` |
| 1    | Tussen deelsystemen (REST) | Order → Payment, Payment → Notification  | `contracts/order-payment/openapi.yaml`<br>`contracts/payment-notification-rest/openapi.yaml` |
| 2    | Async queue                | Payment → RabbitMQ → Notification        | `contracts/payment-notification/asyncapi.yaml` |
| 3    | Extern (SOAP)              | Payment → Betaalprovider (WireMock)      | `contracts/payment-external/payment.wsdl` |

## Stack

| Onderdeel  | Technologie                                           |
|------------|-------------------------------------------------------|
| Backend    | Kotlin 2.1 + Spring Boot 3.5 + Maven                  |
| Frontend   | Angular 21 (standalone components, Native Federation) |
| Messaging  | RabbitMQ 4 (Alpine)                                   |
| Tests      | Playwright + AJV schema validatie                     |
| SOAP mock  | WireMock 3                                            |
| Infra      | Docker Compose (`CBT-D/`)                             |
| CI         | GitHub Actions                                        |

## Projectstructuur

```
├── contracts/                # API-contracten (OpenAPI, AsyncAPI, WSDL)
├── order/                    # Order squad
│   ├── backend/              # Spring Boot (poort 8080)
│   └── frontend/             # mf-order – Angular MF (poort 4201)
├── payment/                  # Payment squad
│   ├── backend/              # Spring Boot (poort 8081)
│   └── frontend/             # mf-payments – Angular MF (poort 4202)
├── notification/             # Notification squad
│   ├── backend/              # Spring Boot (poort 8082)
│   └── frontend/             # mf-notifications – Angular MF (poort 4203)
├── portal/                   # Platform squad – Angular shell (poort 4200)
├── CBT-D/                    # Docker deployment context → zie CBT-D/README.md
└── .github/workflows/        # CI pipelines
```

## Principes

- **Provider is leading** — het contract wordt gepubliceerd door de provider, niet de consumer
- **CI faalt bij rode contracttests** — zie `.github/workflows/contract-tests.yml`
- Elke service draait in een eigen container
- Contractwijzigingen gaan altijd via een PR
