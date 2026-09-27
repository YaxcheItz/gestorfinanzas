import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostBinding, HostListener, Input, Output, Directive } from '@angular/core';
import { Transaccion } from '../../../core/models/finanzas.models';

@Directive({
  selector: '[appSwipeActions]',
  standalone: true,
  exportAs: 'appSwipeActions'
})
export class SwipeActionsDirective {
  @HostBinding('class.swipe-actions-open') isOpen = false;

  private pointerStart: { id: number; x: number; y: number } | null = null;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (target instanceof Element && target.closest('button, a, input, select, textarea'))
    ) {
      this.pointerStart = null;
      return;
    }

    this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (!this.pointerStart || event.pointerId !== this.pointerStart.id) return;

    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;
    this.pointerStart = null;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    this.isOpen = deltaX < 0;
  }

  @HostListener('pointercancel')
  onPointerCancel(): void {
    this.pointerStart = null;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.isOpen = false;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
  }
}

@Component({
  selector: 'app-movimiento-mobile-card',
  standalone: true,
  imports: [CommonModule, SwipeActionsDirective],
  template: `
    <article
      appSwipeActions
      #actions="appSwipeActions"
      [class.swipe-actions--no-edit]="movimiento.tipo === 'SALDO_INICIAL' || movimiento.cashbackAutomatico"
      class="swipe-actions relative rounded-2xl">
      @if (!movimiento.cashbackAutomatico) {
        <div
          class="swipe-actions__tray absolute inset-y-0 right-0 z-0 flex items-stretch gap-1 rounded-2xl bg-slate-100 p-1"
          [attr.aria-hidden]="!actions.isOpen">
          @if (movimiento.tipo !== 'SALDO_INICIAL') {
            <button
              type="button"
              (click)="actions.close(); editar.emit(movimiento)"
              [disabled]="!actions.isOpen"
              [attr.tabindex]="actions.isOpen ? 0 : -1"
              [attr.aria-label]="'Editar movimiento ' + etiquetaMovimiento"
              class="flex w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-white text-xs font-semibold text-emerald-700 shadow-xs disabled:pointer-events-none disabled:opacity-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Editar
            </button>
          }
          <button
            type="button"
            (click)="actions.close(); eliminar.emit(movimiento.id)"
            [disabled]="!actions.isOpen"
            [attr.tabindex]="actions.isOpen ? 0 : -1"
            [attr.aria-label]="'Eliminar movimiento ' + etiquetaMovimiento"
            class="flex w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-xs disabled:pointer-events-none disabled:opacity-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      }

      <div class="swipe-actions__content relative z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div class="flex min-w-0 items-start gap-3">
          <div
            [class]="movimiento.tipo === 'INGRESO' || movimiento.tipo === 'SALDO_INICIAL' ? 'bg-emerald-100 text-emerald-700' : movimiento.tipo === 'GASTO' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            @if (movimiento.tipo === 'INGRESO' || movimiento.tipo === 'SALDO_INICIAL') {
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            } @else if (movimiento.tipo === 'GASTO') {
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-bold text-slate-900">{{ etiquetaMovimiento }}</h3>
                <p class="mt-0.5 truncate text-xs text-slate-500" aria-label="Fecha y tipo de movimiento">
                  {{ fechaFormateada }} · {{ tipoEtiqueta }}
                </p>
                @if (movimiento.cashbackAutomatico) {
                  <span class="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Cashback automático</span>
                }
              </div>
              <div class="shrink-0 text-right">
                <p
                  [class.text-emerald-600]="movimiento.tipo === 'INGRESO' || movimiento.tipo === 'SALDO_INICIAL'"
                  [class.text-rose-600]="movimiento.tipo === 'GASTO'"
                  [class.text-blue-600]="movimiento.tipo === 'TRANSFERENCIA'"
                  class="text-sm font-bold">
                  {{ movimiento.tipo === 'INGRESO' || movimiento.tipo === 'SALDO_INICIAL' ? '+' : movimiento.tipo === 'GASTO' ? '−' : '' }}{{ movimiento.monto | currency:movimiento.moneda:'symbol':'1.2-2' }}
                </p>
                @if (movimiento.tipo === 'TRANSFERENCIA') {
                  <p class="text-xs font-semibold text-blue-600">
                    +{{ (movimiento.montoDestino ?? movimiento.monto) | currency:(movimiento.monedaDestino ?? movimiento.moneda):'symbol':'1.2-2' }}
                  </p>
                }
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <p class="min-w-0 truncate text-xs text-slate-500">
                {{ movimiento.cuentaNombre }}@if (movimiento.tipo === 'TRANSFERENCIA' && movimiento.cuentaDestinoNombre) { → {{ movimiento.cuentaDestinoNombre }}}
              </p>
              @if (!movimiento.cashbackAutomatico) {
                <button
                  type="button"
                  (click)="actions.toggle()"
                  [attr.aria-expanded]="actions.isOpen"
                  [attr.aria-label]="(actions.isOpen ? 'Ocultar' : 'Mostrar') + ' acciones para ' + etiquetaMovimiento"
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              }
            </div>
            @if (movimiento.notas) {
              <p class="mt-2 line-clamp-2 text-xs text-slate-400">{{ movimiento.notas }}</p>
            }
          </div>
        </div>
      </div>
    </article>
  `
})
export class MovimientoMobileCardComponent {
  @Input({ required: true }) movimiento!: Transaccion;
  @Output() editar = new EventEmitter<Transaccion>();
  @Output() eliminar = new EventEmitter<number>();

  get fechaFormateada(): string {
    const fecha = new Date(`${this.movimiento.fecha}T00:00:00Z`);
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(fecha);
  }

  get tipoEtiqueta(): string {
    switch (this.movimiento.tipo) {
      case 'INGRESO': return 'Ingreso';
      case 'GASTO': return 'Gasto';
      case 'TRANSFERENCIA': return 'Transferencia';
      case 'SALDO_INICIAL': return 'Saldo inicial';
    }
  }

  get etiquetaMovimiento(): string {
    return this.movimiento.categoriaNombre || this.movimiento.descripcion;
  }
}
