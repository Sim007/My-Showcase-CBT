import { test, expect } from '@playwright/test';
import { assertMatchesSchema } from '../fixtures/ajv-schema';

// Contract: contracts/order-payment/1.0.0/openapi.yaml
// Valideert dat POST /api/payments voldoet aan het gepubliceerde contract

const PAYMENT_URL = process.env.PAYMENT_URL ?? 'http://localhost:8081';
const CONTRACT = 'order-payment/1.0.0/openapi.yaml';

test.describe('Type 1 – Contract: POST /api/payments (order-payment/openapi.yaml)', () => {

  test('request voldoet aan PaymentRequest schema', () => {
    assertMatchesSchema(CONTRACT, 'PaymentRequest', { orderId: 'order-c0-001', amount: 49.95 });
  });

  test('response voldoet aan PaymentResponse schema (approved)', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: 'order-c0-001', amount: 49.95 }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'PaymentResponse', body);
  });

  test('response voldoet aan PaymentResponse schema (rejected)', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: '999', amount: 10.00 }
    });
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'PaymentResponse', body);
    expect(['APPROVED', 'REJECTED']).toContain(body.status);
  });

  test('fout-response voldoet aan ErrorResponse schema', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: 'order-c0-err', amount: 0 }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'ErrorResponse', body);
  });

  test('ontbrekend verplicht veld orderId retourneert 400', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { amount: 49.95 }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    assertMatchesSchema(CONTRACT, 'ErrorResponse', body);
  });
});
