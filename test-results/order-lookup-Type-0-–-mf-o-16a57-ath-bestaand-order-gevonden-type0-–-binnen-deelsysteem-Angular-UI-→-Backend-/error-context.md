# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: type0/order-lookup.spec.ts >> Type 0 – mf-order: order opzoeken (GET /api/orders/{id}) >> happy path: bestaand order gevonden
- Location: tests/type0/order-lookup.spec.ts:19:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('order-detail')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('order-detail')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]: Portal
    - navigation [ref=e6]:
      - link "Payments" [ref=e7] [cursor=pointer]:
        - /url: /payments
        - generic [ref=e8]: Payments
      - link "Orders" [ref=e11] [cursor=pointer]:
        - /url: /orders
        - generic [ref=e12]: Orders
      - link "Notifications" [ref=e15] [cursor=pointer]:
        - /url: /notifications
        - generic [ref=e16]: Notifications
  - main [ref=e19]:
    - generic [ref=e21]:
      - generic [ref=e23]:
        - generic [ref=e24]: Order opzoeken
        - generic [ref=e25]: GET /api/orders/:id
      - generic [ref=e27]:
        - generic [ref=e30]:
          - generic [ref=e31]:
            - text: Order ID
            - generic [ref=e32]: "*"
          - textbox "Order ID" [ref=e34]:
            - /placeholder: bijv. order-abc123
            - text: order-b94cb9e3
        - button "Zoeken..." [disabled]:
          - generic: Zoeken...
      - link "← Order aanmaken" [ref=e37] [cursor=pointer]:
        - /url: /orders
        - generic [ref=e38]: ← Order aanmaken
  - generic [ref=e41]:
    - separator [ref=e42]
    - contentinfo [ref=e43]:
      - generic [ref=e44]: Contract Testing Showcase © 2026
      - generic [ref=e45]: Deelsysteem Portal
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Type 0: Portal shell laadt mf-order via Module Federation → /orders/lookup
  4  | 
  5  | const SHELL = 'http://localhost:4200';
  6  | 
  7  | test.describe('Type 0 – mf-order: order opzoeken (GET /api/orders/{id})', () => {
  8  | 
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto(`${SHELL}/orders/lookup`);
  11 |     await page.waitForLoadState('networkidle');
  12 |   });
  13 | 
  14 |   test('formulier is zichtbaar', async ({ page }) => {
  15 |     await expect(page.getByTestId('lookup-order-id')).toBeVisible();
  16 |     await expect(page.getByTestId('search-order')).toBeVisible();
  17 |   });
  18 | 
  19 |   test('happy path: bestaand order gevonden', async ({ page, request }) => {
  20 |     const res = await request.post('http://localhost:8080/api/orders', { data: { amount: 50 } });
  21 |     const { orderId } = await res.json();
  22 | 
  23 |     await page.getByTestId('lookup-order-id').fill(orderId);
  24 |     await page.getByTestId('search-order').click();
> 25 |     await expect(page.getByTestId('order-detail')).toBeVisible();
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  26 |     await expect(page.getByTestId('order-detail-status')).toBeVisible();
  27 |   });
  28 | 
  29 |   test('niet-bestaand order toont niet gevonden', async ({ page }) => {
  30 |     await page.getByTestId('lookup-order-id').fill('order-bestaat-niet');
  31 |     await page.getByTestId('search-order').click();
  32 |     await expect(page.getByTestId('order-not-found')).toBeVisible();
  33 |   });
  34 | });
  35 | 
```