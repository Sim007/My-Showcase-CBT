import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Type 2: Queue — Payment service publiceert naar RabbitMQ, Notification service ontvangt
// Contract: contracts/payment-notification/asyncapi.yaml

const PAYMENT_URL      = process.env.PAYMENT_URL      ?? 'http://localhost:8081';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:8082';

const asyncApiDoc = yaml.load(
  fs.readFileSync(path.join(__dirname, '../../contracts/payment-notification/asyncapi.yaml'), 'utf8')
) as any;

const payloadSchema = asyncApiDoc.components.schemas.PaymentNotificationPayload;
const allowedTypes  = payloadSchema.properties.type.enum as string[];

test.describe('Type 2 – Contract: Payment→Notification (Queue/RabbitMQ)', () => {

  test('na APPROVED betaling verschijnt PAYMENT_APPROVED notificatie', async ({ request }) => {
    const orderId = `order-q-${Date.now()}`;

    const payRes = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId, amount: 30.00 }
    });
    expect(payRes.status()).toBe(200);

    await new Promise(r => setTimeout(r, 1500));

    const notifRes = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=${orderId}`);
    expect(notifRes.status()).toBe(200);

    const notifications = await notifRes.json();
    expect(notifications.length).toBeGreaterThan(0);

    const notif = notifications[0];

    // Valideer structuur conform AsyncAPI contract
    expect(notif.notificationId).toBeTruthy();
    expect(notif.orderId).toBe(orderId);
    expect(allowedTypes).toContain(notif.type);
    expect(notif.message).toBeTruthy();
    expect(notif.timestamp).toBeTruthy();

    expect(notif.type).toBe('PAYMENT_APPROVED');
  });

  test('na REJECTED betaling (orderId 999) verschijnt PAYMENT_REJECTED notificatie', async ({ request }) => {
    await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: '999', amount: 10.00 }
    });

    await new Promise(r => setTimeout(r, 1500));

    const notifRes = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=999`);
    const notifications = await notifRes.json();

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[notifications.length - 1].type).toBe('PAYMENT_REJECTED');
  });

  test('notificatie voor onbekend orderId retourneert lege lijst', async ({ request }) => {
    const res = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=order-nooit-geweest`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
