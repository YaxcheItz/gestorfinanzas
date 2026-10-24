import { Injectable, inject, signal } from '@angular/core';
import { NATIVE_SCREEN_PRIVACY } from '../native-screen-privacy';

@Injectable({
  providedIn: 'root',
})
export class ScreenPrivacyService {
  private readonly native = inject(NATIVE_SCREEN_PRIVACY);
  readonly available = this.native !== null;
  private readonly state = signal<boolean | null>(null);
  readonly enabled = this.state.asReadonly();
  private readonly working = signal(false);
  readonly busy = this.working.asReadonly();
  private readonly failure = signal('');
  readonly error = this.failure.asReadonly();

  constructor() { if (this.native) void this.refresh(); }

  async refresh(): Promise<void> {
    if (!this.native || this.busy()) return;
    this.working.set(true); this.failure.set('');
    try { this.state.set(this.confirmed(await this.native.read())); }
    catch { this.state.set(null); this.failure.set('No se pudo comprobar la protección de pantalla. Reintenta.'); }
    finally { this.working.set(false); }
  }

  async set(enabled: boolean): Promise<void> {
    if (!this.native || this.busy() || this.enabled() === null) return;
    this.working.set(true); this.failure.set('');
    try {
      const confirmed = this.confirmed(await this.native.set({ enabled }));
      if (confirmed !== enabled) throw new Error('Unconfirmed state');
      this.state.set(confirmed);
    } catch {
      this.state.set(null);
      this.failure.set('No se pudo confirmar el cambio. Comprueba el estado antes de continuar.');
    } finally { this.working.set(false); }
  }

  private confirmed(value: unknown): boolean {
    if (!value || typeof value !== 'object' || !('enabled' in value) || typeof value.enabled !== 'boolean')
      throw new Error('Invalid native state');
    return value.enabled;
  }
}
