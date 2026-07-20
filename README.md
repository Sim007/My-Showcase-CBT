# Contract Testing Showcase

Monorepo voor een showcase van contract testing langs drie interface-typen (zie
[Grenzen en contracten](#grenzen-en-contracten) hieronder).
Bedoeld voor een tribe met 10 feature squads + 1 platform squad.

> **Opstarten en testen → [CBT-D/README.md](CBT-D/README.md)**

## Rode draad

```
[Angular] ── Order ──REST──▶ Payment ──Queue/Topic──▶ Notification
                                 │
                              SOAP ▼
                         Ext. Betaalprovider (WireMock)
```

## Grenzen en contracten

Type is een eigenschap van de interface (zie [CLAUDE.md](CLAUDE.md#terminologie) voor de volledige
uitleg): type 1 = deelsysteem-intern, type 2 = grens binnen de tribe (sync of async), type 3 = grens
naar buiten de tribe. Vol gate-regime (diff-gate, pins, healthcheck) geldt alleen op de type
2/3-grenzen. Contracten staan in versie-directories (`contracts/<naam>/<versie>/…`).

| Testmap                | Dekt                            | Contract                                        |
|-------------------------|----------------------------------|--------------------------------------------------|
| `CBT-D/tests/intern/`  | type 1: UI → eigen backend      | `contracts/order-create/1.0.0/openapi.yaml`<br>`contracts/order-lookup/1.0.0/openapi.yaml`<br>`contracts/notification-lookup/1.0.0/openapi.yaml`<br>`contracts/order-payment/1.0.0/openapi.yaml` (UI-kant) |
| `CBT-D/tests/rest/`    | type 2 sync: Order → Payment, Payment → Notification[^1] | `contracts/order-payment/1.0.0/openapi.yaml`<br>`contracts/payment-notification-rest/1.0.0/openapi.yaml`[^1] |
| `CBT-D/tests/async/`   | type 2 async: Payment → Notification | `contracts/payment-notification/1.0.0/asyncapi.yaml` |
| `CBT-D/tests/soap/`    | type 3: Payment → externe provider | `contracts/payment-external/1.0.0/payment.wsdl` |

[^1]: `payment-notification-rest` is een **tweede, optionele** REST-grens tussen Payment en
    Notification — een demonstratie van patroon-hergebruik, geen vierde primaire grens. Vol
    gate-regime (diff-gate, pins, healthcheck) volgt hierop pas ná de drie primaire grenzen
    (`order-payment`, `payment-notification`, `payment-external`); zie CLAUDE.md.

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
├── contracts/                # API-contracten in versie-directories (OpenAPI, AsyncAPI, WSDL)
├── ci/                       # CI-agnostische gate-scripts (diff-gate, contract-verify, healthcheck, smoke)
├── templates/                # GitLab CI/CD-componenten — referentie, draait niet in deze repo
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
└── .github/workflows/        # CI: draaiende laag, één workflow per deelsysteem + een diff-gate-workflow
```

## CI-architectuur

GitHub Actions is de draaiende CI-laag: elke deelsysteem-workflow (`order.yml`, `payment.yml`,
`notification.yml`) simuleert een squad-pipeline en roept uitsluitend scripts in `ci/` aan — geen
logica in de yaml zelf. Een aparte `diff-gate.yml`-workflow bewaakt `contracts/**` op PR's. De
GitLab CI/CD-component-templates in `templates/` zijn een niet-draaiende referentie-implementatie
van dezelfde `ci/`-scripts, volgens de GitLab-componentconventie.

## Principes

- **Provider is leading** — het contract wordt gepubliceerd door de provider, niet de consumer
- **CI faalt bij rode contracttests** — zie `.github/workflows/`
- Elke service draait in een eigen container
- Contractwijzigingen gaan altijd via een nieuwe versie-directory en een PR
