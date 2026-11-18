import { defineConfig, devices } from '@playwright/test';
import production from './playwright.production.config';

export default defineConfig({
  ...production,
  testMatch: ['historial-movil.spec.ts', 'periodos-flexibles.spec.ts', 'registro-responsive.spec.ts', 'pwa-offline.spec.ts'],
  projects: [
    { name: 'chromium', testIgnore: '**/pwa-offline.spec.ts', use: {
      ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block'
    } },
    { name: 'chromium-pwa', testMatch: '**/pwa-offline.spec.ts', use: {
      ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'allow'
    } }
  ]
});
