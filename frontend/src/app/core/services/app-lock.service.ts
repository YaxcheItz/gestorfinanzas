import { Injectable, inject, signal } from '@angular/core';
import { AppLockState, NATIVE_APP_LOCK } from '../native-app-lock';

@Injectable({
  providedIn: 'root',
})
export class AppLockService {
  private readonly native = inject(NATIVE_APP_LOCK);
  readonly nativeAndroid = this.native !== null;
  private readonly current = signal<AppLockState | null>(null);
  readonly state = this.current.asReadonly();
  private readonly working = signal(false);
  readonly busy = this.working.asReadonly();
  private readonly failure = signal('');
  readonly error = this.failure.asReadonly();

  constructor() { if (this.native) void this.refresh(); }

  async refresh(): Promise<void> {
    if (!this.native || this.busy()) return;
    this.working.set(true); this.failure.set('');
    try { this.current.set(this.confirmed(await this.native.read())); }
    catch { this.current.set(null); this.failure.set('No se pudo comprobar el bloqueo. Reintenta.'); }
    finally { this.working.set(false); }
  }
  async set(enabled: boolean): Promise<void> {
    if (!this.native || this.busy() || !this.state()?.supported || !this.state()?.available) return;
    this.working.set(true); this.failure.set('');
    try {
      const state = this.confirmed(await this.native.set({ enabled }));
      if (state.enabled !== enabled) throw new Error('Unconfirmed state');
      this.current.set(state);
    } catch {
      this.current.set(null);
      this.failure.set('No se confirmó el cambio. Si cancelaste, puedes reintentar. Comprueba el estado.');
    } finally { this.working.set(false); }
  }
  private confirmed(value: unknown): AppLockState {
    if (!value || typeof value !== 'object' || !('enabled' in value) || typeof value.enabled !== 'boolean'
      || !('supported' in value) || typeof value.supported !== 'boolean'
      || !('available' in value) || typeof value.available !== 'boolean') throw new Error('Invalid native state');
    return { enabled: value.enabled, supported: value.supported, available: value.available };
  }
}
