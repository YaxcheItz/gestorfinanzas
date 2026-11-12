import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'configuracion-fechas-local.spec.ts', workers: 1, timeout: 60000,
  reporter: 'list', use: { baseURL: 'http://localhost:14322', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14322', env: { E2E_FRONTEND_PORT: '14322' }, reuseExistingServer: false, timeout: 30000 },
});
