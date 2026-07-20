import { test, expect } from '@playwright/test';
import { assertMatchesSchema, getSchema } from '../fixtures/ajv-schema';

// Contract: contracts/notification-lookup/1.0.0/openapi.yaml
// Valideert dat GET /api/notifications voldoet aan het gepubliceerde contract

const PAYMENT_URL      = process.env.PAYMENT_URL      ?? 'http://localhost:8081';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:8082';
const CONTRACT = 'notification-lookup/1.0.0/openapi.yaml';
const allowedTypes = getSchema(CONTRACT, 'NotificationResponse').properties.type.enum as string[];

test.describe('Type 0 – Contract: GET /api/notifications (notification-lookup/openapi.yaml)', () => {

  test('lege lijst retourneert 200 met array', async ({ request }) => {
    const res = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=order-nooit-geweest`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('elk notificatie-item voldoet aan NotificationResponse schema', async ({ request }) => {
    const orderId = `order-nc-${Date.now()}`;

    // Trigger betaling zodat er een notificatie wordt aangemaakt
    await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId, amount: 15.00 }
    });
    await new Promise(r => setTimeout(r, 1500));

    const res = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=${orderId}`);
    expect(res.status()).toBe(200);

    const items = await res.json();
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      assertMatchesSchema(CONTRACT, 'NotificationResponse', item);
      expect(allowedTypes).toContain(item.type);
    }
  });

  test('response headers bevatten Content-Type application/json', async ({ request }) => {
    const res = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=order-headers-test`);
    expect(res.headers()['content-type']).toContain('application/json');
  });
});
