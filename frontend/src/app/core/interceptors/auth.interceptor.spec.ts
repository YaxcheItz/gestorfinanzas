import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  /** El service arma la URL con getApiBaseUrl(), asi que llega absoluta. */
  const esRefresh = (req: HttpRequest<unknown>) => req.url.endsWith('/api/auth/refresh');

  const sesionValida = (token: string) => ({
    success: true,
    message: 'ok',
    data: { token, tokenType: 'Bearer', id: 1, nombre: 'Ana', email: 'ana@example.com' }
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        // Cerrar la sesion navega al login; aqui no hay rutas y solo interesa el efecto
        // sobre el almacenamiento, asi que se sustituye por un doble.
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('no intenta renovar cuando la peticion ya funciona', () => {
    localStorage.setItem('finanzas_token', 'token-bueno');

    http.get('/api/cuentas').subscribe();

    const req = backend.expectOne('/api/cuentas');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-bueno');
    req.flush([]);
    backend.expectNone(esRefresh);
  });

  it('no filtra el token a terceros ni renueva por su respuesta 401', () => {
    localStorage.setItem('finanzas_token', 'token-privado');
    for (const url of ['https://externo.example/api/cuentas', '//externo.example/api/cuentas',
      '/archivo?destino=/api/cuentas', '/api-ajena/cuentas']) {
      http.get(url).subscribe({ error: () => undefined });
      const request = backend.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
      backend.expectNone(esRefresh);
    }
    expect(localStorage.getItem('finanzas_token')).toBe('token-privado');
  });

  it('admite la API absoluta configurada sin extender la confianza a otros orígenes', () => {
    const runtime = window as unknown as Record<string, unknown>;
    const previous = runtime['__API_BASE_URL__'];
    runtime['__API_BASE_URL__'] = 'https://api.example/api';
    localStorage.setItem('finanzas_token', 'token-privado');
    try {
      http.get('https://api.example/api/cuentas').subscribe();
      const propia = backend.expectOne('https://api.example/api/cuentas');
      expect(propia.request.headers.get('Authorization')).toBe('Bearer token-privado');
      propia.flush([]);
      http.get('https://api.example.evil.test/api/cuentas').subscribe();
      const ajena = backend.expectOne('https://api.example.evil.test/api/cuentas');
      expect(ajena.request.headers.has('Authorization')).toBe(false);
      ajena.flush([]);
    } finally {
      if (previous === undefined) delete runtime['__API_BASE_URL__'];
      else runtime['__API_BASE_URL__'] = previous;
    }
  });

  it('renueva en silencio y reintenta cuando el access token caduca', () => {
    localStorage.setItem('finanzas_token', 'token-caducado');

    let resultado: unknown;
    http.get('/api/cuentas').subscribe(r => (resultado = r));

    backend.expectOne('/api/cuentas').flush(
      { message: 'expirado' },
      { status: 401, statusText: 'Unauthorized' }
    );

    const refresh = backend.expectOne(esRefresh);
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(sesionValida('token-nuevo'));

    const reintento = backend.expectOne('/api/cuentas');
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    reintento.flush([{ id: 7 }]);

    expect(resultado).toEqual([{ id: 7 }]);
    expect(localStorage.getItem('finanzas_token')).toBe('token-nuevo');
  });

  it('comparte un solo refresh cuando varias peticiones caducan a la vez', () => {
    localStorage.setItem('finanzas_token', 'token-caducado');

    http.get('/api/cuentas').subscribe();
    http.get('/api/transacciones').subscribe();

    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/transacciones').flush({}, { status: 401, statusText: 'Unauthorized' });

    // Con rotacion en el servidor, dos refresh simultaneos se revocarian entre si.
    const refreshes = backend.match(esRefresh);
    expect(refreshes.length).toBe(1);
    refreshes[0].flush(sesionValida('token-nuevo'));

    backend.expectOne('/api/cuentas').flush([{ id: 1 }]);
    backend.expectOne('/api/transacciones').flush([{ id: 2 }]);
  });

  it('cierra la sesion cuando la cookie de refresh tampoco sirve', () => {
    localStorage.setItem('finanzas_token', 'token-caducado');
    localStorage.setItem('finanzas_user', JSON.stringify({ id: 1, nombre: 'Ana', email: 'ana@example.com' }));

    http.get('/api/cuentas').subscribe({ error: () => undefined });

    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(esRefresh).flush(
      { message: 'sesion expirada' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(localStorage.getItem('finanzas_token')).toBeNull();
    expect(localStorage.getItem('finanzas_user')).toBeNull();
  });

  it('no intenta renovar cuando el 401 viene del propio login', () => {
    localStorage.setItem('finanzas_token', 'token-caducado');

    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });

    backend.expectOne('/api/auth/login').flush(
      { message: 'credenciales incorrectas' },
      { status: 401, statusText: 'Unauthorized' }
    );

    backend.expectNone(esRefresh);
    expect(localStorage.getItem('finanzas_token')).toBe('token-caducado');
  });

  it('deja intacta la sesion ante un 403 o un error del servidor', () => {
    localStorage.setItem('finanzas_token', 'token-bueno');

    http.get('/api/cuentas').subscribe({ error: () => undefined });
    backend.expectOne('/api/cuentas').flush({}, { status: 403, statusText: 'Forbidden' });

    http.get('/api/cuentas').subscribe({ error: () => undefined });
    backend.expectOne('/api/cuentas').flush({}, { status: 500, statusText: 'Error' });

    backend.expectNone(esRefresh);
    expect(localStorage.getItem('finanzas_token')).toBe('token-bueno');
  });

  it('renovarSesion reutiliza la peticion en vuelo', () => {
    const authService = TestBed.inject(AuthService);

    authService.renovarSesion().subscribe();
    authService.renovarSesion().subscribe();

    expect(backend.match(esRefresh).length).toBe(1);
  });

  it('el refresh lleva la cabecera anti-CSRF ademas de la cookie', () => {
    // Sin esa cabecera el servidor responde 403: la cookie va en SameSite=None porque
    // vercel.app y onrender.com son sitios distintos, y eso deja abierta la puerta a que otra
    // pagina lance el POST por su cuenta.
    const authService = TestBed.inject(AuthService);

    authService.renovarSesion().subscribe({ error: () => undefined });

    const refresh = backend.expectOne(esRefresh);
    expect(refresh.request.headers.has('X-Gestion-Sesion')).toBe(true);
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(sesionValida('token-nuevo'));
  });

  it('el logout tambien va protegido contra CSRF', () => {
    const authService = TestBed.inject(AuthService);

    authService.logout();

    const logout = backend.expectOne(r => r.url.endsWith('/api/auth/logout'));
    expect(logout.request.headers.has('X-Gestion-Sesion')).toBe(true);
    expect(logout.request.withCredentials).toBe(true);
    logout.flush({ message: 'ok' });
  });
});
