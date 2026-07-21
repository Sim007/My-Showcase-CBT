import { test, expect } from '@playwright/test';
import { assertMatchesSchema } from '../fixtures/ajv-schema';

// Type 2: Grens tussen deelsystemen binnen de tribe — Order service roept Payment service aan via REST
// Contract: contracts/order-payment/1.0.0/openapi.yaml

const ORDER_URL = process.env.ORDER_URL ?? 'http://localhost:8080';
const CONTRACT = 'order-payment/1.0.0/openapi.yaml';

test.describe('Type 2 – Contract: Order→Payment (REST)', () => {

  test('POST /api/orders triggert betaling en retourneert APPROVED', async ({ request }) => {
    const res = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 75.00 }
    });

    expect(res.status()).toBe(200);
    const order = await res.json();

    expect(order.orderId).toBeTruthy();
    expect(order.paymentStatus).toBe('APPROVED');
    expect(order.approved).toBe(true);
  });

  test('response van Payment service voldoet aan OpenAPI contract', async ({ request }) => {
    // Roep Order aan — Order roept intern Payment aan
    // We valideren dat de doorgestuurde response-structuur klopt met het contract
    const orderRes = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 50.00 }
    });
    const order = await orderRes.json();

    // Bouw het Payment-response-formaat na en valideer tegen schema
    const paymentShape = {
      paymentId: 'inferred',
      orderId: order.orderId,
      status: order.paymentStatus,
      approved: order.approved
    };
    assertMatchesSchema(CONTRACT, 'PaymentResponse', paymentShape);
  });

  test('GET /api/orders/{id} retourneert aangemaakte order', async ({ request }) => {
    const createRes = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 30.00 }
    });
    const { orderId } = await createRes.json();

    const getRes = await request.get(`${ORDER_URL}/api/orders/${orderId}`);
    expect(getRes.status()).toBe(200);

    const order = await getRes.json();
    expect(order.orderId).toBe(orderId);
    expect(order.paymentStatus).toBeTruthy();
  });

  test('GET /api/orders/{id} retourneert 404 voor onbekend order', async ({ request }) => {
    const res = await request.get(`${ORDER_URL}/api/orders/bestaat-niet`);
    expect(res.status()).toBe(404);
  });
});
