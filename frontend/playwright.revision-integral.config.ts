import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:['chat-visual-local.spec.ts','controles-texto-local.spec.ts','formularios-local.spec.ts','navegacion-detalles-local.spec.ts','avisos-compartidos-local.spec.ts','listas-visual-local.spec.ts','dock-local.spec.ts','contraste-audit-local.spec.ts','teclado-secciones-local.spec.ts','estados-local.spec.ts','poblados-local.spec.ts','configuracion-fechas-local.spec.ts','bordes-controles-local.spec.ts'],workers:1,timeout:180000,
 reporter:'list',use:{baseURL:'http://localhost:14318',serviceWorkers:'block'},
 webServer:{command:'node e2e/serve-production.mjs',url:'http://localhost:14318',env:{E2E_FRONTEND_PORT:'14318'},reuseExistingServer:false,timeout:30000},
});
