const runtimeApiBaseUrl = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const injected = (window as unknown as Record<string, unknown>)['__API_BASE_URL__'];
  return typeof injected === 'string' && injected.length > 0 ? injected : undefined;
};

/**
 * La API siempre es '/api', o sea el mismo origen que la pagina, y nunca el dominio de
 * Render directamente.
 *
 * En desarrollo lo resuelve proxy.conf.json contra el backend local. En produccion lo
 * resuelve el rewrite de vercel.json, que reenvia a Render por detras.
 *
 * La razon de que sea el mismo origen es la cookie de sesion. Con la app en vercel.app
 * llamando a onrender.com, esa cookie cuenta como de terceros, y Firefox o Safari la bloquean
 * dejando al usuario sin sesion. Al pasar por el proxy pasa a ser de primera parte y todos los
 * navegadores la respetan.
 */
export function getApiBaseUrl(): string {
  const configured = runtimeApiBaseUrl();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return '/api';
}
