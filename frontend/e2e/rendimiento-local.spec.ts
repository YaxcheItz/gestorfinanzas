import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { registrarPrueba } from './registro-helper';

test.setTimeout(120_000);
test('mide latencias HTTP locales sin cuerpos financieros ni proveedores externos', async ({ request, baseURL }, info) => {
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const database = process.env['E2E_DATABASE_URL'];
  if (database) expect(/^jdbc:postgresql:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(database), 'Only local PostgreSQL is permitted').toBe(true);
  const registration = await registrarPrueba(request, {
    nombre: 'Medición local', email: `measure-${crypto.randomUUID()}@example.test`, password: 'Password123',
  });
  expect(registration.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await registration.json()).data.token}` };
  const account = await request.post('/api/cuentas', { headers,
    data: { nombre: 'Cuenta sintética', tipo: 'DEBITO', moneda: 'MXN', saldoInicial: 1000 } });
  expect(account.ok()).toBeTruthy();
  const accountId = (await account.json()).data.id;
  const records = 20;
  for (let index = 0; index < records; index++) {
    const created = await request.post('/api/transacciones', { headers, data: {
      cuentaId: accountId, tipo: 'GASTO', monto: 1, fecha: '2026-10-24', descripcion: `Ensayo ${index}`,
    } });
    expect(created.ok()).toBeTruthy();
  }
  const groups = [
    { name: 'health', path: '/api/health' },
    { name: 'accounts', path: '/api/cuentas' },
    { name: 'transactions-page', path: '/api/transacciones?page=0&size=20' },
  ];
  const samples = 20, warmup = 3;
  const measurements = [];
  for (const group of groups) {
    const elapsed: number[] = [];
    for (let index = 0; index < samples + warmup; index++) {
      const start = performance.now();
      const response = await request.get(group.path, { headers });
      await response.body(); // Include the full transfer, without retaining or logging the body.
      const duration = performance.now() - start;
      expect(response.status()).toBe(200);
      if (index >= warmup) elapsed.push(duration);
      await response.dispose();
    }
    elapsed.sort((a, b) => a - b);
    const percentile = (p: number) => Number(elapsed[Math.ceil(p * elapsed.length) - 1].toFixed(3));
    measurements.push({ operation: group.name, samples, warmup, minMs: Number(elapsed[0].toFixed(3)),
      p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: Number(elapsed.at(-1)!.toFixed(3)) });
  }
  const report = { format: 1, environment: 'isolated-local-api-through-development-proxy',
    database: database ? 'PostgreSQL-local' : 'H2-local', syntheticPurchases: records,
    method: 'sequential-warm-nearest-rank', measurements,
    limits: ['not-production-latency', 'not-a-query-plan-or-load-test', 'no-ai-provider-calls', 'no-financial-bodies'] };
  await writeFile(info.outputPath('local-performance.json'), JSON.stringify(report, null, 2));
  for (const measurement of measurements) {
    expect(measurement.p95Ms).toBeGreaterThanOrEqual(measurement.p50Ms);
    expect(measurement.maxMs).toBeGreaterThanOrEqual(measurement.p95Ms);
  }
});
