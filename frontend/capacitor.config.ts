import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaptal.app',
  appName: 'Kaptal',
  webDir: 'dist/frontend/browser',
  loggingBehavior: 'none',
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  // Los recursos son locales. La API usa HTTPS y el almacén nativo de cookies HttpOnly.
  plugins: { CapacitorHttp: { enabled: true } }
};

export default config;
