import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: ['metas-texto-legibilidad.spec.ts', 'reportes-metas-legibilidad-local.spec.ts', 'reportes-importes-legibilidad.spec.ts'],
  workers: 1, timeout: 120_000, reporter: 'list',
  use: { baseURL: 'http://localhost:14377', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14377',
    env: { E2E_FRONTEND_PORT: '14377' }, reuseExistingServer: false, timeout: 30_000 }
});
