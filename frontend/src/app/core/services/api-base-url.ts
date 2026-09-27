export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.port === '4200') {
    return '/api';
  }

  const host = typeof window === 'undefined' ? 'localhost' : window.location.hostname;
  return `http://${host}:8080/api`;
}
