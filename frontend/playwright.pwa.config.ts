import { defineConfig, devices } from '@playwright/test';
import production from './playwright.production.config';

export default defineConfig({
  ...production,
  testMatch:'**/pwa-offline.spec.ts',
  projects:[{name:'chromium-pwa',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'allow'}}],
});
