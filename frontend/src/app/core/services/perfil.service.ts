import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  ApiResponse,
  CambiarPasswordPayload,
  EliminarCuentaPayload,
  Perfil,
  PerfilActualizarPayload
} from '../models/auth.models';
import { getApiBaseUrl } from './api-base-url';
import { CategoriaPreferidaService } from './categoria-preferida.service';
import { PrivacidadService } from './privacidad.service';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly privacidad = inject(PrivacidadService);
  private readonly categoriaPreferida = inject(CategoriaPreferidaService);
  private readonly baseUrl = `${getApiBaseUrl()}/perfil`;

  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  cargar(usuarioId: number): void {
    const temaAlmacenado = this.document.defaultView?.localStorage.getItem(`kaptal_tema_${usuarioId}`);
    if (temaAlmacenado === 'CLARO' || temaAlmacenado === 'OSCURO') this.aplicarTema(temaAlmacenado);
    this.privacidad.aplicarDesdeCache(usuarioId);
    this.categoriaPreferida.aplicarDesdeCache(usuarioId);
    this.cargando.set(true);
    this.error.set(null);
    this.http.get<ApiResponse<Perfil>>(this.baseUrl).subscribe({
      next: response => {
        this.cargando.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudo cargar el perfil.');
          return;
        }
        this.aplicarPerfil(response.data);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(this.mensajeError(err));
      }
    });
  }

  actualizar(payload: PerfilActualizarPayload): Observable<ApiResponse<Perfil>> {
    return this.http.put<ApiResponse<Perfil>>(this.baseUrl, payload).pipe(
      tap(response => {
        if (response.success && response.data) this.aplicarPerfil(response.data);
      })
    );
  }

  cambiarPassword(payload: CambiarPasswordPayload): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/password`, payload);
  }

  /**
   * Da la vuelta a la preferencia de ocultar montos.
   *
   * El cambio se pinta antes de la respuesta porque es un control de pantalla:
   * si alguien abre el portatil en publico, el monto tiene que desaparecer al
   * primer clic y no cuando el servidor conteste. Si el guardado falla se
   * revierte, que es senal suficiente de que no se aplico.
   *
   * El endpoint de perfil exige nombre, correo, tema y moneda, asi que se
   * reenvian tal cual vienen del perfil actual y solo cambia el campo nuevo.
   */
  alternarOcultarMontos(): void {
    const perfil = this.perfil();
    if (!perfil) return;

    const nuevoValor = !perfil.ocultarMontos;
    this.privacidad.aplicar(perfil.id, nuevoValor);
    this.actualizar({
      nombre: perfil.nombre,
      email: perfil.email,
      tema: perfil.tema,
      monedaPredeterminada: perfil.monedaPredeterminada,
      telefono: perfil.telefono ?? null,
      notificacionesWhatsapp: perfil.notificacionesWhatsapp ?? false,
      ocultarMontos: nuevoValor
    }).subscribe({ error: () => this.privacidad.aplicar(perfil.id, !nuevoValor) });
  }

  /**
   * Borra la cuenta y todos sus datos. Es irreversible, por eso el backend exige la
   * contraseña actual. Al terminar hay que cerrar sesión: el token sigue siendo válido
   * hasta que caduque, pero el usuario ya no existe.
   */
  eliminarCuenta(password: string): Observable<ApiResponse<void>> {
    const payload: EliminarCuentaPayload = { password };
    return this.http.delete<ApiResponse<void>>(`${getApiBaseUrl()}/usuarios/me`, { body: payload });
  }

  limpiar(): void {
    this.perfil.set(null);
    this.cargando.set(false);
    this.error.set(null);
    this.aplicarTema('CLARO');
    this.privacidad.limpiar();
    this.categoriaPreferida.limpiar();
  }

  private aplicarPerfil(perfil: Perfil): void {
    this.perfil.set(perfil);
    this.aplicarTema(perfil.tema);
    this.document.defaultView?.localStorage.setItem(`kaptal_tema_${perfil.id}`, perfil.tema);

    // Solo se adopta la preferencia si el servidor la menciona. Un backend que
    // todavia no la conoce devuelve el perfil sin el campo, y asumir false
    // desharia el clic del usuario justo despues de aplicarlo, que es lo que
    // se veía: los montos se tapaban y un segundo después volvían a salir.
    if (perfil.ocultarMontos !== undefined) {
      this.privacidad.aplicar(perfil.id, perfil.ocultarMontos);
    }
  }

  private aplicarTema(tema: Perfil['tema']): void {
    const root = this.document.documentElement;
    root.classList.toggle('dark', tema === 'OSCURO');
    root.style.colorScheme = tema === 'OSCURO' ? 'dark' : 'light';
  }

  private mensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo cargar el perfil.';
    if (error.status === 0) return 'No se pudo conectar con el servidor. Comprueba que el backend esté activo e inténtalo de nuevo.';
    if (error.status === 404) return 'El servidor todavía no tiene disponible el servicio de perfil. Reinicia o actualiza el backend e inténtalo de nuevo.';
    if (error.error?.message) return error.error.message;
    if (error.status >= 500) return 'El servidor tuvo un problema al cargar el perfil. Inténtalo de nuevo más tarde.';
    return 'No se pudo cargar el perfil.';
  }
}
