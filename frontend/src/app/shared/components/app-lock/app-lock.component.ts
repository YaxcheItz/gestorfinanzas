import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppLockService } from '../../../core/services/app-lock.service';

@Component({
  selector: 'app-app-lock',
  imports: [],
  template: `
    @if (lock.nativeAndroid) {
      <section aria-labelledby="app-lock-label" class="my-5 border-b border-slate-200 pb-5">
        <h3 id="app-lock-label" class="text-base font-semibold">Bloquear Kaptal al salir</h3>
        <p class="my-2 text-sm leading-relaxed">Al volver o abrir Kaptal, desbloquea con la biometría o el PIN, patrón o contraseña de este Android. Los avisos bancarios siguen funcionando. Se recuerda en este dispositivo, también para la pantalla de acceso.</p>
        @if (lock.state(); as state) {
          @if (!state.supported) {
            <p role="status">Requiere Android 11 o posterior.</p>
          } @else if (!state.available) {
            <p role="status">Configura el bloqueo de pantalla en Seguridad de Android y vuelve a comprobar.</p>
          } @else {
            <button type="button" role="switch" aria-labelledby="app-lock-label"
              [attr.aria-checked]="state.enabled" [attr.aria-busy]="lock.busy()"
              [disabled]="lock.busy()" (click)="lock.set(!state.enabled)"
              class="min-h-11 rounded-xl border border-current px-4 py-2 font-semibold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600">
              <span aria-hidden="true">{{ state.enabled ? 'Activado' : 'Desactivado' }}</span>
            </button>
          }
        } @else if (!lock.error()) { <p role="status">Comprobando bloqueo…</p> }
        @if (lock.error()) { <p role="alert" class="my-2 text-sm">{{ lock.error() }}</p> }
        <button type="button" (click)="lock.refresh()" [disabled]="lock.busy()"
          class="min-h-11 rounded-xl border border-current px-4 py-2 focus-visible:ring-2 focus-visible:ring-emerald-600">Comprobar bloqueo</button>
      </section>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLockComponent {
  readonly lock = inject(AppLockService);
}
