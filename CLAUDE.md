# Werkinstructies — Contract Testing Showcase

## Altijd meteen aanpassen

Bij elke wijziging in dit project moeten **alle onderstaande afhankelijkheden** worden meegenomen in dezelfde taak. Vraag niet of je ze ook moet aanpassen — doe het gewoon.

---

## Afhankelijkheidsmatrix

### Nieuwe API of endpoint toegevoegd
- [ ] OpenAPI/AsyncAPI/WSDL contract in `contracts/`
- [ ] Kotlin controller + service in de betreffende service (`order/`, `payment/backend/`, `notification/`)
- [ ] Angular component in de juiste MF (`payment/mf-order/`, `payment/mf-payments/`, `payment/mf-notifications/`)
- [ ] Route toegevoegd in de MF's `app.routes.ts`
- [ ] Shell proxy bijgewerkt: `payment/shell/proxy.conf.json` en `nginx.conf`
- [ ] Playwright contract-spec in `tests/type0/*-contract.spec.ts`
- [ ] Playwright UI-spec in `tests/type0/*.spec.ts` (navigatie via routes, niet tabs)
- [ ] `README.md` — type-tabel, projectstructuur, contractenlijst
- [ ] `start.sh` — `wait_for` voor nieuwe health endpoint
- [ ] `sts.sh` — env vars en `wait_for`
- [ ] `.github/workflows/contract-tests.yml` — env vars en teststap

### Contract gewijzigd (`contracts/`)
- [ ] Bijbehorende Playwright contract-spec (`tests/type0/*-contract.spec.ts`)
- [ ] Bijbehorende service-code die het contract implementeert
- [ ] `README.md` — contractentabel

### Test type of mapnaam veranderd (`tests/type*`)
- [ ] `tests/playwright.config.ts` — projecten bijwerken
- [ ] `tests/package.json` — scripts bijwerken
- [ ] `.github/workflows/contract-tests.yml` — stap hernoemen + env vars
- [ ] `README.md` — testcommando's bijwerken
- [ ] `start.sh` — instructietekst
- [ ] `sts.sh` — als er gefilterd wordt op type

### Nieuwe service of poort
- [ ] `infra/docker-compose.yml` — service + healthcheck
- [ ] `infra/docker-compose.ci.yml` — CI-override
- [ ] `payment/shell/proxy.conf.json` en `nginx.conf` (Shell proxiet alle API-calls)
- [ ] `start.sh` en `sts.sh` — `wait_for` + env vars
- [ ] `.github/workflows/contract-tests.yml` — env vars
- [ ] `README.md` — poorttabel

### Nieuw deelsysteem toegevoegd (`<naam>/`)
- [ ] `<naam>/backend/` — Kotlin Spring Boot service aanmaken
- [ ] `<naam>/frontend/` — Angular MF aanmaken (`package.json`, `angular.json`, `webpack.config.js`, routes)
- [ ] `<naam>/frontend/src/main.ts` (dynamic import pattern voor Module Federation)
- [ ] Portal `webpack.config.js` — remote entry toevoegen
- [ ] Portal `app.routes.ts` — `loadRemoteModule` route toevoegen
- [ ] Portal `proxy.conf.json` + `nginx.conf` — API-route toevoegen
- [ ] `infra/docker-compose.yml` — backend + frontend containers (profiel `local`)
- [ ] `start.sh` / `stop.sh` / `sts.sh` — nieuwe poorten toevoegen
- [ ] `docs/architecture.drawio` + `docs/architecture.png` bijwerken
- [ ] `README.md` + `CLAUDE.md` — poorttabel + structuur

### Scripts gewijzigd (`start.sh`, `stop.sh`, `sts.sh`)
- [ ] `README.md` — scripttabel en opstartinstructies synchroon houden

---

## Typeindeling

| Type | Beschrijving               | Tests                  | Contracts                        |
|------|----------------------------|------------------------|----------------------------------|
| 0    | UI → Backend               | `tests/type0/`         | 4× `contracts/*/openapi.yaml`    |
| 1    | Tussen deelsystemen (REST) | `tests/type1/`         | `contracts/order-payment/`       |
| 2    | Async queue                | `tests/type2/`         | `contracts/payment-notification/`|
| 3    | Extern SOAP                | `tests/type3/`         | `contracts/payment-external/`    |

## Poorten

| Service            | Poort | Env var            |
|--------------------|-------|--------------------|
| Order              | 8080  | `ORDER_URL`        |
| Payment            | 8081  | `PAYMENT_URL`      |
| Notification       | 8082  | `NOTIFICATION_URL` |
| WireMock           | 8083  | `WIREMOCK_URL`     |
| Portal Shell       | 4200  | —                  |
| mf-order           | 4201  | —                  |
| mf-payments        | 4202  | —                  |
| mf-notifications   | 4203  | —                  |
| RabbitMQ           | 5672  | —                  |

## Deelsystemen per squad

| Deelsysteem   | Squad        | Backend              | Frontend              | Poorten    |
|---------------|--------------|----------------------|-----------------------|------------|
| Order         | Order squad  | `order/backend/`     | `order/frontend/`     | 8080, 4201 |
| Payment       | Payment squad| `payment/backend/`   | `payment/frontend/`   | 8081, 4202 |
| Notification  | Notif. squad | `notification/backend/` | `notification/frontend/` | 8082, 4203 |
| Portal        | Platform squad | —                  | `portal/`             | 4200       |

Shell routes: `/payments` → mf-payments, `/orders` → mf-order, `/notifications` → mf-notifications

## Contracten vs. tests (1-op-1)

| Contract                                    | Test                                          |
|---------------------------------------------|-----------------------------------------------|
| `contracts/order-payment/openapi.yaml`      | `tests/type0/payment-contract.spec.ts`        |
| `contracts/order-create/openapi.yaml`       | `tests/type0/order-create-contract.spec.ts`   |
| `contracts/order-lookup/openapi.yaml`       | `tests/type0/order-lookup-contract.spec.ts`   |
| `contracts/notification-lookup/openapi.yaml`| `tests/type0/notification-contract.spec.ts`   |
| `contracts/payment-notification/asyncapi.yaml` | `tests/type2/payment-notification.spec.ts` |
| `contracts/payment-external/payment.wsdl`  | `tests/type3/payment-soap.spec.ts`            |
