import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/**
 * Estado de la preferencia "ocultar montos".
 *
 * Solo guarda estado: no hace peticiones. Quien persiste contra el backend es
 * `PerfilService`, que ya es el dueno del perfil. Aqui vive separado para que
 * el pipe `monto` no dependa de que el perfil haya terminado de cargar, y para
 * que el valor se pueda leer de la cache antes de la primera respuesta.
 */
@Injectable({ providedIn: 'root' })
export class PrivacidadService {
  private readonly document = inject(DOCUMENT);
  private usuarioId: number | null = null;

  private readonly _ocultarMontos = signal(false);
  readonly ocultarMontos = this._ocultarMontos.asReadonly();

  /**
   * Lee la cache local para pintar el estado correcto desde el primer frame.
   * Se aplica antes de la respuesta del backend, igual que el tema, para no
   * mostrar cifras que el usuario pidio ocultar.
   */
  aplicarDesdeCache(usuarioId: number): void {
    this.usuarioId = usuarioId;
    const guardado = this.document.defaultView?.localStorage.getItem(this.clave(usuarioId));
    if (guardado === 'true' || guardado === 'false') this._ocultarMontos.set(guardado === 'true');
  }

  aplicar(usuarioId: number, ocultarMontos: boolean): void {
    this.usuarioId = usuarioId;
    this._ocultarMontos.set(ocultarMontos);
    this.document.defaultView?.localStorage.setItem(this.clave(usuarioId), String(ocultarMontos));
  }

  alternarLocal(): boolean {
    const nuevoValor = !this._ocultarMontos();
    this._ocultarMontos.set(nuevoValor);
    if (this.usuarioId !== null) {
      this.document.defaultView?.localStorage.setItem(this.clave(this.usuarioId), String(nuevoValor));
    }
    return nuevoValor;
  }

  limpiar(): void {
    this.usuarioId = null;
    this._ocultarMontos.set(false);
  }

  private clave(usuarioId: number): string {
    return `kaptal_ocultar_montos_${usuarioId}`;
  }
}
