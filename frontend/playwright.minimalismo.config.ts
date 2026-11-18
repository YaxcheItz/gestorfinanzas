import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: ['minimalismo-local.spec.ts'], workers: 1, timeout: 120_000,
  reporter: 'list', use: { baseURL: 'http://localhost:14365', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14365',
    env: { E2E_FRONTEND_PORT: '14365' }, reuseExistingServer: false, timeout: 30_000 }
});
