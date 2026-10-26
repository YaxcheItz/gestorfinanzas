import { defineConfig } from '@playwright/test';

// Solo interfaz y puentes nativos ficticios: no inicia ni necesita un backend.
export default defineConfig({
  testDir: './e2e', testMatch: 'avisos-android-ui.spec.ts', workers: 1,
  reporter: 'list', use: { baseURL: 'http://localhost:14210', serviceWorkers: 'block' },
  webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14210',
    env: { E2E_FRONTEND_PORT: '14210' }, reuseExistingServer: false, timeout: 30000 },
});
