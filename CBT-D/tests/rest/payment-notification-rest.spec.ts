import { test, expect } from '@playwright/test';
import { assertMatchesSchema, getSchema } from '../fixtures/ajv-schema';

// Type 1: Tussen deelsystemen — Payment service (consumer) → Notification service (provider) via REST
// Contract: contracts/payment-notification-rest/1.0.0/openapi.yaml

const PAYMENT_URL      = process.env.PAYMENT_URL      ?? 'http://localhost:8081';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:8082';
const CONTRACT = 'payment-notification-rest/1.0.0/openapi.yaml';
const allowedTypes = getSchema(CONTRACT, 'CreateNotificationRequest').properties.type.enum as string[];

test.describe('Type 1 – Contract: Payment→Notification (REST POST /api/notifications)', () => {

  test('na betaling maakt Payment direct een REST-notificatie aan in Notification', async ({ request }) => {
    const orderId = `order-rest-notif-${Date.now()}`;

    // Trigger betaling — Payment roept intern Notification REST aan
    const payRes = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId, amount: 40.00 }
    });
    expect(payRes.status()).toBe(200);

    // Notificatie moet direct beschikbaar zijn (synchroon REST, geen queue-vertraging)
    const notifRes = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=${orderId}`);
    expect(notifRes.status()).toBe(200);
    const notifications = await notifRes.json();
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some((n: any) => n.type === 'PAYMENT_APPROVED')).toBe(true);
  });

  test('POST /api/notifications voldoet aan NotificationResponse schema', async ({ request }) => {
    const body = {
      orderId: `order-nc-rest-${Date.now()}`,
      type: 'PAYMENT_APPROVED',
      message: 'Directe REST notificatie'
    };

    assertMatchesSchema(CONTRACT, 'CreateNotificationRequest', body);

    const res = await request.post(`${NOTIFICATION_URL}/api/notifications`, { data: body });
    expect(res.status()).toBe(201);

    const json = await res.json();
    assertMatchesSchema(CONTRACT, 'NotificationResponse', json);

    expect(json.orderId).toBe(body.orderId);
    expect(json.notificationId).toBeTruthy();
    expect(json.timestamp).toBeTruthy();
  });

  test('type-enum bevat alleen toegestane waarden', () => {
    expect(allowedTypes).toEqual(['PAYMENT_APPROVED', 'PAYMENT_REJECTED']);
  });

  test('ongeldig type retourneert 400 met ErrorResponse', async ({ request }) => {
    const res = await request.post(`${NOTIFICATION_URL}/api/notifications`, {
      data: { orderId: 'order-x', type: 'ONGELDIG_TYPE', message: 'test' }
    });
    expect(res.status()).toBe(400);
    assertMatchesSchema(CONTRACT, 'ErrorResponse', await res.json());
  });

  test('leeg orderId retourneert 400 met ErrorResponse', async ({ request }) => {
    const res = await request.post(`${NOTIFICATION_URL}/api/notifications`, {
      data: { orderId: '', type: 'PAYMENT_APPROVED', message: 'test' }
    });
    expect(res.status()).toBe(400);
    assertMatchesSchema(CONTRACT, 'ErrorResponse', await res.json());
  });
});
