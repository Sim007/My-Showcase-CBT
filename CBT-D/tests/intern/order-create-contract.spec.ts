import { test, expect } from '@playwright/test';
import { assertMatchesSchema, getSchema } from '../fixtures/ajv-schema';

// Contract: contracts/order-create/1.0.0/openapi.yaml
// Valideert dat POST /api/orders voldoet aan het gepubliceerde contract

const ORDER_URL = process.env.ORDER_URL ?? 'http://localhost:8080';
const CONTRACT = 'order-create/1.0.0/openapi.yaml';

test.describe('Type 1 – Contract: POST /api/orders (order-create/openapi.yaml)', () => {

  test('request voldoet aan CreateOrderRequest schema', () => {
    assertMatchesSchema(CONTRACT, 'CreateOrderRequest', { amount: 49.95 });
  });

  test('response voldoet aan OrderResponse schema', async ({ request }) => {
    const res = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 49.95 }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'OrderResponse', body);
  });

  test('response bevat verplichte velden orderId, paymentStatus en approved', async ({ request }) => {
    const res = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 75.00 }
    });
    const body = await res.json();
    expect(body.orderId).toBeTruthy();
    expect(['APPROVED', 'REJECTED']).toContain(body.paymentStatus);
    expect(typeof body.approved).toBe('boolean');
  });

  test('fout-response voldoet aan ErrorResponse schema bij bedrag 0', async ({ request }) => {
    const res = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 0 }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'ErrorResponse', body);
  });

  test('ontbrekend verplicht veld amount retourneert 400', async ({ request }) => {
    const res = await request.post(`${ORDER_URL}/api/orders`, {
      data: {}
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'ErrorResponse', body);
  });

  test('CreateOrderRequest schema markeert amount als verplicht', () => {
    const schema = getSchema(CONTRACT, 'CreateOrderRequest');
    expect(schema.required).toContain('amount');
  });
});
