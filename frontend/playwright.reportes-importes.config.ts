import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['reportes-importes-legibilidad.spec.ts', 'reportes-metas-legibilidad-local.spec.ts', 'reportes-ancho-local.spec.ts'],
  workers: 1, timeout: 120_000, reporter: 'list',
  use: { baseURL: 'http://localhost:14374', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14374',
    env: { E2E_FRONTEND_PORT: '14374' }, reuseExistingServer: false, timeout: 30_000 }
});
