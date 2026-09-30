import { getApiBaseUrl } from './api-base-url';

describe('getApiBaseUrl', () => {
  const ventana = window as unknown as Record<string, unknown>;

  afterEach(() => {
    delete ventana['__API_BASE_URL__'];
  });

  it('usa /api del mismo origen cuando no hay nada configurado', () => {
    // Es el caso por defecto en produccion y el que sostiene la cookie de sesion: si aqui
    // se devolviera el dominio de Render, la cookie seria de terceros y Firefox o Safari la
    // bloquearian.
    expect(getApiBaseUrl()).toBe('/api');
  });

  it('usa /api tambien cuando el valor inyectado viene vacio', () => {
    ventana['__API_BASE_URL__'] = '';

    expect(getApiBaseUrl()).toBe('/api');
  });

  it('respeta la URL de la API cuando viene configurada', () => {
    ventana['__API_BASE_URL__'] = 'https://kaptal-api-0xbn.onrender.com/api';

    expect(getApiBaseUrl()).toBe('https://kaptal-api-0xbn.onrender.com/api');
  });

  it('quita la barra final para no acabar en //api', () => {
    ventana['__API_BASE_URL__'] = 'https://kaptal-api-0xbn.onrender.com/api/';

    expect(getApiBaseUrl()).toBe('https://kaptal-api-0xbn.onrender.com/api');
  });

  it('deja pasar una ruta relativa configurada a mano', () => {
    ventana['__API_BASE_URL__'] = '/api';

    expect(getApiBaseUrl()).toBe('/api');
  });
});
