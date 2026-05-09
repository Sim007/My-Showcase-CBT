import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  projects: [
    {
      name: 'type0 – binnen deelsysteem (Angular UI → Backend)',
      testDir: './type0',
      use: { baseURL: 'http://localhost:4200', navigationTimeout: 45_000 },
    },
    {
      name: 'type1 – tussen deelsystemen (Order → Payment)',
      testDir: './type1',
    },
    {
      name: 'type2 – queue (Payment → Notification)',
      testDir: './type2',
    },
    {
      name: 'type3 – extern SOAP (Payment → WireMock)',
      testDir: './type3',
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
