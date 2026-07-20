import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Contract: contracts/notification-lookup/1.0.0/openapi.yaml
// Valideert dat GET /api/notifications voldoet aan het gepubliceerde contract

const PAYMENT_URL      = process.env.PAYMENT_URL      ?? 'http://localhost:8081';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:8082';

const doc = yaml.load(
  fs.readFileSync(path.join(__dirname, '../../../contracts/notification-lookup/1.0.0/openapi.yaml'), 'utf8')
) as any;

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateItem = ajv.compile(doc.components.schemas.NotificationResponse);
const allowedTypes = doc.components.schemas.NotificationResponse.properties.type.enum as string[];

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
      const valid = validateItem(item);
      if (!valid) console.error(validateItem.errors);
      expect(valid).toBe(true);
      expect(allowedTypes).toContain(item.type);
    }
  });

  test('response headers bevatten Content-Type application/json', async ({ request }) => {
    const res = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=order-headers-test`);
    expect(res.headers()['content-type']).toContain('application/json');
  });
});
