import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Contract: contracts/order-create/openapi.yaml
// Valideert dat POST /api/orders voldoet aan het gepubliceerde contract

const ORDER_URL = process.env.ORDER_URL ?? 'http://localhost:8080';

const doc = yaml.load(
  fs.readFileSync(path.join(__dirname, '../../../contracts/order-create/openapi.yaml'), 'utf8')
) as any;

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateRequest  = ajv.compile(doc.components.schemas.CreateOrderRequest);
const validateResponse = ajv.compile(doc.components.schemas.OrderResponse);
const validateError    = ajv.compile(doc.components.schemas.ErrorResponse);

test.describe('Type 0 – Contract: POST /api/orders (order-create/openapi.yaml)', () => {

  test('request voldoet aan CreateOrderRequest schema', () => {
    const body = { amount: 49.95 };
    expect(validateRequest(body)).toBe(true);
  });

  test('response voldoet aan OrderResponse schema', async ({ request }) => {
    const res = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 49.95 }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const valid = validateResponse(body);
    if (!valid) console.error(validateResponse.errors);
    expect(valid).toBe(true);
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
    expect(validateError(body)).toBe(true);
  });
});
