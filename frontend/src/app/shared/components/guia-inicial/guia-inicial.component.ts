import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GuiaInicialService } from '../../../core/services/guia-inicial.service';

@Component({
  selector: 'app-guia-inicial',
  imports: [RouterLink],
  template: `
    @if (guia.visible()) {
      <section aria-labelledby="guia-inicial-titulo" class="guide">
        <header>
          <div><h2 id="guia-inicial-titulo" tabindex="-1" style="scroll-margin-top:8rem">Tus primeros pasos en Kaptal</h2>
          <p>Puedes empezar por donde quieras y omitir esta guía.</p></div>
          <button type="button" (click)="omitir()">Omitir guía</button>
        </header>
        <ol>
          <li><a routerLink="/cuentas">1. Prepara tus cuentas</a>
            <p>Añade solo tus cuentas reales y los datos que conozcas.</p></li>
          <li><a routerLink="/transacciones">2. Registra un movimiento</a>
            <p>Usa el formulario y elige su categoría. Texto y voz son opcionales; el micrófono se abre al pulsar Dictar.</p></li>
          <li><a routerLink="/presupuestos">3. Organiza tus gastos</a>
            <p>Crea presupuestos para las categorías que quieras seguir.</p></li>
        </ol>
        <p><a routerLink="/avisos">Revisa tus avisos</a>. Las automatizaciones requieren configurarlas y activarlas con tu consentimiento.</p>
        <p class="muted">Puedes volver a abrir esta guía desde Configuración en este dispositivo.</p>
      </section>
    }
  `,
  styles: `:host{display:block}.guide{margin:0 0 1rem;padding:1rem;border:1px solid var(--kaptal-border,#d1d5db);border-radius:1rem;background:var(--kaptal-surface,#fff);color:var(--kaptal-content,#1f2937)}header{display:flex;align-items:start;justify-content:space-between;gap:1rem;flex-wrap:wrap}h2{font-size:1.1rem;font-weight:700}p{font-size:.875rem;line-height:1.6;margin:.4rem 0;overflow-wrap:anywhere}ol{display:grid;gap:.75rem;list-style:none;padding:0;margin:1rem 0}a{display:inline-flex;align-items:center;min-height:44px;font-weight:600;text-decoration:underline;text-underline-offset:3px}button{min-height:44px;padding:.5rem .75rem;border:1px solid currentColor;border-radius:.75rem;font:inherit}a:focus-visible,button:focus-visible{outline:2px solid currentColor;outline-offset:3px}.muted{color:var(--kaptal-content-muted,#4b5563)}@media(min-width:640px){ol{grid-template-columns:repeat(3,minmax(0,1fr))}}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuiaInicialComponent {
  readonly guia = inject(GuiaInicialService);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    afterNextRender(() => {
      if (this.route.snapshot?.queryParamMap?.get('guia') !== 'inicio') return;
      const titulo = this.document.getElementById('guia-inicial-titulo');
      titulo?.focus({ preventScroll: true });
      titulo?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }

  omitir(): void {
    this.guia.omitir();
    this.document.getElementById('main-content')?.focus({ preventScroll: true });
  }
}
