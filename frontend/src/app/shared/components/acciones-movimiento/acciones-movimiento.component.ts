import { Component, EventEmitter, Output } from '@angular/core';
import { TipoTransaccion } from '../../../core/models/finanzas.models';

/** El saldo inicial no se registra desde aqui: lo crea la cuenta al crearse. */
export type TipoRegistroRapido = Exclude<TipoTransaccion, 'SALDO_INICIAL'>;

type Accion = {
  tipo: TipoRegistroRapido;
  etiqueta: string;
  /** Lo que se anuncia a un lector de pantalla, mas descriptivo que el boton suelto. */
  descripcion: string;
  clases: string;
  icono: string;
  categoriaId?: number | null;
};

/**
 * Acciones rapidas para registrar un movimiento.
 *
 * Antes habia un unico boton que abria el formulario con el tipo ya puesto en GASTO, asi que
 * registrar un ingreso o una transferencia exigia abrir el formulario y ademas cambiar de
 * pestaña. Aqui cada operacion tiene su propio boton y llega directa.
 *
 * Cada uno lleva icono y texto, no solo color: el tono distingue las tres de un vistazo, pero
 * quien no distingue rojo de verde, o usa un lector de pantalla, recibe la misma informacion.
 */
@Component({
  selector: 'app-acciones-movimiento',
  standalone: true,
  template: `
    <div
      role="group"
      aria-label="Acciones rápidas para registrar un movimiento"
      class="grid grid-cols-2 gap-3"
    >
      @for (accion of acciones; track accion.tipo) {
        <button
          type="button"
          (click)="elegir.emit({ tipo: accion.tipo, categoriaId: accion.categoriaId })"
          [attr.aria-label]="accion.descripcion"
          [class]="accion.clases"
          class="group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm transition-colors group-hover:bg-opacity-80">
            <svg
              aria-hidden="true"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path [attr.d]="accion.icono" />
            </svg>
          </div>
          <div class="text-left">
            <span class="block text-sm font-bold leading-tight sm:text-base">{{ accion.etiqueta }}</span>
          </div>
        </button>
      }
      <button
        type="button"
        (click)="navegar.emit()"
        class="group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm transition-colors group-hover:bg-opacity-80">
          <svg
            aria-hidden="true"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div class="text-left">
          <span class="block text-sm font-bold leading-tight sm:text-base">Cuentas</span>
        </div>
      </button>
    </div>
  `
})
export class AccionesMovimientoComponent {
  /** Emite el tipo y categoria elegidos para que el dashboard abra el formulario ya configurado. */
  @Output() elegir = new EventEmitter<{ tipo: TipoRegistroRapido; categoriaId?: number | null }>();
  /** Emite un evento para navegar a la gestión de cuentas. */
  @Output() navegar = new EventEmitter<void>();

  readonly acciones: Accion[] = [
    {
      tipo: 'GASTO',
      etiqueta: 'Gasto',
      descripcion: 'Saca dinero de tu cuenta',
      clases: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-emerald-500',
      icono: 'M7 7l10 10M17 9v8H9'
    },
    {
      tipo: 'INGRESO',
      etiqueta: 'Ingreso',
      descripcion: 'Suma dinero a tu cuenta',
      clases: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-emerald-500',
      icono: 'M7 17L17 7M9 7h8v8'
    },
    {
      tipo: 'TRANSFERENCIA',
      etiqueta: 'Transf.',
      descripcion: 'Mueve dinero entre cuentas',
      clases: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-emerald-500',
      icono: 'M4 9h13l-3-3M20 15H7l3 3'
    }
  ];
}
