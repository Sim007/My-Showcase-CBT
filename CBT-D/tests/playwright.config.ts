import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  projects: [
    {
      name: 'intern – binnen deelsysteem (Angular UI → Backend)',
      testDir: './intern',
      use: { baseURL: 'http://localhost:4200', navigationTimeout: 45_000 },
    },
    {
      name: 'rest – tussen deelsystemen (Order → Payment)',
      testDir: './rest',
    },
    {
      name: 'async – queue (Payment → Notification)',
      testDir: './async',
    },
    {
      name: 'soap – extern SOAP (Payment → WireMock)',
      testDir: './soap',
    },
    {
      name: 'chain – keten Order → Payment → Notification',
      testDir: './chain',
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
