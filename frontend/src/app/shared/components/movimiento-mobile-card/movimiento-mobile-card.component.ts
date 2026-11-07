import { ListaContextoService } from '../../../core/services/lista-contexto.service';
import { TextoFinancieroPipe } from '../../../core/pipes/texto-financiero.pipe';
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output
} from '@angular/core';
import { Transaccion } from '../../../core/models/finanzas.models';
import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { nombreCuentaVisible } from '../../../core/utils/cuenta-financiera';
import { CategoriaIconoComponent } from '../categoria-icono/categoria-icono.component';

export type MetodoCaptura = 'VOZ' | 'WHATSAPP' | 'TEXTO' | 'DESCONOCIDO';

// ─── Constantes de comportamiento del swipe ──────────────────────────────────
const SWIPE_THRESHOLD   = 44;    // px mínimos para reconocer swipe horizontal
const TRAY_WIDTH        = 80;    // px que se revela del tray al abrir
const DRAG_RESISTANCE   = 0.35;  // factor de fricción al arrastrar más allá del tray
const CONFIRM_THRESHOLD = 120;   // px donde el ícono crece indicando acción disponible

@Directive({
  selector: '[appSwipeActions]',
  standalone: true,
  exportAs: 'appSwipeActions'
})
export class SwipeActionsDirective {
  @HostBinding('class.swipe-actions-open-delete') openDelete = false;
  @HostBinding('class.swipe-actions-open-edit')   openEdit   = false;
  @HostBinding('class.swipe-actions--dragging')   dragging   = false;
  @HostBinding('class.swipe-actions--confirmed')  confirmed  = false;

  @Input() allowEdit   = true;
  @Input() allowDelete = true;

  @Output() swipeDeleteReveal = new EventEmitter<void>();
  @Output() swipeEditReveal   = new EventEmitter<void>();
  @Output() tap               = new EventEmitter<void>();

  private host!: HTMLElement;
  private content: HTMLElement | null = null;
  private trayDelete: HTMLElement | null = null;
  private trayEdit:   HTMLElement | null = null;

