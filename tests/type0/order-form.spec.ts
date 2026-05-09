import { test, expect } from '@playwright/test';

// Type 0: Portal shell laadt mf-order via Module Federation → /orders

const SHELL = 'http://localhost:4200';

test.describe('Type 0 – mf-order: order aanmaken (POST /api/orders)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${SHELL}/orders`);
    await page.waitForLoadState('networkidle');
  });

  test('formulier is zichtbaar', async ({ page }) => {
    await expect(page.getByTestId('order-amount')).toBeVisible();
    await expect(page.getByTestId('submit-order')).toBeVisible();
  });

  test('happy path: order aangemaakt met betaalstatus APPROVED', async ({ page }) => {
    await page.getByTestId('order-amount').fill('75');
    await page.getByTestId('submit-order').click();
    await expect(page.getByTestId('created-order-id')).toContainText('order-');
    await expect(page.getByTestId('created-order-status')).toContainText('APPROVED');
  });

  test('validatie: leeg bedrag toont mat-error na blur', async ({ page }) => {
    await page.getByTestId('order-amount').click();
    await page.keyboard.press('Tab');
    await expect(page.locator('mat-error')).toBeVisible();
  });
});
