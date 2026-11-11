import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',testMatch:'chat-local.spec.ts',workers:1,reporter:'list',
  use:{baseURL:'http://localhost:14211',serviceWorkers:'block'},
  webServer:{command:'node e2e/serve-production.mjs',url:'http://localhost:14211',
    env:{E2E_FRONTEND_PORT:'14211'},reuseExistingServer:false,timeout:30000}
});
