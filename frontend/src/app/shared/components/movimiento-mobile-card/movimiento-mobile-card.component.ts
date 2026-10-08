import { TextoFinancieroPipe } from '../../../core/pipes/texto-financiero.pipe';
import { CommonModule } from '@angular/common';
import {
  Component,
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

@Directive({
  selector: '[appSwipeActions]',
  standalone: true,
  exportAs: 'appSwipeActions'
})
export class SwipeActionsDirective {
  @HostBinding('class.swipe-actions-open-delete') openDelete = false;
  @HostBinding('class.swipe-actions-open-edit') openEdit = false;

  @Input() allowEdit = true;
  @Input() allowDelete = true;

  @Output() swipeDeleteReveal = new EventEmitter<void>();
  @Output() swipeEditReveal = new EventEmitter<void>();
  @Output() tap = new EventEmitter<void>();

  private pointerStart: { id: number; x: number; y: number; moved: boolean } | null = null;
  private suppressTapUntil = 0;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (
      !event.isPrimary
      || event.button !== 0
      || (target instanceof Element && target.closest('button, a, input, select, textarea'))
    ) {
      this.pointerStart = null;
      return;
    }

    this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.pointerStart || event.pointerId !== this.pointerStart.id) return;
    const dx = event.clientX - this.pointerStart.x;
    const dy = event.clientY - this.pointerStart.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      this.pointerStart.moved = true;
    }
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (!this.pointerStart || event.pointerId !== this.pointerStart.id) return;

    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;
    const moved = this.pointerStart.moved;
    this.pointerStart = null;

    const horizontal = Math.abs(deltaX) >= 44 && Math.abs(deltaX) >= Math.abs(deltaY) * 1.25;
    if (horizontal) {
      this.suppressTapUntil = Date.now() + 350;
      if (deltaX < 0 && this.allowDelete) {
        this.openEdit = false;
        this.openDelete = true;
        this.swipeDeleteReveal.emit();
        return;
      }
      if (deltaX > 0 && this.allowEdit) {
        this.openDelete = false;
        this.openEdit = true;
        this.swipeEditReveal.emit();
        return;
      }
      return;
    }

    if (!moved && Date.now() > this.suppressTapUntil) {
      if (this.openDelete || this.openEdit) {
        this.close();
        return;
      }
      this.tap.emit();
    }
  }

  @HostListener('pointercancel')
  onPointerCancel(): void {
    this.pointerStart = null;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.close();
  }

  toggleDelete(): void {
    this.openEdit = false;
    this.openDelete = !this.openDelete;
  }

  close(): void {
    this.openDelete = false;
    this.openEdit = false;
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
    .swipe-actions__tray {
      position: absolute;
      inset-block: 0;
      z-index: 0;
      display: flex;
      align-items: stretch;
      width: 5rem;
      padding: 0.25rem;
    }
    .swipe-actions__tray--edit { inset-inline-start: 0; }
    .swipe-actions__tray--delete { inset-inline-end: 0; }
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
      background: #e11d48;
      color: #fff;
    }
    .swipe-actions__action:disabled {
      pointer-events: none;
      opacity: 0;
    }
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
    .tx-item__amount.is-expense strong { color: #ef4444; }
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
      background: var(--kaptal-surface, #121212);
    }
    :host-context(html.dark) .tx-item__title { color: var(--kaptal-content, #f9fafb); }
    :host-context(html.dark) .tx-item__meta,
    :host-context(html.dark) .tx-item__mic,
    :host-context(html.dark) .tx-item__amount small { color: var(--kaptal-content-muted, #9ca3af); }
    :host-context(html.dark) .tx-item__amount strong { color: var(--kaptal-content, #f3f4f6); }
    :host-context(html.dark) .tx-item__amount.is-income strong { color: var(--kaptal-income, #10b981); }
    :host-context(html.dark) .tx-item__amount.is-expense strong { color: var(--kaptal-expense, #f87171); }
  `]
})
export class MovimientoMobileCardComponent {
  readonly nombreCuentaVisible = nombreCuentaVisible;
  @Input({ required: true }) movimiento!: Transaccion;
  @Input() autoAccionAlSoltar = true;
  @Output() editar = new EventEmitter<Transaccion>();
  @Output() eliminar = new EventEmitter<number>();
  @Output() detalle = new EventEmitter<Transaccion>();

  get puedeAdministrarse(): boolean {
    return this.movimiento.cuentaId !== null
      && (this.movimiento.tipo !== 'TRANSFERENCIA' || this.movimiento.cuentaDestinoId != null)
      && !this.movimiento.cashbackAutomatico
      && !this.movimiento.compraMsiId;
  }

  get puedeEditarse(): boolean {
    return this.puedeAdministrarse && this.movimiento.tipo !== 'SALDO_INICIAL';
  }

  get fechaFormateada(): string {
    const ahora = new Date();
    const hoy = new Date(Date.now() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const ayerDate = new Date(ahora.getTime() - 86_400_000);
    const ayer = new Date(ayerDate.getTime() - ayerDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    if (this.movimiento.fecha === hoy) return 'Hoy';
    if (this.movimiento.fecha === ayer) return 'Ayer';
    const fecha = new Date(`${this.movimiento.fecha}T00:00:00Z`);
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
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
    if (this.esGasto) return '−';
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

  onSwipeDelete(actions: SwipeActionsDirective): void {
    if (!this.autoAccionAlSoltar) return;
    this.eliminar.emit(this.movimiento.id);
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
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    if (full.length !== 6) return null;
    const value = Number.parseInt(full, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  get etiquetaMovimiento(): string {
    return this.movimiento.categoriaNombre || this.movimiento.descripcion;
  }
}
