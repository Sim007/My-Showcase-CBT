import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Contract: contracts/order-payment/1.0.0/openapi.yaml
// Valideert dat POST /api/payments voldoet aan het gepubliceerde contract

const PAYMENT_URL = process.env.PAYMENT_URL ?? 'http://localhost:8081';

const doc = yaml.load(
  fs.readFileSync(path.join(__dirname, '../../../contracts/order-payment/1.0.0/openapi.yaml'), 'utf8')
) as any;

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateRequest  = ajv.compile(doc.components.schemas.PaymentRequest);
const validateResponse = ajv.compile(doc.components.schemas.PaymentResponse);
const validateError    = ajv.compile(doc.components.schemas.ErrorResponse);

test.describe('Type 0 – Contract: POST /api/payments (order-payment/openapi.yaml)', () => {

  test('request voldoet aan PaymentRequest schema', () => {
    const body = { orderId: 'order-c0-001', amount: 49.95 };
    expect(validateRequest(body)).toBe(true);
  });

  test('response voldoet aan PaymentResponse schema (approved)', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: 'order-c0-001', amount: 49.95 }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const valid = validateResponse(body);
    if (!valid) console.error(validateResponse.errors);
    expect(valid).toBe(true);
  });

  test('response voldoet aan PaymentResponse schema (rejected)', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: '999', amount: 10.00 }
    });
    const body = await res.json();
    expect(validateResponse(body)).toBe(true);
    expect(['APPROVED', 'REJECTED']).toContain(body.status);
  });

  test('fout-response voldoet aan ErrorResponse schema', async ({ request }) => {
    const res = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: 'order-c0-err', amount: 0 }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(validateError(body)).toBe(true);
  });
});
