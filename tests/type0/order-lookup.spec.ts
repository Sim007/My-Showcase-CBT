import { test, expect } from '@playwright/test';

// Type 0: Portal shell laadt mf-order via Module Federation → /orders/lookup

const SHELL = 'http://localhost:4200';

test.describe('Type 0 – mf-order: order opzoeken (GET /api/orders/{id})', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${SHELL}/orders/lookup`);
    await page.waitForLoadState('networkidle');
  });

  test('formulier is zichtbaar', async ({ page }) => {
    await expect(page.getByTestId('lookup-order-id')).toBeVisible();
    await expect(page.getByTestId('search-order')).toBeVisible();
  });

  test('happy path: bestaand order gevonden', async ({ page, request }) => {
    const res = await request.post('http://localhost:8080/api/orders', { data: { amount: 50 } });
    const { orderId } = await res.json();

    await page.getByTestId('lookup-order-id').fill(orderId);
    await page.getByTestId('search-order').click();
    await expect(page.getByTestId('order-detail')).toBeVisible();
    await expect(page.getByTestId('order-detail-status')).toBeVisible();
  });

  test('niet-bestaand order toont niet gevonden', async ({ page }) => {
    await page.getByTestId('lookup-order-id').fill('order-bestaat-niet');
    await page.getByTestId('search-order').click();
    await expect(page.getByTestId('order-not-found')).toBeVisible();
  });
});
