import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'avisos-compartidos-local.spec.ts', workers: 1, timeout: 90000,
  reporter: 'list', use: { baseURL: 'http://localhost:14317', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14317',
    env: { E2E_FRONTEND_PORT: '14317' }, reuseExistingServer: false, timeout: 30000 },
});
