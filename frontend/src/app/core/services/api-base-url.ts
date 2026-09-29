const runtimeApiBaseUrl = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const injected = (window as unknown as Record<string, unknown>)['__API_BASE_URL__'];
  return typeof injected === 'string' && injected.length > 0 ? injected : undefined;
};

export function getApiBaseUrl(): string {
  const configured = runtimeApiBaseUrl();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location.port === '4200') {
    return '/api';
  }

  const host = typeof window === 'undefined' ? 'localhost' : window.location.hostname;
  return `http://${host}:8080/api`;
}
