import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['avisos-coherencia-visual.spec.ts','compartidos-avisos-legibilidad-local.spec.ts','avisos-compartidos-local.spec.ts'],
 workers:1,timeout:120000,reporter:'list',use:{baseURL:'http://localhost:14381',serviceWorkers:'block'},
 webServer:{command:'node e2e/serve-production.mjs',url:'http://localhost:14381',env:{E2E_FRONTEND_PORT:'14381'},reuseExistingServer:false,timeout:30000}});
