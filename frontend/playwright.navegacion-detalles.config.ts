import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'navegacion-detalles-local.spec.ts', workers: 1, timeout: 90000,
  reporter: 'list', use: { baseURL: 'http://localhost:14316', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14316',
    env: { E2E_FRONTEND_PORT: '14316' }, reuseExistingServer: false, timeout: 30000 },
});
