# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: type0/order-form.spec.ts >> Type 0 – mf-order: order aanmaken (POST /api/orders) >> happy path: order aangemaakt met betaalstatus APPROVED
- Location: tests/type0/order-form.spec.ts:19:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('created-order-id')
Expected substring: "order-"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for getByTestId('created-order-id')

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
        - generic [ref=e24]: Order aanmaken
        - generic [ref=e25]: POST /api/orders
      - generic [ref=e27]:
        - generic [ref=e30]:
          - generic [ref=e31]:
            - text: Bedrag (€)
            - generic [ref=e32]: "*"
          - spinbutton "Bedrag (€)" [ref=e34]: "75"
        - button [disabled]:
          - generic:
            - progressbar:
              - generic:
                - img
              - generic:
                - generic:
                  - generic:
                    - img
                  - generic:
                    - img
                  - generic:
                    - img
      - link "Order opzoeken →" [ref=e37] [cursor=pointer]:
        - /url: /orders/lookup
        - generic [ref=e38]: Order opzoeken →
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
  3  | // Type 0: Portal shell laadt mf-order via Module Federation → /orders
  4  | 
  5  | const SHELL = 'http://localhost:4200';
  6  | 
  7  | test.describe('Type 0 – mf-order: order aanmaken (POST /api/orders)', () => {
  8  | 
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto(`${SHELL}/orders`);
  11 |     await page.waitForLoadState('networkidle');
  12 |   });
  13 | 
  14 |   test('formulier is zichtbaar', async ({ page }) => {
  15 |     await expect(page.getByTestId('order-amount')).toBeVisible();
  16 |     await expect(page.getByTestId('submit-order')).toBeVisible();
  17 |   });
  18 | 
  19 |   test('happy path: order aangemaakt met betaalstatus APPROVED', async ({ page }) => {
  20 |     await page.getByTestId('order-amount').fill('75');
  21 |     await page.getByTestId('submit-order').click();
> 22 |     await expect(page.getByTestId('created-order-id')).toContainText('order-');
     |                                                        ^ Error: expect(locator).toContainText(expected) failed
  23 |     await expect(page.getByTestId('created-order-status')).toContainText('APPROVED');
  24 |   });
  25 | 
  26 |   test('validatie: leeg bedrag toont mat-error na blur', async ({ page }) => {
  27 |     await page.getByTestId('order-amount').click();
  28 |     await page.keyboard.press('Tab');
  29 |     await expect(page.locator('mat-error')).toBeVisible();
  30 |   });
  31 | });
  32 | 
```