import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { filter, firstValueFrom, take } from 'rxjs';
import { accionCaptura } from '../utils/accion-captura';
import { ToastService } from './toast.service';

interface NativeCapture {
  consume(): Promise<{ action?: unknown }>;
  addListener(event: 'changed', listener: () => void): Promise<PluginListenerHandle>;
}
export const NATIVE_CAPTURE = new InjectionToken<NativeCapture | null>('Native capture', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android'
    ? registerPlugin<NativeCapture>('CaptureAction') : null,
});

@Injectable({ providedIn: 'root' })
export class NativeCaptureService {
  private readonly native = inject(NATIVE_CAPTURE);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private destroyed = false;

  constructor() {
    let listener: PluginListenerHandle | undefined;
    this.destroyRef.onDestroy(() => { this.destroyed = true; void listener?.remove(); });
    if (!this.native) return;
    void this.native.addListener('changed', () => {
      if (this.router.navigated) void this.open();
    }).then(async handle => {
      if (this.destroyed) { void handle.remove(); return; }
      listener = handle;
      // Esperar el arranque evita que la navegación inicial borre la captura.
      if (!this.router.navigated) {
        await firstValueFrom(this.router.events.pipe(
          filter(event => event instanceof NavigationEnd), take(1), takeUntilDestroyed(this.destroyRef)));
      }
      await this.open();
    }).catch(() => this.failed());
  }

  async open(): Promise<void> {
    try {
      const action = accionCaptura((await this.native?.consume())?.action);
      if (!action || this.destroyed) return;
      await this.router.navigate(['/dashboard'], { queryParams: { accion: action } });
    } catch { this.failed(); }
  }

  private failed(): void {
    if (!this.destroyed) this.toast.error('No se pudo abrir la captura. Vuelve a tocar el acceso.');
  }
}
