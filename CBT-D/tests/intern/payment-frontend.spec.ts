import { test, expect } from '@playwright/test';

// Type 1: Binnen deelsysteem — Portal shell laadt mf-payments via Module Federation
// Shell: poort 4200 | mf-payments: poort 4202

const SHELL = 'http://localhost:4200';

test.describe('Type 1 – Portal: navigatie (shell)', () => {

  test('welkomscherm toont bij root-URL', async ({ page }) => {
    await page.goto(SHELL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Welkom' })).toBeVisible();
    await expect(page.getByText('Selecteer een deelsysteem')).toBeVisible();
  });

  test('portal toont header met 3 nav-links', async ({ page }) => {
    await page.goto(SHELL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('portal-header')).toBeVisible();
    await expect(page.getByTestId('nav-payments')).toBeVisible();
    await expect(page.getByTestId('nav-orders')).toBeVisible();
    await expect(page.getByTestId('nav-notifications')).toBeVisible();
  });

  test('portal toont footer', async ({ page }) => {
    await page.goto(SHELL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('portal-footer')).toBeVisible();
  });

  test('/payments laadt mf-payments (Module Federation)', async ({ page }) => {
    await page.goto(`${SHELL}/payments`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('submit-payment')).toBeVisible();
  });

  test('/orders laadt mf-order (Module Federation)', async ({ page }) => {
    await page.goto(`${SHELL}/orders`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('submit-order')).toBeVisible();
  });

  test('/notifications laadt mf-notifications (Module Federation)', async ({ page }) => {
    await page.goto(`${SHELL}/notifications`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('search-notifications')).toBeVisible();
  });
});

test.describe('Type 1 – mf-payments: betaalformulier', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${SHELL}/payments`);
    await page.waitForLoadState('networkidle');
  });

  test('happy path: betaling goedgekeurd', async ({ page }) => {
    await page.getByTestId('order-id').fill('order-mf-001');
    await page.getByTestId('amount').fill('49.95');
    await page.getByTestId('submit-payment').click();
    await expect(page.getByTestId('payment-status')).toContainText('APPROVED');
  });

  test('foutpad: orderId 999 wordt afgewezen', async ({ page }) => {
    await page.getByTestId('order-id').fill('999');
    await page.getByTestId('amount').fill('100');
    await page.getByTestId('submit-payment').click();
    await expect(page.getByTestId('payment-status')).toContainText('REJECTED');
  });
});
