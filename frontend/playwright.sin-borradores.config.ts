import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',testMatch:'sin-borradores-local.spec.ts',workers:1,reporter:'list',
  use:{baseURL:'http://localhost:14212',serviceWorkers:'block'},
  webServer:{command:'node e2e/serve-production.mjs',url:'http://localhost:14212',
    env:{E2E_FRONTEND_PORT:'14212'},reuseExistingServer:false,timeout:30000}
});
