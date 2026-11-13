import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',testMatch:'widgets-graficos-local.spec.ts',workers:1,timeout:120000,
  reporter:'list',use:{baseURL:'http://localhost:14326',serviceWorkers:'block'},
  webServer:{command:'node e2e/serve-production.mjs',url:'http://localhost:14326',env:{E2E_FRONTEND_PORT:'14326'},reuseExistingServer:false,timeout:30000},
});
