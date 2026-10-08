import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Categoria, Cuenta, TransaccionPayload } from '../models/finanzas.models';
import { AuthService } from './auth.service';
import { FinanzasService } from './finanzas.service';

export interface MovimientoPendiente {
  id: string;
  usuarioId: number;
  payload: TransaccionPayload;
  creadoEn: string;
  error?: string;
}

export interface CatalogoOffline {
  usuarioId: number;
  cuentas: Cuenta[];
  categorias: Categoria[];
  actualizadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class MovimientosOfflineService {
  private readonly document = inject(DOCUMENT);
  private readonly auth = inject(AuthService);
  private readonly finanzas = inject(FinanzasService);
  private dbPromise?: Promise<IDBDatabase>;
  private sincronizacionEnCurso = false;

  readonly pendientes = signal<MovimientoPendiente[]>([]);
  readonly sincronizando = signal(false);
  readonly totalSincronizados = signal(0);
  readonly errorAlmacenamiento = signal<string | null>(null);
  readonly permisoNotificaciones = signal<NotificationPermission | 'unsupported'>('unsupported');

  constructor() {
    const vista = this.document.defaultView;
    if (vista && 'Notification' in vista) this.permisoNotificaciones.set(vista.Notification.permission);
    vista?.addEventListener('online', () => void this.sincronizar());
    effect(() => {
      const usuarioId = this.auth.currentUser()?.id;
      if (usuarioId == null) {
        this.pendientes.set([]);
        return;
      }
      void this.cargarPendientes(usuarioId).then(() => {
        if (this.document.defaultView?.navigator.onLine) void this.sincronizar();
      });
    });
  }

  async guardarPendiente(usuarioId: number, id: string, payload: TransaccionPayload): Promise<void> {
    const entrada: MovimientoPendiente = { id, usuarioId, payload, creadoEn: new Date().toISOString() };
    const db = await this.abrirBase();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction('movimientos', 'readwrite').objectStore('movimientos').put(entrada);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('No se pudo guardar el movimiento local.'));
    });
    await this.cargarPendientes(usuarioId);
  }

  async guardarCatalogo(usuarioId: number, cuentas: Cuenta[], categorias: Categoria[]): Promise<void> {
    const db = await this.abrirBase();
    const catalogo: CatalogoOffline = {
      usuarioId,
      cuentas: cuentas.map(cuenta => ({
        id: cuenta.id,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        saldoActual: 0,
        moneda: cuenta.moneda,
        activo: cuenta.activo,
        fechaCreacion: cuenta.fechaCreacion,
        saldoLocalDesactualizado: true
      })),
      categorias,
      actualizadoEn: new Date().toISOString()
    };
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction('catalogos', 'readwrite').objectStore('catalogos').put(catalogo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('No se pudo guardar las cuentas para uso sin conexión.'));
    });
  }

  async leerCatalogo(usuarioId: number): Promise<CatalogoOffline | null> {
    const db = await this.abrirBase();
    return new Promise((resolve, reject) => {
      const request = db.transaction('catalogos', 'readonly').objectStore('catalogos').get(usuarioId);
      request.onsuccess = () => resolve((request.result as CatalogoOffline | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('No se pudo leer las cuentas guardadas.'));
    });
  }

  async descartar(id: string): Promise<void> {
    await this.eliminar(id);
    const usuarioId = this.auth.currentUser()?.id;
    if (usuarioId != null) await this.cargarPendientes(usuarioId);
  }

  async solicitarNotificaciones(): Promise<void> {
    const NotificationApi = this.document.defaultView?.Notification;
    if (!NotificationApi) {
      this.permisoNotificaciones.set('unsupported');
      return;
    }
    try {
      const permiso = await NotificationApi.requestPermission();
      this.permisoNotificaciones.set(permiso);
    } catch {
      this.permisoNotificaciones.set(NotificationApi.permission);
    }
  }

  async sincronizar(): Promise<number> {
    const usuarioId = this.auth.currentUser()?.id;
    if (usuarioId == null || !this.document.defaultView?.navigator.onLine || this.sincronizacionEnCurso) return 0;

    this.sincronizacionEnCurso = true;
    this.sincronizando.set(true);
    let completados = 0;
    try {
      const pendientes = await this.listarDeUsuario(usuarioId);
      for (const entrada of pendientes) {
        if (this.auth.currentUser()?.id !== usuarioId) break;
        try {
          const respuesta = await firstValueFrom(this.finanzas.crearTransaccion(entrada.payload, entrada.id));
          if (!respuesta.success || !respuesta.data) throw new Error(respuesta.message || 'La API no confirmó el movimiento.');
          await this.eliminar(entrada.id);
          completados++;
        } catch (error: unknown) {
          const status = (error as { status?: number })?.status;
          entrada.error = status === 0
            ? 'No se pudo conectar; Kaptal volverá a intentar cuando haya conexión.'
            : 'No se pudo registrar. Abre el movimiento y revisa la cuenta, categoría y fecha.';
          await this.guardarEntrada(entrada);
          if (status === 0 || status === 401) break;
        }
      }
      await this.cargarPendientes(usuarioId);
      this.totalSincronizados.update(total => total + completados);
      if (completados > 0 && this.permisoNotificaciones() === 'granted') {
        const NotificationApi = this.document.defaultView?.Notification;
        if (NotificationApi) new NotificationApi('Kaptal sincronizó tus movimientos', {
          body: `${completados} movimiento(s) ya están registrados en tu cuenta.`,
          icon: '/icons/kaptal-192.png',
          tag: 'kaptal-offline-sync'
        });
      }
      return completados;
    } catch {
      this.errorAlmacenamiento.set('No se pudo abrir el almacenamiento local de movimientos.');
      return 0;
    } finally {
      this.sincronizando.set(false);
      this.sincronizacionEnCurso = false;
    }
  }

  private async cargarPendientes(usuarioId: number): Promise<void> {
    try {
      this.pendientes.set(await this.listarDeUsuario(usuarioId));
      this.errorAlmacenamiento.set(null);
    } catch {
      this.pendientes.set([]);
      this.errorAlmacenamiento.set('No se pudo leer el almacenamiento local de movimientos.');
    }
  }

  private async listarDeUsuario(usuarioId: number): Promise<MovimientoPendiente[]> {
    const db = await this.abrirBase();
    return new Promise((resolve, reject) => {
      const request = db.transaction('movimientos', 'readonly')
        .objectStore('movimientos').index('usuarioId').getAll(usuarioId);
      request.onsuccess = () => resolve((request.result as MovimientoPendiente[])
        .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn)));
      request.onerror = () => reject(request.error ?? new Error('No se pudo leer el almacenamiento local.'));
    });
  }

  private async guardarEntrada(entrada: MovimientoPendiente): Promise<void> {
    const db = await this.abrirBase();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction('movimientos', 'readwrite').objectStore('movimientos').put(entrada);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('No se pudo actualizar el movimiento local.'));
    });
  }

  private async eliminar(id: string): Promise<void> {
    const db = await this.abrirBase();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction('movimientos', 'readwrite').objectStore('movimientos').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('No se pudo quitar el movimiento sincronizado.'));
    });
  }

  private abrirBase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    const indexedDB = this.document.defaultView?.indexedDB;
    if (!indexedDB) return Promise.reject(new Error('Este navegador no ofrece almacenamiento local.'));
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('kaptal-movimientos-offline', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('movimientos')) {
          const store = db.createObjectStore('movimientos', { keyPath: 'id' });
          store.createIndex('usuarioId', 'usuarioId', { unique: false });
        }
        if (!db.objectStoreNames.contains('catalogos')) db.createObjectStore('catalogos', { keyPath: 'usuarioId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('No se pudo iniciar el almacenamiento local.'));
    });
    return this.dbPromise;
  }
}
