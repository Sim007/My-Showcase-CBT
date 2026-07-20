import { test, expect } from '@playwright/test';

// Type 3: Extern — Payment service → Externe betaalprovider (SOAP via WireMock)
// Valideert dat de Payment service de SOAP provider correct aanroept conform payment.wsdl

const PAYMENT_URL = process.env.PAYMENT_URL ?? 'http://localhost:8081';
const WIREMOCK_URL = process.env.WIREMOCK_URL ?? 'http://localhost:8083';

test.describe('Type 3 – Contract: Payment→Externe SOAP-provider', () => {

  test('betaling roept SOAP Authorize aan en verwerkt approved respons', async ({ request }) => {
    const orderId = `order-soap-${Date.now()}`;

    const response = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId, amount: 99.00 }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.approved).toBe(true);
    expect(body.status).toBe('APPROVED');
  });

  test('orderId 999 triggert SOAP rejected-pad', async ({ request }) => {
    const response = await request.post(`${PAYMENT_URL}/api/payments`, {
      data: { orderId: '999', amount: 50.00 }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.approved).toBe(false);
    expect(body.status).toBe('REJECTED');
  });

  test('WireMock SOAP mock is bereikbaar', async ({ request }) => {
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="http://showcase.nl/payment/external">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:AuthorizeRequest>
      <tns:orderId>order-direct-test</tns:orderId>
      <tns:amount>25.00</tns:amount>
    </tns:AuthorizeRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await request.post(`${WIREMOCK_URL}/soap/payment`, {
      data: soapEnvelope,
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': 'http://showcase.nl/payment/external/Authorize'
      }
    });

    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('<tns:approved>true</tns:approved>');
    expect(xml).toContain('AuthorizeResponse');
  });

  test('WireMock SOAP rejected-pad direct aanroepen', async ({ request }) => {
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="http://showcase.nl/payment/external">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:AuthorizeRequest>
      <tns:orderId>999</tns:orderId>
      <tns:amount>100.00</tns:amount>
    </tns:AuthorizeRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await request.post(`${WIREMOCK_URL}/soap/payment`, {
      data: soapEnvelope,
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': 'http://showcase.nl/payment/external/Authorize'
      }
    });

    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('<tns:approved>false</tns:approved>');
  });
});
