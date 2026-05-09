# CBT-D — Docker deployment context

Volledig zelfstandige deployment context: alle services draaien in Docker.
Bevat Docker Compose configuratie, shell scripts en Playwright tests.

## Vereisten

- Docker Desktop (actief)
- Node.js 24+

## Scripts

| Script     | Omschrijving                                              |
|------------|-----------------------------------------------------------|
| `start.sh` | Start alle services via Docker Compose en wacht op health |
| `stop.sh`  | Stopt alle Docker services                                |
| `sts.sh`   | **Start → Test → Stop** in één keer (voor CI/demo)        |

## Opstarten en handmatig testen

```bash
cd CBT-D
./start.sh                    # bouwt images, start services, wacht op health

cd tests
npx playwright test           # alle types
npx playwright test type0/    # UI + contract API tests (Angular → Backend)
npx playwright test type1/    # REST tussen deelsystemen
npx playwright test type2/    # Queue tests (Payment → Notification)
npx playwright test type3/    # SOAP tests (Payment → WireMock)

cd .. && ./stop.sh            # stopt alles netjes af
```

## Volledig geautomatiseerd

```bash
cd CBT-D && ./sts.sh          # start → test → stop
```

## Tests via VS Code Playwright extensie

Config staat in `.vscode/settings.json` (getrackt in git):
```json
{ "playwright.configFile": "CBT-D/tests/playwright.config.ts" }
```
Na een Reload Window pikt de extensie de testsuites op.

## Handmatig via Docker Compose

```bash
docker compose up --build          # alles starten
docker compose down                # stoppen
docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d   # CI-mode
```

## Omgevingsvariabelen voor tests

```bash
export ORDER_URL=http://localhost:8080
export PAYMENT_URL=http://localhost:8081
export NOTIFICATION_URL=http://localhost:8082
export WIREMOCK_URL=http://localhost:8083
```

## Poorten

| Service          | Poort |
|------------------|-------|
| Order backend    | 8080  |
| Payment backend  | 8081  |
| Notification     | 8082  |
| WireMock (SOAP)  | 8083  |
| Portal shell     | 4200  |
| mf-order         | 4201  |
| mf-payments      | 4202  |
| mf-notifications | 4203  |
| RabbitMQ AMQP    | 5672  |
| RabbitMQ UI      | 15672 |

## WireMock SOAP-gedrag

| orderId | Resultaat                  |
|---------|----------------------------|
| `999`   | `approved: false` (fraude) |
| overig  | `approved: true`           |

## Structuur

```
CBT-D/
├── docker-compose.yml        # lokale stack
├── docker-compose.ci.yml     # CI overrides (no-build, health aanpassingen)
├── wiremock/mappings/        # SOAP mock responses
├── start.sh
├── stop.sh
├── sts.sh
└── tests/
    ├── playwright.config.ts
    ├── global-setup.ts       # wacht op alle services voor de tests starten
    ├── type0/                # UI + contract API tests
    ├── type1/                # REST tussen deelsystemen
    ├── type2/                # Queue (RabbitMQ)
    └── type3/                # Extern SOAP
```
