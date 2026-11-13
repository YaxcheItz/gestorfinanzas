import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'controles-texto-local.spec.ts', workers: 1, timeout: 90000,
  reporter: 'list', use: { baseURL: 'http://localhost:14314', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14314',
    env: { E2E_FRONTEND_PORT: '14314' }, reuseExistingServer: false, timeout: 30000 },
});
