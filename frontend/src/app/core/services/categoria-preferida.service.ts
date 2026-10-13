import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TipoTransaccion } from '../models/finanzas.models';

/**
 * Recuerda la última categoría elegida por cada tipo de movimiento.
 *
 * Registrar un gasto casi siempre cae en la misma categoría (el café de todos
 * los días, el súper de cada semana), así que al abrir el formulario solo hace
 * falta confirmar la que ya se usó y no navegar otra vez hasta ella.
 *
 * Vive solo en localStorage, sin columna en el backend: es una comodidad de
 * pantalla, no un dato del usuario que deba viajar entre dispositivos ni
 * respaldarse. Si mañana hiciera falta sincronizarlo, el sitio natural sería
 * `PerfilService`, igual que `PrivacidadService` con "ocultar montos".
 *
 * Se guarda por tipo y por usuario porque "Comida" solo tiene sentido como
 * gasto: arrastrarla a un ingreso sería una categoría que no existe de ese lado.
 */
@Injectable({ providedIn: 'root' })
export class CategoriaPreferidaService {
  private readonly document = inject(DOCUMENT);

  /** Clave de la cache por usuario: mismo navegador, dos cuentas, dos historiales. */
  private usuarioId: number | null = null;

  private readonly _preferidas = signal<Partial<Record<TipoTransaccion, number>>>({});
  private readonly _recientes = signal<Partial<Record<TipoTransaccion, number[]>>>({});
  readonly preferidas = this._preferidas.asReadonly();

  /**
   * Lee la cache al iniciar sesion. No hace peticiones: el backend no conoce
   * esta preferencia, asi que la cache ES la fuente de verdad.
   */
  aplicarDesdeCache(usuarioId: number): void {
    this.usuarioId = usuarioId;
    const storage = this.document.defaultView?.localStorage;
    if (!storage) return;

    const restauradas: Partial<Record<TipoTransaccion, number>> = {};
    const recientes: Partial<Record<TipoTransaccion, number[]>> = {};
    for (const tipo of ['GASTO', 'INGRESO'] as TipoTransaccion[]) {
      const guardado = storage.getItem(this.clave(tipo));
      // Solo se acepta un entero positivo: una cache vieja o manipulada no debe
      // dejar el formulario apuntando a una categoría que ya no existe.
      const id = Number(guardado);
      if (guardado !== null && Number.isInteger(id) && id > 0) restauradas[tipo] = id;
      try {
        const ids: unknown = JSON.parse(storage.getItem(this.clave(tipo) + '_recientes') || '[]');
        if (Array.isArray(ids)) recientes[tipo] = [...new Set(ids.filter(n => Number.isInteger(n) && n > 0))].slice(0, 4);
      } catch { /* Historial opcional: una cache inválida no bloquea el registro. */ }
    }
    this._preferidas.set(restauradas);
    this._recientes.set(recientes);
  }

  /** Guarda la categoría elegida para que abra en el siguiente uso. */
  recordar(tipo: TipoTransaccion, categoriaId: number | null): void {
    const usuarioId = this.usuarioId;
    if (usuarioId === null || categoriaId === null) return;

    this._preferidas.update(actual => ({ ...actual, [tipo]: categoriaId }));
    const recientes = [categoriaId, ...this.recientes(tipo).filter(id => id !== categoriaId)].slice(0, 4);
    this._recientes.update(actual => ({ ...actual, [tipo]: recientes }));
    try {
      this.document.defaultView?.localStorage.setItem(this.clave(tipo), String(categoriaId));
      this.document.defaultView?.localStorage.setItem(this.clave(tipo) + '_recientes', JSON.stringify(recientes));
    } catch { /* Guardar preferencias no debe interrumpir un movimiento ya confirmado. */ }
  }

  recientes(tipo: TipoTransaccion): number[] { return this._recientes()[tipo] ?? []; }

  preferida(tipo: TipoTransaccion): number | null {
    return this._preferidas()[tipo] ?? null;
  }

  /**
   * Olvida una categoría que ya no existe (se eliminó). Si la guardada es esa, el
   * siguiente formulario debe caer en otra: abrir apuntando a un id borrado haría
   * que el selector mostrara "Sin categoría" sin avisar de nada.
   */
  olvidar(tipo: TipoTransaccion, categoriaId: number): void {
    this._recientes.update(actual => ({ ...actual, [tipo]: this.recientes(tipo).filter(id => id !== categoriaId) }));
    if (this.preferida(tipo) !== categoriaId) return;
    this._preferidas.update(actual => {
      const siguiente = { ...actual };
      delete siguiente[tipo];
      return siguiente;
    });
    this.document.defaultView?.localStorage.removeItem(this.clave(tipo));
  }

  limpiar(): void {
    this.usuarioId = null;
    this._preferidas.set({});
    this._recientes.set({});
  }

  private clave(tipo: TipoTransaccion): string {
    return `kaptal_categoria_${tipo.toLowerCase()}_${this.usuarioId}`;
  }
}
