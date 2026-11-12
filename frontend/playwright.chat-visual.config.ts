import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'chat-visual-local.spec.ts', workers: 1, timeout: 90000,
  reporter: 'list', use: { baseURL: 'http://localhost:14313', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14313',
    env: { E2E_FRONTEND_PORT: '14313' }, reuseExistingServer: false, timeout: 30000 },
});
