import { test, expect } from '@playwright/test';

// Type 1: Portal shell laadt mf-notifications via Module Federation → /notifications

const SHELL = 'http://localhost:4200';

test.describe('Type 1 – mf-notifications: notificaties opzoeken (GET /api/notifications)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${SHELL}/notifications`);
    await page.waitForLoadState('networkidle');
    // Native Federation laadt asynchroon ná networkidle — wacht op component
    await expect(page.getByTestId('notif-order-id')).toBeVisible();
  });

  test('formulier is zichtbaar', async ({ page }) => {
    await expect(page.getByTestId('search-notifications')).toBeVisible();
  });

  test('happy path: notificaties gevonden na betaling', async ({ page, request }) => {
    const orderId = `order-mf-notif-${Date.now()}`;
    await request.post('http://localhost:8081/api/payments', { data: { orderId, amount: 25 } });

    // Poll via expect.toPass: zoek opnieuw tot notificatie verschijnt (queue delivery is async)
    await expect(async () => {
      await page.getByTestId('notif-order-id').fill(orderId);
      await page.getByTestId('search-notifications').click();
      await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    await expect(page.getByTestId('notification-item').first()).toBeVisible();
  });

  test('geen notificaties toont lege staat', async ({ page }) => {
    await page.getByTestId('notif-order-id').fill('order-zonder-notificaties');
    await page.getByTestId('search-notifications').click();
    await expect(page.getByTestId('no-notifications')).toBeVisible();
  });
});
