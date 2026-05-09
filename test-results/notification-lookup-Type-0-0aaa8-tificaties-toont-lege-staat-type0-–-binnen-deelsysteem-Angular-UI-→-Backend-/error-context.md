# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: type0/notification-lookup.spec.ts >> Type 0 – mf-notifications: notificaties opzoeken (GET /api/notifications) >> geen notificaties toont lege staat
- Location: tests/type0/notification-lookup.spec.ts:34:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('no-notifications')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('no-notifications')

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
        - generic [ref=e24]: Notificaties opzoeken
        - generic [ref=e25]: GET /api/notifications
      - generic [ref=e27]:
        - generic [ref=e30]:
          - generic [ref=e31]:
            - text: Order ID
            - generic [ref=e32]: "*"
          - textbox "Order ID" [ref=e34]:
            - /placeholder: bijv. order-abc123
            - text: order-zonder-notificaties
        - button "Zoeken..." [disabled]:
          - generic: Zoeken...
  - generic [ref=e36]:
    - separator [ref=e37]
    - contentinfo [ref=e38]:
      - generic [ref=e39]: Contract Testing Showcase © 2026
      - generic [ref=e40]: Deelsysteem Portal
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Type 0: Portal shell laadt mf-notifications via Module Federation → /notifications
  4  | 
  5  | const SHELL = 'http://localhost:4200';
  6  | 
  7  | test.describe('Type 0 – mf-notifications: notificaties opzoeken (GET /api/notifications)', () => {
  8  | 
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto(`${SHELL}/notifications`);
  11 |     await page.waitForLoadState('networkidle');
  12 |     // Native Federation laadt asynchroon ná networkidle — wacht op component
  13 |     await expect(page.getByTestId('notif-order-id')).toBeVisible();
  14 |   });
  15 | 
  16 |   test('formulier is zichtbaar', async ({ page }) => {
  17 |     await expect(page.getByTestId('search-notifications')).toBeVisible();
  18 |   });
  19 | 
  20 |   test('happy path: notificaties gevonden na betaling', async ({ page, request }) => {
  21 |     const orderId = `order-mf-notif-${Date.now()}`;
  22 |     await request.post('http://localhost:8081/api/payments', { data: { orderId, amount: 25 } });
  23 | 
  24 |     // Poll via expect.toPass: zoek opnieuw tot notificatie verschijnt (queue delivery is async)
  25 |     await expect(async () => {
  26 |       await page.getByTestId('notif-order-id').fill(orderId);
  27 |       await page.getByTestId('search-notifications').click();
  28 |       await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 2_000 });
  29 |     }).toPass({ timeout: 15_000 });
  30 | 
  31 |     await expect(page.getByTestId('notification-item').first()).toBeVisible();
  32 |   });
  33 | 
  34 |   test('geen notificaties toont lege staat', async ({ page }) => {
  35 |     await page.getByTestId('notif-order-id').fill('order-zonder-notificaties');
  36 |     await page.getByTestId('search-notifications').click();
> 37 |     await expect(page.getByTestId('no-notifications')).toBeVisible();
     |                                                        ^ Error: expect(locator).toBeVisible() failed
  38 |   });
  39 | });
  40 | 
```