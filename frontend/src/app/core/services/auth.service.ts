import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, finalize, shareReplay, map } from 'rxjs';
import {
  ApiResponse,
  AuthResponse,
  LoginPayload,
  RegistroPayload,
  RestablecerPasswordPayload,
  SolicitudRecuperacionPayload,
  Usuario
} from '../models/auth.models';
import { Router } from '@angular/router';
import { getApiBaseUrl } from './api-base-url';

/** Necesario para que el navegador acepte y mande la cookie de refresh. */
const CON_CREDENCIALES = { withCredentials: true } as const;

/**
 * Anticipa la renovacion. El access token vive 15 minutos, asi que sin este margen
 * la app podria empezar a fallar justo al expirar, y un 401 aislado es
 * indistinguible de una sesion realmente terminada.
 */
const MARGEN_RENOVACION_MS = 30_000;

/** Motivo por el que se cae la sesion. El aviso al usuario cambia con el. */
export type MotivoCierreSesion = 'expirada' | 'salida';

/**
 * La cookie va en SameSite=None porque el frontend (vercel.app) y la API (onrender.com) son
 * sitios distintos, y así es lo único que cruza. El precio es que otra página podría lanzar un
 * POST contra /refresh o /logout y el navegador añadiría la cookie sin preguntar. Esta cabecera
 * lo evita: al no ser simple, la petición genera un preflight que el servidor solo concede a
 * nuestros orígenes, de modo que la del atacante nunca llega a enviarse. El valor es irrelevante.
 */
const CABECERA_CSRF = { headers: { 'X-Gestion-Sesion': '1' } } as const;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${getApiBaseUrl()}/auth`;

  private readonly tokenKey = 'finanzas_token';
  private readonly userKey = 'finanzas_user';

  /** Peticion de refresh compartida, para no rotar dos veces a la vez. */
  private refreshEnVuelo: Observable<AuthResponse> | null = null;

  // Signals para estado reactivo moderno
  private readonly _currentUser = signal<Usuario | null>(this.obtenerUsuarioAlmacenado());
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => !!this._currentUser());

  registro(payload: RegistroPayload): Observable<ApiResponse<AuthResponse>> {
    // withCredentials no es opcional: sin el, el navegador ignora el Set-Cookie de una peticion
    // de otro origen y la cookie de refresh nunca se guardaria.
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/registro`, payload, CON_CREDENCIALES).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.guardarSesion(res.data);
        }
      })
    );
  }

  login(payload: LoginPayload): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, payload, CON_CREDENCIALES).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.guardarSesion(res.data);
        }
      })
    );
  }

  solicitarRecuperacion(payload: SolicitudRecuperacionPayload): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/recuperacion`, payload);
  }

  restablecerPassword(payload: RestablecerPasswordPayload): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/recuperacion/confirmar`, payload);
  }

  logout(): void {
    this.cerrarSesionEnServidor().subscribe({
      next: () => this.cerrarSesionLocal('salida'),
      error: () => this.cerrarSesionLocal('salida')
    });
  }

  /**
   * Pide un access token nuevo usando la cookie de refresh.
   *
   * El navegador manda la cookie solo, asi que la peticion necesita withCredentials. Varias
   * peticiones pueden pedir renewal al mismo tiempo, y con la rotacion del servidor eso romperia
   * la sesion: las peticiones en vuelo comparten una sola, y las siguientes se enganchan a ella.
   */
  renovarSesion(): Observable<AuthResponse> {
    if (!this.refreshEnVuelo) {
      this.refreshEnVuelo =       this.http
        .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, {}, { ...CON_CREDENCIALES, ...CABECERA_CSRF })
        .pipe(
          map(res => {
            if (!res.success || !res.data) {
              throw new Error('La renovación no devolvió sesión');
            }
            this.guardarSesion(res.data);
            return res.data;
          }),
          catchError(error => {
            this.limpiarSesion();
            return throwError(() => error);
          }),
          finalize(() => {
            this.refreshEnVuelo = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.refreshEnVuelo;
  }

  /** Limpia la sesion local sin tocar el servidor: util cuando la cookie ya no sirve. */
  cerrarSesionLocal(motivo: MotivoCierreSesion = 'expirada'): void {
    this.limpiarSesion();
    this.router.navigate(['/login'], {
      queryParams: motivo === 'expirada' ? { sessionExpired: 'true' } : {}
    });
  }

  private cerrarSesionEnServidor(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { ...CON_CREDENCIALES, ...CABECERA_CSRF });
  }

  private limpiarSesion(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._currentUser.set(null);
  }

  actualizarUsuario(usuario: Usuario): void {
    localStorage.setItem(this.userKey, JSON.stringify(usuario));
    this._currentUser.set(usuario);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Si el access token ya caduco o esta por caducar.
   *
   * El access token vive 15 minutos y la sesion dura 30 dias, asi que tras cualquier
   * pausa larga el token guardado es inservible aunque la cookie de refresh siga
   * en pie. Sin mirar la fecha de expiracion, la app no puede distinguir "tengo que
   * renovar" de "mi sesion se termino", y siempre acaba echando al usuario al login.
   */
  tokenCaducado(): boolean {
    const expiracion = this.leerExpiracion(this.getToken());
    if (expiracion === null) return false;
    return Date.now() >= expiracion - MARGEN_RENOVACION_MS;
  }

  /**
   * Instante de expiracion del JWT en milisegundos, o null si no se puede leer.
   * Un token ilegible no se da por caducado: el servidor sera quien lo diga.
   */
  private leerExpiracion(token: string | null): number | null {
    if (!token) return null;
    const segmentos = token.split('.');
    if (segmentos.length !== 3) return null;
    try {
      const base64 = segmentos[1].replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
      const payload = JSON.parse(atob(relleno)) as { exp?: unknown };
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private guardarSesion(auth: AuthResponse): void {
    localStorage.setItem(this.tokenKey, auth.token);
    const usuario: Usuario = { id: auth.id, nombre: auth.nombre, email: auth.email };
    localStorage.setItem(this.userKey, JSON.stringify(usuario));
    this._currentUser.set(usuario);
  }

  private obtenerUsuarioAlmacenado(): Usuario | null {
    const data = localStorage.getItem(this.userKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as Usuario;
    } catch {
      return null;
    }
  }
}
