import { defineConfig } from '@playwright/test';
import config from './playwright.config';

const servers = Array.isArray(config.webServer) ? config.webServer : [config.webServer!];
const frontendPort=process.env['E2E_FRONTEND_PORT'] ?? '14200';
export default defineConfig({
  ...config,
  webServer: [servers[0], {command:'node e2e/serve-production.mjs',url:`http://localhost:${frontendPort}`,
    reuseExistingServer:false,timeout:30000}],
});
