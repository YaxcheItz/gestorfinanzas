import { defineConfig } from '@playwright/test';
const dev = process.env['E2E_AVISOS_DEV'] === 'true';

// Solo interfaz y puentes nativos ficticios: no inicia ni necesita un backend.
export default defineConfig({
  testDir: './e2e', testMatch: 'avisos-android-ui.spec.ts', workers: 1,
  reporter: 'list', use: { baseURL: 'http://localhost:14210', serviceWorkers: 'block' },
  webServer: { command: dev ? 'npm run start:e2e -- --host localhost --port 14210' : 'node e2e/serve-production.mjs', url: 'http://localhost:14210',
    env: { E2E_FRONTEND_PORT: '14210' }, reuseExistingServer: false, timeout: dev ? 120000 : 30000 },
});
