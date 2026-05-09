import { FullConfig } from '@playwright/test';

const SERVICES = [
  { name: 'order backend',        url: 'http://localhost:8080/actuator/health' },
  { name: 'payment backend',      url: 'http://localhost:8081/actuator/health' },
  { name: 'notification backend', url: 'http://localhost:8082/actuator/health' },
  { name: 'portal shell',         url: 'http://localhost:4200' },
  { name: 'mf-order',             url: 'http://localhost:4201/remoteEntry.json' },
  { name: 'mf-payments',          url: 'http://localhost:4202/remoteEntry.json' },
  { name: 'mf-notifications',     url: 'http://localhost:4203/remoteEntry.json' },
];

async function waitFor(name: string, url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        console.log(`  ✓ ${name}`);
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 2_000));
  }
  throw new Error(`Timeout wachten op ${name} (${url})`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('\nWachten tot alle services gereed zijn...');
  await Promise.all(SERVICES.map(s => waitFor(s.name, s.url)));
  console.log('Alle services gereed. Tests starten.\n');
}
