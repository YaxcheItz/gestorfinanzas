import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { appConfig } from '../../app.config';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

describe('sesiones con los interceptores de la aplicación', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let locksOriginal: PropertyDescriptor | undefined;
  const navigate = vi.fn(() => Promise.resolve(true));
  const usuario = { id: 1, nombre: 'Ana', email: 'ana@example.com' };
  const sesion = (token: string) => ({ success: true, message: 'ok', data: { ...usuario, token, tokenType: 'Bearer' } });

  beforeEach(() => {
    locksOriginal = Object.getOwnPropertyDescriptor(navigator, 'locks');
    localStorage.clear();
    localStorage.setItem('finanzas_token', 'token-anterior');
    localStorage.setItem('finanzas_user', JSON.stringify(usuario));
    navigate.mockClear();
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      { provide: Router, useValue: { navigate } }
    ] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    try { backend.verify(); }
    finally {
      if (locksOriginal) Object.defineProperty(navigator, 'locks', locksOriginal);
      else Reflect.deleteProperty(navigator, 'locks');
      localStorage.clear(); TestBed.resetTestingModule();
    }
  });

  it('conserva la identidad mientras renueva y no navega al login por el primer 401', () => {
    http.get('/api/cuentas').subscribe();
    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    backend.expectOne('/api/auth/refresh').flush(sesion('token-nuevo'));
    backend.expectOne('/api/cuentas').flush([]);
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('un fallo temporal al renovar conserva la sesión y se comunica como 503', () => {
    let status: number | undefined;
    http.get('/api/cuentas').subscribe({ error: error => status = error.status });
    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush({}, { status: 503, statusText: 'Unavailable' });

    expect(status).toBe(503);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getToken()).toBe('token-anterior');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('una cookie inválida termina la sesión una sola vez', () => {
    http.get('/api/cuentas').subscribe({ error: () => undefined });
    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('varias solicitudes con cookie inválida comparten el cierre y una sola navegación', () => {
    http.get('/api/cuentas').subscribe({ error: () => undefined });
    http.get('/api/transacciones').subscribe({ error: () => undefined });
    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/transacciones').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('un 401 tardío reutiliza el token renovado por otra petición', () => {
    http.get('/api/cuentas').subscribe();
    http.get('/api/transacciones').subscribe();
    const anterior = backend.expectOne('/api/transacciones');
    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush(sesion('token-nuevo'));
    backend.expectOne('/api/cuentas').flush([]);

    anterior.flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectNone('/api/auth/refresh');
    const reintento = backend.expectOne('/api/transacciones');
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    reintento.flush([]);
  });

  it('una respuesta antigua no vuelve a autenticar después de cerrar sesión', () => {
    http.get('/api/cuentas').subscribe({ error: () => undefined });
    const solicitud = backend.expectOne('/api/cuentas');
    auth.cerrarSesionLocal('salida');
    solicitud.flush({}, { status: 401, statusText: 'Unauthorized' });

    backend.expectNone('/api/auth/refresh');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('un fallo temporal al renovar directamente tampoco borra las credenciales', () => {
    auth.renovarSesion().subscribe({ error: () => undefined });
    backend.expectOne('/api/auth/refresh').flush({}, { status: 500, statusText: 'Error' });
    expect(auth.getToken()).toBe('token-anterior');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('una renovación en vuelo no resucita la sesión después de salir', () => {
    auth.renovarSesion().subscribe({ error: () => undefined });
    const refresh = backend.expectOne('/api/auth/refresh');
    auth.cerrarSesionLocal('salida');
    refresh.flush(sesion('token-nuevo'));
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('un 401 de la cuenta anterior no cierra ni reintenta solicitudes en la cuenta nueva', () => {
    http.get('/api/cuentas').subscribe({ error: () => undefined });
    const solicitud = backend.expectOne('/api/cuentas');
    auth.actualizarUsuario({ id: 2, nombre: 'Luis', email: 'luis@example.com' });
    localStorage.setItem('finanzas_token', 'token-luis');
    solicitud.flush({}, { status: 401, statusText: 'Unauthorized' });

    backend.expectNone('/api/auth/refresh');
    expect(auth.currentUser()?.id).toBe(2);
    expect(auth.getToken()).toBe('token-luis');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('un fallo de la renovación anterior no cierra una cuenta iniciada mientras tanto', () => {
    http.get('/api/cuentas').subscribe({ error: () => undefined });
    backend.expectOne('/api/cuentas').flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = backend.expectOne('/api/auth/refresh');
    auth.actualizarUsuario({ id: 2, nombre: 'Luis', email: 'luis@example.com' });
    localStorage.setItem('finanzas_token', 'token-luis');
    refresh.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.currentUser()?.id).toBe(2);
    expect(auth.getToken()).toBe('token-luis');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('dos instancias coordinadas como pestañas comparten una sola rotación', async () => {
    let cola: Promise<unknown> = Promise.resolve();
    Object.defineProperty(navigator, 'locks', { configurable: true, value: {
      request: (_nombre: string, callback: () => Promise<unknown>) => {
        const resultado = cola.then(callback);
        cola = resultado.catch(() => undefined);
        return resultado;
      }
    } });
    const otraPestana = TestBed.runInInjectionContext(() => new AuthService());
    const primera = firstValueFrom(auth.renovarSesion());
    const segunda = firstValueFrom(otraPestana.renovarSesion());
    await Promise.resolve();
    backend.expectOne('/api/auth/refresh').flush(sesion('token-compartido'));

    const resultados = await Promise.all([primera, segunda]);
    backend.expectNone('/api/auth/refresh');
    expect(resultados.map(resultado => resultado.token)).toEqual(['token-compartido', 'token-compartido']);
    expect(otraPestana.currentUser()?.id).toBe(usuario.id);
  });

  it('refleja el cierre de sesión de otra pestaña sin enviar solicitudes', () => {
    localStorage.removeItem('finanzas_token');
    localStorage.removeItem('finanzas_user');
    window.dispatchEvent(new StorageEvent('storage', { key: 'finanzas_user', storageArea: localStorage }));
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    backend.expectNone('/api/auth/refresh');
  });
});
