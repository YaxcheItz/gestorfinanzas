import { Injectable, computed, signal } from '@angular/core';
import { ListaFinanciera } from '../models/listas.models';

/** Estado de presentación aislado por usuario; los permisos siempre se validan en servidor. */
@Injectable({ providedIn: 'root' })
export class ListaContextoService {
  readonly usuarioId = signal<number | null>(null);
  readonly listas = signal<ListaFinanciera[]>([]);
  readonly seleccionVersion = signal(0);
  readonly activaId = signal<number | null>(null);
  readonly activa = computed(() => this.listas().find(l => l.id === this.activaId()) ?? null);
  readonly puedeEscribir = computed(() => !this.activa() || (!this.activa()!.archivada && this.activa()!.rol !== 'LECTOR'));
  readonly cargando = signal(false);
  readonly error = signal('');
  private solicitada: number | null = null;
  solicitarDesdeRuta(id: number): void {
    if (!Number.isSafeInteger(id) || id <= 0) return;
    if (this.listas().some(l => l.id === id)) this.seleccionar(id);
    else this.solicitada = id;
  }

  iniciar(usuarioId: number): void {
    this.limpiar(); this.usuarioId.set(usuarioId);
    try {
      const cache = JSON.parse(localStorage.getItem(`kaptal_listas_${usuarioId}`) ?? 'null');
      if (Array.isArray(cache?.listas)) {
        const validas = cache.listas.filter((l: ListaFinanciera) => Number.isSafeInteger(l.id) && l.id > 0 && typeof l.nombre === 'string' && ['PROPIETARIO','EDITOR','LECTOR'].includes(l.rol) && Array.isArray(l.miembros));
        this.listas.set(validas);
        this.activaId.set(validas.some((l: ListaFinanciera) => l.id === cache.activaId) ? cache.activaId : validas.find((l: ListaFinanciera) => l.personal)?.id ?? null);
      }
    } catch { /* Sin caché válida, esperar las listas autorizadas del servidor. */ }
  }
  aplicar(listas: ListaFinanciera[]): void {
    this.listas.set(listas);
    if (this.solicitada != null && listas.some(l => l.id === this.solicitada)) this.activaId.set(this.solicitada);
    this.solicitada = null;
    if (!listas.some(l => l.id === this.activaId())) this.activaId.set(listas.find(l => l.personal)?.id ?? listas[0]?.id ?? null);
    this.persistir();
  }
  seleccionar(id: number): void {
    if (!this.listas().some(l => l.id === id)) return;
    this.activaId.set(id); this.seleccionVersion.update(v => v + 1); this.persistir();
  }
  private persistir(): void {
    const id = this.usuarioId(); if (id === null) return;
    try { localStorage.setItem(`kaptal_listas_${id}`, JSON.stringify({ activaId: this.activaId(), listas: this.listas() })); } catch { /* El registro sigue disponible sin almacenamiento de preferencias. */ }
  }
  limpiar(): void { this.solicitada = null; this.listas.set([]); this.activaId.set(null); this.usuarioId.set(null); this.cargando.set(false); this.error.set(''); }
}
