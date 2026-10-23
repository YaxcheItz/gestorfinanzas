import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { appConfig } from '../../app.config';
import { AuthService } from './auth.service';
import { firstValueFrom, of } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';
import { nativeSessionBridge } from '../native-session';
import { ToastService } from './toast.service';

describe('sesiones con los interceptores de la aplicación', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let locksOriginal: PropertyDescriptor | undefined;
  const navigate = vi.fn(() => Promise.resolve(true));
  const push = { isEnabled: false, subscription: of<PushSubscription | null>(null), unsubscribe: vi.fn(async () => undefined) };
  const usuario = { id: 1, nombre: 'Ana', email: 'ana@example.com' };
  const sesion = (token: string) => ({ success: true, message: 'ok', data: { ...usuario, token, tokenType: 'Bearer' } });

  beforeEach(() => {
    locksOriginal = Object.getOwnPropertyDescriptor(navigator, 'locks');
    localStorage.clear();
    localStorage.setItem('finanzas_token', 'token-anterior');
    localStorage.setItem('finanzas_user', JSON.stringify(usuario));
    navigate.mockClear();
    push.isEnabled = false;
    push.subscription = of(null);
    push.unsubscribe.mockClear();
    TestBed.configureTestingModule({ providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      { provide: SwPush, useValue: push },
      { provide: Router, useValue: { navigate } }
    ] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  it('desvincula el dispositivo push antes de cerrar sesión sin borrar otros dispositivos', async () => {
    const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: 'public', auth: 'auth' } };
    push.isEnabled = true;
    push.subscription = of({ toJSON: () => subscription } as unknown as PushSubscription);
    auth.logout();
    const baja = await vi.waitFor(() => backend.expectOne('/api/notificaciones/push/suscripcion'));
    expect(baja.request.method).toBe('DELETE');
    expect(baja.request.body).toEqual(subscription);
    expect(baja.request.headers.get('Authorization')).toBe('Bearer token-anterior');
    expect(auth.isAuthenticated()).toBe(true);
    backend.expectNone('/api/auth/logout');
    baja.flush({ success: true });
    const salida = await vi.waitFor(() => backend.expectOne('/api/auth/logout'));
    expect(push.unsubscribe).toHaveBeenCalledOnce();
    salida.flush({ success: true });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('intenta revocar push local y cierra sesión aunque falle la baja remota', async () => {
    push.isEnabled = true;
    push.subscription = of({ toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: {} }) } as unknown as PushSubscription);
    auth.logout();
    const baja = await vi.waitFor(() => backend.expectOne('/api/notificaciones/push/suscripcion'));
    baja.flush({}, { status: 503, statusText: 'Unavailable' });
    const salida = await vi.waitFor(() => backend.expectOne('/api/auth/logout'));
    expect(push.unsubscribe).toHaveBeenCalledOnce();
    salida.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  afterEach(() => {
    try { backend.verify(); }
    finally {
      if (locksOriginal) Object.defineProperty(navigator, 'locks', locksOriginal);
      else Reflect.deleteProperty(navigator, 'locks');
      vi.restoreAllMocks();localStorage.clear(); TestBed.resetTestingModule();
    }
  });

  it('persiste el cierre Android antes de mostrar login o enviar el logout',async()=>{
    vi.spyOn(Capacitor,'getPlatform').mockReturnValue('android');
    let finish!:()=>void;
    const update=vi.spyOn(nativeSessionBridge,'update').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    auth.logout();expect(update).toHaveBeenCalledWith({closed:true,userId:0});
    backend.expectNone('/api/auth/logout');expect(auth.isAuthenticated()).toBe(true);
    finish();const request=await vi.waitFor(()=>backend.expectOne('/api/auth/logout'));request.flush({success:true});
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('no afirma cerrar Android si falla conservar la marca nativa',async()=>{
    vi.spyOn(Capacitor,'getPlatform').mockReturnValue('android');
    vi.spyOn(nativeSessionBridge,'update').mockRejectedValue(new Error('Disco no disponible'));
    const error=vi.spyOn(TestBed.inject(ToastService),'error').mockImplementation(()=>undefined);
    auth.logout();await vi.waitFor(()=>expect(error).toHaveBeenCalledOnce());
    backend.expectNone('/api/auth/logout');expect(auth.isAuthenticated()).toBe(true);
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

  it('al reanudar Android comparte un refresh y conserva la sesión ante una desconexión temporal', () => {
    const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const vencido = `e30.${btoa(JSON.stringify({ exp: Date.now()/1000-60 }))}.signature`;
    localStorage.setItem('finanzas_token', vencido);
    try {
      window.dispatchEvent(new Event('pageshow'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
      const refreshes = backend.match('/api/auth/refresh');
      expect(refreshes).toHaveLength(1);
      refreshes[0].flush({}, { status: 503, statusText: 'Unavailable' });
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getToken()).toBe(vencido);
      expect(navigate).not.toHaveBeenCalled();
    } finally { visible.mockRestore(); }
  });

  it('no intenta renovar al reanudar sin conexión o con el token aún vigente', () => {
    const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      window.dispatchEvent(new Event('pageshow'));
      backend.expectNone('/api/auth/refresh');
      online.mockReturnValue(true);
      localStorage.setItem('finanzas_token', `e30.${btoa(JSON.stringify({ exp: Date.now()/1000+3600 }))}.signature`);
      window.dispatchEvent(new Event('pageshow'));
      backend.expectNone('/api/auth/refresh');
    } finally { visible.mockRestore(); online.mockRestore(); }
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
  it('conserva la captura solicitada por el guard si la cookie de renovacion no sirve',()=>{
    auth.renovarSesion('nuevo-ingreso').subscribe({error:()=>undefined});
    backend.expectOne('/api/auth/refresh').flush({}, {status:401,statusText:'Unauthorized'});
    expect(auth.isAuthenticated()).toBe(false);expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{sessionExpired:'true',captura:'nuevo-ingreso'}});
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
