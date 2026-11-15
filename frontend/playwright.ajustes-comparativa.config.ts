import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['cuentas-enlace-legibilidad.spec.ts', 'captura-distribucion-legible.spec.ts', 'coherencia-secciones-local.spec.ts', 'teclado-secciones-local.spec.ts', 'formularios-local.spec.ts', 'controles-texto-local.spec.ts'],
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:14360', serviceWorkers: 'block' },
  webServer: {
    command: 'node e2e/serve-production.mjs',
    url: 'http://localhost:14360',
    env: { E2E_FRONTEND_PORT: '14360' },
    reuseExistingServer: false,
    timeout: 30_000
  }
});
