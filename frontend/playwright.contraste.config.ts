import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './e2e', testMatch: ['contraste-audit-local.spec.ts', 'teclado-secciones-local.spec.ts'], workers: 1, timeout: 180000,
    reporter: 'list', use: { baseURL: 'http://localhost:14320', serviceWorkers: 'block' },
    webServer: { command: 'node e2e/serve-production.mjs', url: 'http://localhost:14320',
        env: { E2E_FRONTEND_PORT: '14320' }, reuseExistingServer: false, timeout: 30000 },
});
