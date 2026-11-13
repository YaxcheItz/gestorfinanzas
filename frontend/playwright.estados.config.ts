import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './e2e', testMatch: ['estados-local.spec.ts', 'poblados-local.spec.ts'], workers: 1, timeout: 45000,
    reporter: 'list', use: { baseURL: 'http://localhost:14321', serviceWorkers: 'block' },
    webServer: {
        command: 'node e2e/serve-production.mjs', url: 'http://localhost:14321',
        env: { E2E_FRONTEND_PORT: '14321' }, reuseExistingServer: false, timeout: 30000,
    },
});
