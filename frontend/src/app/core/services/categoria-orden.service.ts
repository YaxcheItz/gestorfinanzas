import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CategoriaOrdenService {
  private readonly document = inject(DOCUMENT);
  private readonly auth = inject(AuthService);

  ordenar<T extends { id: number }>(categorias: T[]): T[] {
    const orden = this.leerOrden();
    if (orden.length === 0) return categorias;
    const posiciones = new Map(orden.map((id, index) => [id, index]));
    return [...categorias].sort((a, b) =>
      (posiciones.get(a.id) ?? Number.MAX_SAFE_INTEGER)
      - (posiciones.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  guardarOrden(ids: number[]): void {
    const actual = this.leerOrden();
    const combinada = [...ids, ...actual.filter(id => !ids.includes(id))];
    this.document.defaultView?.localStorage.setItem(this.clave(), JSON.stringify(combinada));
  }

  private leerOrden(): number[] {
    const almacenado = this.document.defaultView?.localStorage.getItem(this.clave());
    if (!almacenado) return [];
    try {
      const parsed: unknown = JSON.parse(almacenado);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is number => Number.isSafeInteger(id) && id > 0)
        : [];
    } catch {
      return [];
    }
  }

  private clave(): string {
    return `kaptal_orden_categorias_${this.auth.currentUser()?.id ?? 'anonimo'}`;
  }
}
