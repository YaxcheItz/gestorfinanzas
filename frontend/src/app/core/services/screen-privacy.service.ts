import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
  private pendingRefresh = false;

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    const refresh = () => {
      if (this.busy()) this.pendingRefresh = true;
      else void this.refresh();
    };
    if (this.native) {
      void this.refresh();
      window?.addEventListener('kaptal-screen-privacy-changed', refresh);
      inject(DestroyRef).onDestroy(() => window?.removeEventListener('kaptal-screen-privacy-changed', refresh));
    }
  }

  async refresh(): Promise<void> {
    if (!this.native || this.busy()) return;
    this.working.set(true); this.failure.set('');
    try { this.state.set(this.confirmed(await this.native.read())); }
    catch { this.state.set(null); this.failure.set('No se pudo comprobar la protección de pantalla. Reintenta.'); }
    finally { this.finished(); }
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
    } finally { this.finished(); }
  }

  private finished(): void {
    this.working.set(false);
    if (this.pendingRefresh) { this.pendingRefresh = false; void this.refresh(); }
  }

  private confirmed(value: unknown): boolean {
    if (!value || typeof value !== 'object' || !('enabled' in value) || typeof value.enabled !== 'boolean')
      throw new Error('Invalid native state');
    return value.enabled;
  }
}
