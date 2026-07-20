import { test, expect } from '@playwright/test';
import { assertMatchesSchema } from '../fixtures/ajv-schema';

// Onderdeel 5 — dunne semantische ketentest over Order → Payment → Notification. Herhaalt geen
// scenario's die al op grensniveau bewezen zijn (die staan in intern/, rest/, async/); bewijst
// alleen dat de volledige keten, end-to-end, de juiste zakelijke uitkomst oplevert. Het
// REJECTED-pad (orderId "999") is via deze route niet reproduceerbaar — Order genereert zelf een
// willekeurige orderId — en is al gedekt in rest/order-payment.spec.ts en soap/payment-soap.spec.ts.

const ORDER_URL        = process.env.ORDER_URL        ?? 'http://localhost:8080';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:8082';

async function waitForNotification(request: any, orderId: string, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${NOTIFICATION_URL}/api/notifications?orderId=${orderId}`);
    const notifications = await res.json();
    const approved = notifications.find((n: any) => n.type === 'PAYMENT_APPROVED');
    if (approved) return approved;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Geen PAYMENT_APPROVED-notificatie voor ${orderId} binnen ${timeoutMs}ms`);
}

test.describe('Keten – Order → Payment → Notification', () => {

  test('een aangemaakte order resulteert in een opvraagbare, goedgekeurde notificatie', async ({ request }) => {
    // 1. Order aanmaken
    const createRes = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 42.50 }
    });
    expect(createRes.status()).toBe(200);
    const order = await createRes.json();
    expect(order.paymentStatus).toBe('APPROVED');
    expect(order.approved).toBe(true);

    // 2. Order is terug te vinden bij Order zelf
    const lookupRes = await request.get(`${ORDER_URL}/api/orders/${order.orderId}`);
    expect(lookupRes.status()).toBe(200);
    const lookedUp = await lookupRes.json();
    expect(lookedUp.orderId).toBe(order.orderId);

    // 3. Notification heeft de goedkeuring ontvangen — en die notificatie is spec-conform
    const notification = await waitForNotification(request, order.orderId);
    expect(notification.orderId).toBe(order.orderId);
    assertMatchesSchema(
      'payment-notification/1.0.0/asyncapi.yaml',
      'PaymentNotificationPayload',
      notification
    );
  });
});
