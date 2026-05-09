import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Contract: contracts/order-lookup/openapi.yaml
// Valideert dat GET /api/orders/{id} voldoet aan het gepubliceerde contract

const ORDER_URL = process.env.ORDER_URL ?? 'http://localhost:8080';

const doc = yaml.load(
  fs.readFileSync(path.join(__dirname, '../../../contracts/order-lookup/openapi.yaml'), 'utf8')
) as any;

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateResponse = ajv.compile(doc.components.schemas.OrderResponse);

test.describe('Type 0 – Contract: GET /api/orders/{id} (order-lookup/openapi.yaml)', () => {

  test('response voldoet aan OrderResponse schema', async ({ request }) => {
    // Maak eerst een order aan om een geldig ID te hebben
    const createRes = await request.post(`${ORDER_URL}/api/orders`, {
      data: { amount: 30.00 }
    });
    const { orderId } = await createRes.json();

    const res = await request.get(`${ORDER_URL}/api/orders/${orderId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const valid = validateResponse(body);
    if (!valid) console.error(validateResponse.errors);
    expect(valid).toBe(true);
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
