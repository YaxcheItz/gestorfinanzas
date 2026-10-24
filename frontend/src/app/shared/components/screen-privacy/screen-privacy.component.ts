import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ScreenPrivacyService } from '../../../core/services/screen-privacy.service';

@Component({
  selector: 'app-screen-privacy',
  imports: [],
  template: `
    @if (privacy.available) {
      <section aria-labelledby="screen-privacy-label" class="my-5 border-b border-slate-200 pb-5">
        <h3 id="screen-privacy-label" class="text-base font-semibold">Proteger pantalla en este Android</h3>
        <p class="my-2 text-sm leading-relaxed">Bloquea las capturas de Kaptal y protege su vista previa al cambiar de app. Se recuerda en este Android, también para la pantalla de acceso.</p>
        @if (privacy.enabled() !== null) {
          <button type="button" role="switch" aria-labelledby="screen-privacy-label"
            [attr.aria-checked]="privacy.enabled()" [attr.aria-busy]="privacy.busy()"
            [disabled]="privacy.busy()" (click)="privacy.set(!privacy.enabled())"
            class="min-h-11 rounded-xl border border-current px-4 py-2 font-semibold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600">
            <span aria-hidden="true">{{ privacy.enabled() ? 'Activada' : 'Desactivada' }}</span>
          </button>
        } @else if (!privacy.error()) {
          <p role="status">Comprobando protección…</p>
        }
        @if (privacy.error()) {
          <p role="alert" class="my-2 text-sm">{{ privacy.error() }}</p>
          <button type="button" (click)="privacy.refresh()" [disabled]="privacy.busy()"
            class="min-h-11 rounded-xl border border-current px-4 py-2 focus-visible:ring-2 focus-visible:ring-emerald-600">Comprobar protección</button>
        }
      </section>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreenPrivacyComponent {
  readonly privacy = inject(ScreenPrivacyService);
}
