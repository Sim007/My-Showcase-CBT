import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Type 1: Tussen deelsystemen — Payment service (consumer) → Notification service (provider) via REST
// Contract: contracts/payment-notification-rest/1.0.0/openapi.yaml

const PAYMENT_URL      = process.env.PAYMENT_URL      ?? 'http://localhost:8081';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:8082';

const doc = yaml.load(
  fs.readFileSync(path.join(__dirname, '../../../contracts/payment-notification-rest/1.0.0/openapi.yaml'), 'utf8')
) as any;

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateRequest  = ajv.compile(doc.components.schemas.CreateNotificationRequest);
const validateResponse = ajv.compile(doc.components.schemas.NotificationResponse);
const validateError    = ajv.compile(doc.components.schemas.ErrorResponse);
const allowedTypes     = doc.components.schemas.CreateNotificationRequest.properties.type.enum as string[];

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

    expect(validateRequest(body)).toBe(true);

    const res = await request.post(`${NOTIFICATION_URL}/api/notifications`, { data: body });
    expect(res.status()).toBe(201);

    const json = await res.json();
    const valid = validateResponse(json);
    if (!valid) console.error(validateResponse.errors);
    expect(valid).toBe(true);

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
    expect(validateError(await res.json())).toBe(true);
  });

  test('leeg orderId retourneert 400 met ErrorResponse', async ({ request }) => {
    const res = await request.post(`${NOTIFICATION_URL}/api/notifications`, {
      data: { orderId: '', type: 'PAYMENT_APPROVED', message: 'test' }
    });
    expect(res.status()).toBe(400);
    expect(validateError(await res.json())).toBe(true);
  });
});
