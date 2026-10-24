import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class GuiaInicialService {
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly elecciones = signal<ReadonlyMap<number, boolean>>(new Map());

  readonly visible = computed(() => {
    const id = this.auth.currentUser()?.id;
    if (!id) return false;
    const eleccion = this.elecciones().get(id);
    if (eleccion !== undefined) return eleccion;
    try { return this.document.defaultView?.localStorage.getItem(this.clave(id)) !== 'oculta'; }
    catch { return true; }
  });

  omitir(): void { this.cambiar(false); }
  mostrar(): void { this.cambiar(true); }

  private cambiar(visible: boolean): void {
    const id = this.auth.currentUser()?.id;
    if (!id) return;
    this.elecciones.update(actual => new Map(actual).set(id, visible));
    try {
      const storage = this.document.defaultView?.localStorage;
      if (visible) storage?.removeItem(this.clave(id));
      else storage?.setItem(this.clave(id), 'oculta');
    } catch { /* La ayuda sigue siendo omitible durante esta sesión sin almacenamiento. */ }
  }

  private clave(id: number): string { return `kaptal_guia_inicial_v1_${id}`; }
}