  private start: { id: number; x: number; y: number } | null = null;
  private suppressTapUntil = 0;
  private rafId = 0;
  private currentDx = 0;
  private direction: 'delete' | 'edit' | null = null;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(e: PointerEvent): void {
    const target = e.target;
    if (
      !e.isPrimary || e.button !== 0
      || (target instanceof Element && target.closest('button, a, input, select, textarea'))
    ) return;

    this.host       = e.currentTarget as HTMLElement;
    this.content    = this.host.querySelector<HTMLElement>('.swipe-actions__content');
    this.trayDelete = this.host.querySelector<HTMLElement>('.swipe-actions__tray--delete');
    this.trayEdit   = this.host.querySelector<HTMLElement>('.swipe-actions__tray--edit');

    // Si ya hay un tray abierto, lo cerramos y cancelamos el nuevo gesto
    if (this.openDelete || this.openEdit) {
      this.animateClose();
      return;
    }

    this.start     = { id: e.pointerId, x: e.clientX, y: e.clientY };
    this.direction = null;
    this.currentDx = 0;
    this.host.setPointerCapture(e.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(e: PointerEvent): void {
    if (!this.start || e.pointerId !== this.start.id) return;

    const rawDx = e.clientX - this.start.x;
    const rawDy = e.clientY - this.start.y;

    // Determinar dirección dominante la primera vez que se mueve lo suficiente
    if (!this.direction) {
      if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
      // Si el movimiento es más vertical que horizontal → scroll, cancelamos
      if (Math.abs(rawDy) > Math.abs(rawDx)) { this.start = null; return; }

      if (rawDx < 0 && this.allowDelete)     this.direction = 'delete';
      else if (rawDx > 0 && this.allowEdit)  this.direction = 'edit';
      else { this.start = null; return; }

      this.dragging = true;
      this.disableTransition(this.content);
    }

    // Calcular desplazamiento con resistencia más allá del ancho del tray
    let dx = rawDx;
    const sign     = this.direction === 'delete' ? -1 : 1;
    const positive = Math.max(0, dx * sign);
    dx = positive * sign;
    if (positive > TRAY_WIDTH) {
      dx = sign * (TRAY_WIDTH + (positive - TRAY_WIDTH) * DRAG_RESISTANCE);
    }
    this.currentDx = dx;
    this.confirmed = positive >= CONFIRM_THRESHOLD;

    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => this.applyDrag(dx, positive));
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(e: PointerEvent): void {
    if (!this.start || e.pointerId !== this.start.id) return;
    const hadStart = this.start;
    this.start     = null;
    this.dragging  = false;
    this.confirmed = false;
    cancelAnimationFrame(this.rafId);

    const rawDx = e.clientX - hadStart.x;
    const rawDy = e.clientY - hadStart.y;

    if (!this.direction) {
      // Fue un tap limpio (sin movimiento)
      if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8 && Date.now() > this.suppressTapUntil) {
        this.tap.emit();
      }
      return;
    }

    this.enableTransition(this.content);
    this.suppressTapUntil = Date.now() + 350;

    const positive = Math.abs(this.currentDx);

    if (positive >= SWIPE_THRESHOLD) {
      // Revelar tray con spring
      if (this.direction === 'delete') {
        this.openDelete = true;
        this.setContentX(-TRAY_WIDTH);
        this.revealTray(this.trayDelete, true);
        this.swipeDeleteReveal.emit();
      } else {
        this.openEdit = true;
        this.setContentX(TRAY_WIDTH);
        this.revealTray(this.trayEdit, true);
        this.swipeEditReveal.emit();
      }
    } else {
      // Spring-back: no alcanzó el umbral
      this.animateClose();
    }

    this.direction = null;
  }

  @HostListener('pointercancel')
  onPointerCancel(): void {
    if (!this.start) return;
    this.start     = null;
    this.dragging  = false;
    this.confirmed = false;
    this.direction = null;
    cancelAnimationFrame(this.rafId);
    this.animateClose();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void { this.close(); }

  toggleDelete(): void {
    this.openEdit = false;
    if (this.openDelete) { this.animateClose(); }
    else {
      this.openDelete = true;
      this.enableTransition(this.content);
      this.setContentX(-TRAY_WIDTH);
      this.revealTray(this.trayDelete, true);
    }
  }

  close(): void { this.animateClose(); }

  // ── Helpers internos ──────────────────────────────────────────────────────

  /** Aplica posición y escala del ícono durante el arrastre. */
  private applyDrag(dx: number, positive: number): void {
    if (!this.content) return;
    this.content.style.transform = `translateX(${dx}px)`;

    const tray = this.direction === 'delete' ? this.trayDelete : this.trayEdit;
    if (tray) {
      const ratio    = Math.min(positive / TRAY_WIDTH, 1);
      const overRatio = Math.max(0, positive - TRAY_WIDTH) / Math.max(1, CONFIRM_THRESHOLD - TRAY_WIDTH);
      const iconScale = 0.7 + 0.3 * ratio + (this.confirmed ? 0.15 * overRatio : 0);

      tray.style.opacity   = String(Math.min(ratio * 1.4, 1));
      tray.style.transform = `scaleX(${Math.min(ratio * 1.2, 1)})`;
      const btn = tray.querySelector<HTMLElement>('.swipe-actions__action');
      if (btn) btn.style.transform = `scale(${iconScale})`;
    }
  }

  /** Devuelve la card a su posición original con animación spring. */
  private animateClose(): void {
    this.openDelete = false;
    this.openEdit   = false;
    this.enableTransition(this.content);
    this.setContentX(0);
    [this.trayDelete, this.trayEdit].forEach(t => {
      if (!t) return;
      t.style.opacity   = '0';
      t.style.transform = 'scaleX(0)';
      const btn = t.querySelector<HTMLElement>('.swipe-actions__action');
      if (btn) btn.style.transform = '';
    });
  }

  private revealTray(tray: HTMLElement | null, show: boolean): void {
    if (!tray) return;
    tray.style.opacity   = show ? '1' : '0';
    tray.style.transform = show ? 'scaleX(1)' : 'scaleX(0)';
    const btn = tray.querySelector<HTMLElement>('.swipe-actions__action');
    if (btn) btn.style.transform = show ? 'scale(1)' : '';
  }

  private setContentX(x: number): void {
    if (this.content) this.content.style.transform = `translateX(${x}px)`;
  }

  private enableTransition(el: HTMLElement | null): void {
    if (el) el.style.transition = 'transform 320ms cubic-bezier(0.34, 1.3, 0.64, 1)';
  }

  private disableTransition(el: HTMLElement | null): void {
    if (el) el.style.transition = 'none';
  }
}

@Component({
  selector: 'app-movimiento-mobile-card',
  standalone: true,
  imports: [TextoFinancieroPipe, CommonModule, SwipeActionsDirective, MontoPipe, CategoriaIconoComponent],
  template: `
    <article
      appSwipeActions
      #actions="appSwipeActions"
      [allowEdit]="puedeEditarse"
      [allowDelete]="puedeAdministrarse"
      [class.swipe-actions--no-edit]="!puedeEditarse"
      class="swipe-actions relative tx-item-wrap"
      (swipeDeleteReveal)="onSwipeDelete(actions)"
      (swipeEditReveal)="onSwipeEdit(actions)"
      (tap)="detalle.emit(movimiento)">

      @if (puedeEditarse) {
        <div
          class="swipe-actions__tray swipe-actions__tray--edit"
          [attr.aria-hidden]="!actions.openEdit">
          <button
            type="button"
            (click)="actions.close(); editar.emit(movimiento)"
            [disabled]="!actions.openEdit"
            [attr.tabindex]="actions.openEdit ? 0 : -1"
            [attr.aria-label]="('Editar movimiento ' + etiquetaMovimiento) | textoFinanciero"
            class="swipe-actions__action swipe-actions__action--edit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Editar
          </button>
        </div>
      }

      @if (puedeAdministrarse) {
        <div
          class="swipe-actions__tray swipe-actions__tray--delete"
          [attr.aria-hidden]="!actions.openDelete">
          <button
            type="button"
            (click)="actions.close(); eliminar.emit(movimiento.id)"
            [disabled]="!actions.openDelete"
            [attr.tabindex]="actions.openDelete ? 0 : -1"
            [attr.aria-label]="('Eliminar movimiento ' + etiquetaMovimiento) | textoFinanciero"
            class="swipe-actions__action swipe-actions__action--delete">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      }

      <div class="swipe-actions__content tx-item relative z-10" role="button" tabindex="0"
           [attr.aria-label]="('Ver detalle de ' + etiquetaMovimiento) | textoFinanciero"
           (keydown.enter)="detalle.emit(movimiento)"
           (keydown.space)="$event.preventDefault(); detalle.emit(movimiento)">
        <div class="tx-item__icon" [style.background-color]="colorCategoriaFondo" [style.color]="colorCategoriaTexto">
          @if (movimiento.categoriaIcono) {
            <app-categoria-icono [icono]="movimiento.categoriaIcono" [tipo]="movimiento.tipo" clase="h-5 w-5" />
          } @else if (movimiento.tipo === 'INGRESO' || movimiento.tipo === 'SALDO_INICIAL') {
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
          } @else if (movimiento.tipo === 'GASTO') {
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
          } @else {
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          }
        </div>

        <div class="tx-item__body">
          <h3 class="tx-item__title">{{ (etiquetaMovimiento) | textoFinanciero }}</h3>
          <p class="tx-item__account">@if(movimiento.categoriaNombre) {<span>{{ movimiento.categoriaNombre }} · </span>}{{ nombreCuentaVisible(movimiento.cuentaNombre) }}@if(movimiento.tipo === 'TRANSFERENCIA') { → {{ nombreCuentaVisible(movimiento.cuentaDestinoNombre) }}}</p>
          @if(movimiento.tipo === 'TRANSFERENCIA' && movimiento.monedaDestino && movimiento.monedaDestino !== movimiento.moneda) {
            <small>{{movimiento.fuenteCambio === 'MANUAL' ? 'Cambio manual aplicado el ' + movimiento.fechaCambio : 'Cambio histórico · fuente no registrada'}}</small>
          }
          @if(movimiento.etiquetas?.length){<p class="tx-item__tags" style="display:flex;flex-wrap:wrap;gap:4px;font-size:11px;line-height:1.5;overflow-wrap:anywhere">@for(etiqueta of movimiento.etiquetas; track etiqueta){<span>#{{ etiqueta }}</span>}</p>}
          @if(soloLectura && movimiento.autorNombre){<p class="tx-item__meta">Por {{ movimiento.autorNombre }}</p>}
          <p class="tx-item__meta">
            @if (metodoCaptura === 'VOZ') {
              <svg class="tx-item__mic" aria-label="Capturado por voz" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>
            }
            <span>{{ fechaHoraEtiqueta }}</span>
          </p>
        </div>

        <div class="tx-item__amount" [class.is-income]="esIngreso" [class.is-expense]="esGasto">
          <strong>{{ prefijoMonto }}{{ movimiento.monto | monto:movimiento.moneda:'symbol':'1.2-2' }}</strong>
          @if (movimiento.tipo === 'TRANSFERENCIA') {
            <small>+{{ (movimiento.montoDestino ?? movimiento.monto) | monto:(movimiento.monedaDestino ?? movimiento.moneda):'symbol':'1.2-2' }}</small>
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
    }
    .tx-item-wrap {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      border-radius: 0.9rem;
    }

    /* ── Trays (fondos de acción) ─────────────────────────────────────── */
    .swipe-actions__tray {
      position: absolute;
      inset-block: 0;
      z-index: 0;
      display: flex;
      align-items: stretch;
      width: 5rem;
      padding: 0.25rem;
      /* Estado inicial: invisible y colapsado */
      opacity: 0;
      transform: scaleX(0);
      transition:
        opacity 300ms ease,
        transform 300ms cubic-bezier(0.34, 1.3, 0.64, 1);
    }
    .swipe-actions__tray--edit   { inset-inline-start: 0; transform-origin: left; }
    .swipe-actions__tray--delete { inset-inline-end: 0;   transform-origin: right; }

    /* ── Botones de acción ───────────────────────────────────────────── */
    .swipe-actions__action {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      border: 0;
      border-radius: 0.75rem;
      font-size: 0.7rem;
      font-weight: 700;
      transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-origin: center;
    }
    .swipe-actions__action svg {
      width: 1.25rem;
      height: 1.25rem;
    }
    .swipe-actions__action--edit {
      background: linear-gradient(160deg, #f97316, #ea580c);
      color: #fff7ed;
    }
    .swipe-actions__action--delete {
      background: linear-gradient(160deg, #f43f5e, #e11d48);
      color: #fff;
    }
    .swipe-actions__action:disabled {
      pointer-events: none;
      opacity: 0;
    }

    /* ── Contenido principal: se desliza sobre los trays ──────────────── */
    .swipe-actions__content {
      /* La transition la activa/desactiva la directiva por JS */
      will-change: transform;
    }

    /* ── Card base ───────────────────────────────────────────────────── */
    .tx-item {
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #f3f4f6;
      border-radius: 0.9rem;
      background: #ffffff;
      cursor: pointer;
    }
    .tx-item:focus-visible {
      outline: 2px solid #52525b;
      outline-offset: 2px;
    }
    .tx-item__icon {
      display: grid;
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 14px;
      font-size: 1.1rem;
      line-height: 1;
    }
    .tx-item__icon svg {
      width: 20px;
      height: 20px;
    }
    .tx-item__body {
      display: flex;
      min-width: 0;
      flex: 1 1 0%;
      flex-direction: column;
      gap: 0.15rem;
      margin-left: 10px;
      overflow: hidden;
    }
    .tx-item__title {
      margin: 0;
      overflow: hidden;
      color: #111827;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.25;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .tx-item__meta {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      min-width: 0;
      margin: 0;
      color: #6b7280;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.3;
      overflow: hidden;
    }
    .tx-item__meta > span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .tx-item__mic {
      width: 10px;
      height: 10px;
      flex: none;
      color: #6b7280;
    }
    .tx-item__amount {
      flex: 0 1 auto;
      max-width: 42%;
      min-width: 0;
      margin-left: 0.5rem;
      text-align: right;
      overflow: hidden;
    }
    .tx-item__amount strong {
      display: block;
      overflow: hidden;
      color: #111827;
      font-size: clamp(12px, 3.6vw, 15px);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .tx-item__amount.is-income strong { color: #10b981; }
    .tx-item__account { margin: .15rem 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .72rem; color: var(--kaptal-content-muted, #6b7280); }
    .tx-item__amount.is-expense strong { color: var(--kaptal-content, #111111); }
    .tx-item__amount small {
      display: block;
      overflow: hidden;
      margin-top: 0.1rem;
      color: #6b7280;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    :host-context(html.dark) .tx-item {
      border-color: var(--kaptal-border, #1f1f1f);
      background: transparent;
    }
    :host-context(html.dark) .tx-item__title { color: var(--kaptal-content, #f9fafb); }
    :host-context(html.dark) .tx-item__meta,
    :host-context(html.dark) .tx-item__mic,
    :host-context(html.dark) .tx-item__amount small { color: var(--kaptal-content-muted, #9ca3af); }
    :host-context(html.dark) .tx-item__amount strong { color: var(--kaptal-content, #f3f4f6); }
    :host-context(html.dark) .tx-item__amount.is-income strong { color: var(--kaptal-income, #10b981); }
    :host-context(html.dark) .tx-item__amount.is-expense strong { color: var(--kaptal-content, #ffffff); }

    /* ── Reducir animaciones ────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .swipe-actions__tray,
      .swipe-actions__action,
      .swipe-actions__content { transition: none !important; }
    }
  `]
})
export class MovimientoMobileCardComponent {
  readonly nombreCuentaVisible = nombreCuentaVisible;
  @Input({ required: true }) movimiento!: Transaccion;
  @Input() autoAccionAlSoltar = false;
  private readonly listas = inject(ListaContextoService);
  @Input() soloLectura = false;
  @Output() editar   = new EventEmitter<Transaccion>();
  @Output() eliminar = new EventEmitter<number>();
  @Output() detalle  = new EventEmitter<Transaccion>();

