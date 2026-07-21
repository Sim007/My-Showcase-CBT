import { test, expect } from '@playwright/test';
import { assertMatchesSchema } from '../fixtures/ajv-schema';

// Contract: contracts/order-lookup/1.0.0/openapi.yaml
// Valideert dat GET /api/orders/{id} voldoet aan het gepubliceerde contract

const ORDER_URL = process.env.ORDER_URL ?? 'http://localhost:8080';
const CONTRACT = 'order-lookup/1.0.0/openapi.yaml';

test.describe('Type 1 – Contract: GET /api/orders/{id} (order-lookup/openapi.yaml)', () => {

  test('response voldoet aan OrderResponse schema', async ({ request }) => {
    // Maak eerst een order aan om een geldig ID te hebben
    const createRes = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 30.00 }
    });
    const { orderId } = await createRes.json();

    const res = await request.get(`${ORDER_URL}/api/orders/${orderId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'OrderResponse', body);
  });

  test('response bevat hetzelfde orderId als in het pad', async ({ request }) => {
    const createRes = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 20.00 }
    });
    const { orderId } = await createRes.json();

    const res = await request.get(`${ORDER_URL}/api/orders/${orderId}`);
    const body = await res.json();
    expect(body.orderId).toBe(orderId);
  });

  test('onbekend orderId retourneert 404', async ({ request }) => {
    const res = await request.get(`${ORDER_URL}/api/orders/bestaat-niet-xyz`);
    expect(res.status()).toBe(404);
  });
});
