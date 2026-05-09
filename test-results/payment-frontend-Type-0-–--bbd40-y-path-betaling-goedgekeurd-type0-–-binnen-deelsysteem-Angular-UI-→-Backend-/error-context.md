# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: type0/payment-frontend.spec.ts >> Type 0 – mf-payments: betaalformulier >> happy path: betaling goedgekeurd
- Location: tests/type0/payment-frontend.spec.ts:58:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('payment-status')
Expected substring: "APPROVED"
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for getByTestId('payment-status')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Type 0: Binnen deelsysteem — Portal shell laadt mf-payments via Module Federation
  4  | // Shell: poort 4200 | mf-payments: poort 4202
  5  | 
  6  | const SHELL = 'http://localhost:4200';
  7  | 
  8  | test.describe('Type 0 – Portal: navigatie (shell)', () => {
  9  | 
  10 |   test('welkomscherm toont bij root-URL', async ({ page }) => {
  11 |     await page.goto(SHELL);
  12 |     await page.waitForLoadState('networkidle');
  13 |     await expect(page.getByRole('heading', { name: 'Welkom' })).toBeVisible();
  14 |     await expect(page.getByText('Selecteer een deelsysteem')).toBeVisible();
  15 |   });
  16 | 
  17 |   test('portal toont header met 3 nav-links', async ({ page }) => {
  18 |     await page.goto(SHELL);
  19 |     await page.waitForLoadState('networkidle');
  20 |     await expect(page.getByTestId('portal-header')).toBeVisible();
  21 |     await expect(page.getByTestId('nav-payments')).toBeVisible();
  22 |     await expect(page.getByTestId('nav-orders')).toBeVisible();
  23 |     await expect(page.getByTestId('nav-notifications')).toBeVisible();
  24 |   });
  25 | 
  26 |   test('portal toont footer', async ({ page }) => {
  27 |     await page.goto(SHELL);
  28 |     await page.waitForLoadState('networkidle');
  29 |     await expect(page.getByTestId('portal-footer')).toBeVisible();
  30 |   });
  31 | 
  32 |   test('/payments laadt mf-payments (Module Federation)', async ({ page }) => {
  33 |     await page.goto(`${SHELL}/payments`);
  34 |     await page.waitForLoadState('networkidle');
  35 |     await expect(page.getByTestId('submit-payment')).toBeVisible();
  36 |   });
  37 | 
  38 |   test('/orders laadt mf-order (Module Federation)', async ({ page }) => {
  39 |     await page.goto(`${SHELL}/orders`);
  40 |     await page.waitForLoadState('networkidle');
  41 |     await expect(page.getByTestId('submit-order')).toBeVisible();
  42 |   });
  43 | 
  44 |   test('/notifications laadt mf-notifications (Module Federation)', async ({ page }) => {
  45 |     await page.goto(`${SHELL}/notifications`);
  46 |     await page.waitForLoadState('networkidle');
  47 |     await expect(page.getByTestId('search-notifications')).toBeVisible();
  48 |   });
  49 | });
  50 | 
  51 | test.describe('Type 0 – mf-payments: betaalformulier', () => {
  52 | 
  53 |   test.beforeEach(async ({ page }) => {
  54 |     await page.goto(`${SHELL}/payments`);
  55 |     await page.waitForLoadState('networkidle');
  56 |   });
  57 | 
  58 |   test('happy path: betaling goedgekeurd', async ({ page }) => {
  59 |     await page.getByTestId('order-id').fill('order-mf-001');
  60 |     await page.getByTestId('amount').fill('49.95');
  61 |     await page.getByTestId('submit-payment').click();
> 62 |     await expect(page.getByTestId('payment-status')).toContainText('APPROVED');
     |                                                      ^ Error: expect(locator).toContainText(expected) failed
  63 |   });
  64 | 
  65 |   test('foutpad: orderId 999 wordt afgewezen', async ({ page }) => {
  66 |     await page.getByTestId('order-id').fill('999');
  67 |     await page.getByTestId('amount').fill('100');
  68 |     await page.getByTestId('submit-payment').click();
  69 |     await expect(page.getByTestId('payment-status')).toContainText('REJECTED');
  70 |   });
  71 | });
  72 | 
```