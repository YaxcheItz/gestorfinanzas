import { defineConfig } from '@playwright/test';
import config from './playwright.config';

const servers = Array.isArray(config.webServer) ? config.webServer : [config.webServer!];
export default defineConfig({
  ...config,
  webServer: [servers[0], {command:'node e2e/serve-production.mjs',url:'http://localhost:14200',
    reuseExistingServer:false,timeout:30000}],
});