  get puedeAdministrarse(): boolean {
    const lista = this.listas.listas().find(l => l.id === this.movimiento.listaId);
    return !lista?.archivada && lista?.rol !== 'LECTOR' && !this.soloLectura
      && (this.listas.usuarioId() == null || this.movimiento.autorId == null || this.movimiento.autorId === this.listas.usuarioId())
      && this.movimiento.cuentaId !== null
      && (this.movimiento.tipo !== 'TRANSFERENCIA' || this.movimiento.cuentaDestinoId != null)
      && !this.movimiento.cashbackAutomatico
      && !this.movimiento.compraMsiId;
  }

  get puedeEditarse(): boolean {
    return this.puedeAdministrarse && this.movimiento.tipo !== 'SALDO_INICIAL';
  }

  get fechaFormateada(): string {
    const ahora = new Date();
    const hoy   = new Date(Date.now() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const ayerDate = new Date(ahora.getTime() - 86_400_000);
    const ayer  = new Date(ayerDate.getTime() - ayerDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    if (this.movimiento.fecha === hoy)  return 'Hoy';
    if (this.movimiento.fecha === ayer) return 'Ayer';
    const fecha = new Date(`${this.movimiento.fecha}T00:00:00Z`);
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(fecha);
  }

  get horaFormateada(): string {
    if (!this.movimiento.fechaCreacion) return '';
    const fecha = new Date(this.movimiento.fechaCreacion);
    return Number.isNaN(fecha.getTime())
      ? ''
      : new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(fecha);
  }

  get fechaHoraEtiqueta(): string {
    return this.horaFormateada ? `${this.fechaFormateada}, ${this.horaFormateada}` : this.fechaFormateada;
  }

  get metodoCaptura(): MetodoCaptura {
    return MovimientoMobileCardComponent.detectarMetodoCaptura(this.movimiento);
  }

  static detectarMetodoCaptura(movimiento: Transaccion): MetodoCaptura {
    return movimiento.metodoCaptura ?? 'DESCONOCIDO';
  }

  get esIngreso(): boolean {
    return this.movimiento.tipo === 'INGRESO' || this.movimiento.tipo === 'SALDO_INICIAL';
  }

  get esGasto(): boolean {
    return this.movimiento.tipo === 'GASTO';
  }

  get prefijoMonto(): string {
    if (this.esIngreso) return '+';
    if (this.esGasto)   return '−';
    return '';
  }

  get colorCategoriaFondo(): string {
    const color = this.colorSeguro(this.movimiento.categoriaColor);
    if (color) {
      const rgb = this.hexToRgb(color);
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgba(156, 163, 175, 0.15)';
    }
    return this.esIngreso ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)';
  }

  get colorCategoriaTexto(): string {
    return this.colorSeguro(this.movimiento.categoriaColor) ?? (this.esIngreso ? '#059669' : '#b45309');
  }

  onSwipeDelete(_actions: SwipeActionsDirective): void {
    // El tray se revela; el usuario debe pulsar el botón de Eliminar explícitamente.
    // autoAccionAlSoltar queda disponible para llamadores que deseen dispararlo directamente.
  }

  onSwipeEdit(actions: SwipeActionsDirective): void {
    if (!this.autoAccionAlSoltar || !this.puedeEditarse) return;
    actions.close();
    this.editar.emit(this.movimiento);
  }

  private colorSeguro(color?: string | null): string | null {
    return color && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color) ? color : null;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const raw  = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    if (full.length !== 6) return null;
    const value = Number.parseInt(full, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  get etiquetaMovimiento(): string {
    return this.movimiento.descripcion?.trim() || this.movimiento.categoriaNombre || 'Movimiento';
  }
}
