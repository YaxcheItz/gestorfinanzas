import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'coherencia-secciones-local.spec.ts',workers:1,timeout:120000,reporter:'list',use:{baseURL:'http://localhost:14358',serviceWorkers:'block'},webServer:{command:'node e2e/serve-production.mjs',url:'http://localhost:14358',env:{E2E_FRONTEND_PORT:'14358'},reuseExistingServer:false,timeout:30000}});
