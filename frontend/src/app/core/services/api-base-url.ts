import { Capacitor } from '@capacitor/core';

const runtimeApiBaseUrl = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const injected = (window as unknown as Record<string, unknown>)['__API_BASE_URL__'];
  return typeof injected === 'string' && injected.length > 0 ? injected : undefined;
};

/**
 * En la web la API es '/api', o sea el mismo origen que la pagina, y nunca el dominio de
 * Render directamente.
 *
 * En desarrollo lo resuelve proxy.conf.json contra el backend local. En produccion lo
 * resuelve el rewrite de vercel.json, que reenvia a Render por detras.
 *
 * La razon de que sea el mismo origen es la cookie de sesion. Con la app en vercel.app
 * llamando a onrender.com, esa cookie cuenta como de terceros, y Firefox o Safari la bloquean
 * dejando al usuario sin sesion. Al pasar por el proxy pasa a ser de primera parte y todos los
 * navegadores la respetan. Android empaqueta recursos locales y usa HTTP nativo hacia
 * el mismo proxy HTTPS de Kaptal, sin habilitar navegacion remota en el WebView.
 */
export function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) return 'https://kaptalgf.vercel.app/api';
  const configured = runtimeApiBaseUrl();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return '/api';
}
