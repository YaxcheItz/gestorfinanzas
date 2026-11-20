import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { tap } from 'rxjs';
import { getApiBaseUrl } from './services/api-base-url';

const VENTANA_MS = 300_000;
const pluginName = 'StartupTiming';
const selectores = {
  entrada: '.kaptal-launch',
  estructura: '.app-shell',
  espera_sesion: '.session-skeleton',
  inicio: 'app-dashboard',
  inicio_cargando: 'app-dashboard .home-amount-loading',
  inicio_datos: 'app-dashboard .dashboard-screen__amount',
  inicio_error: 'app-dashboard .dashboard-screen__notice--error',
};
type Fase = keyof typeof selectores | 'web_js' | 'sesion_nativa' | 'apertura_error';
const rutas = {
  'POST /auth/refresh': 'renovacion',
  'GET /perfil': 'perfil',
  'GET /listas': 'listas',
  'GET /dashboard/resumen': 'resumen',
} as const;
type Peticion = typeof rutas[keyof typeof rutas];

const plugin = registerPlugin<{
  stage(value: { name: Fase }): Promise<void>;
  request(value: { name: Peticion; status: number; durationMs: number }): Promise<void>;
}>(pluginName);

function habilitado(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable(pluginName);
}

export function marcarArranque(name: Fase): void {
  if (habilitado()) void plugin.stage({ name }).catch(() => undefined);
}

export function iniciarDiagnosticoArranque(): void {
  if (!habilitado()) return;
  marcarArranque('web_js');
  let detener = () => {};

  const observar = () => {
    detener();
    const pendientes = new Map(Object.entries(selectores) as [keyof typeof selectores, string][]);
    let frame = 0;
    const detectar = () => {
      if (frame || document.hidden) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        for (const [fase, selector] of pendientes) {
          if (!document.querySelector(selector)?.getClientRects().length) continue;
          pendientes.delete(fase);
          marcarArranque(fase);
        }
      });
    };
    const observer = new MutationObserver(detectar);
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    const timer = window.setTimeout(() => detener(), VENTANA_MS);
    detener = () => {
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    detectar();
  };
  observar();
  void NativeApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) observar();
    else detener();
  }).catch(() => undefined);
}

export const diagnosticoArranqueInterceptor: HttpInterceptorFn = (request, next) => {
  if (!habilitado()) return next(request);
  const base = new URL(getApiBaseUrl(), window.location.origin);
  const url = new URL(request.url, window.location.origin);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname + '/')) return next(request);
  const ruta = request.method + ' ' + url.pathname.slice(base.pathname.length);
  const name = Object.hasOwn(rutas, ruta) ? rutas[ruta as keyof typeof rutas] : undefined;
  if (!name) return next(request);

  const inicio = performance.now();
  const registrar = (status: number) => {
    const durationMs = Math.round(performance.now() - inicio);
    void plugin.request({ name, status, durationMs }).catch(() => undefined);
  };
  return next(request).pipe(tap({
    next: event => {
      if (event.type === HttpEventType.Response) registrar(event.status);
    },
    error: error => {
      if (error instanceof HttpErrorResponse) registrar(error.status);
    },
  }));
};
