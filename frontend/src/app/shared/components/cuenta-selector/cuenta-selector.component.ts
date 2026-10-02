import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Cuenta } from '../../../core/models/finanzas.models';
import { PrivacidadService } from '../../../core/services/privacidad.service';
import { nombreCuentaVisible, resumenCuentaSelector } from '../../../core/utils/cuenta-financiera';

@Component({
  selector: 'app-cuenta-selector',
  standalone: true,
  imports: [CommonModule],
  styles: [':host { display: block; width: 100%; min-width: 0; }'],
template: `
    <!-- En compacto el contenedor se desvanece con display:contents para que la
         etiqueta, el botón y el desplegable entren directamente en la rejilla de la
         fila "De -> Para". Asi el desplegable puede ocupar las tres columnas con
         col-span-full y medir el ancho del modal en vez de una mitad, que era
         lo que partia los nombres de las cuentas. -->
    <div class="relative min-w-0" [class.space-y-2]="!compacto">
      <div class="flex min-w-0 flex-col" [class.gap-1.5]="compacto" [class.gap-2]="!compacto">
      <!-- En compacto la etiqueta si se ve (es "De" / "Para", que orienta la
           transferencia); en la variante ancha el modal la apaga por separado. -->
      <span
        [id]="labelId"
        [class]="compacto
          ? 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500'
          : (etiquetaVisible
              ? 'block text-xs font-semibold uppercase tracking-wider dark:text-slate-300'
              : 'sr-only')">
        {{ label }}
      </span>

      <button
        type="button"
        [id]="selectId"
        role="combobox"
        aria-haspopup="listbox"
        [attr.aria-labelledby]="labelId"
        [attr.aria-expanded]="opcionesAbiertas()"
        [attr.aria-controls]="opcionesId"
        (click)="alternarOpciones()"
        (keydown.escape)="$event.stopPropagation(); cerrarOpciones()"
        [class]="botonClases">

        <div
          [class]="compacto
            ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700'
            : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-700'">
          <svg xmlns="http://www.w3.org/2000/svg" [class]="compacto ? 'h-4 w-4 text-slate-500 dark:text-slate-300' : 'h-5 w-5 text-slate-500 dark:text-slate-300'" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>

        <!-- Solo el nombre. El saldo y el tipo viven en el desplegable: aqui no
             alcanzan y empujaban el texto fuera de su caja. -->
        <span class="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-white">
          {{ cuentaSeleccionada()?.nombre ?? 'Seleccionar cuenta' }}
        </span>

        <svg class="h-4 w-4 shrink-0 text-slate-500 transition-transform" [class.rotate-180]="opcionesAbiertas()" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L5.22 8.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
        </svg>
      </button>
      </div>

      @if (opcionesAbiertas()) {
        <!-- El panel va en el flujo normal: dentro de un modal con overflow, un panel
             absoluto se recorta y deja cuentas inaccesibles en pantallas cortas. -->
        <div
          [id]="opcionesId"
          role="listbox"
          [attr.aria-labelledby]="labelId"
          [class.right-0]="compacto && alinearPanelDerecha"
          [class.left-0]="compacto && !alinearPanelDerecha"
          [class]="compacto
            ? 'absolute top-full z-30 mt-1.5 max-h-48 w-[calc(200%_+_2.25rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900'
            : 'max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900'">
          <div class="grid grid-cols-1 gap-2">
            @for (cuenta of cuentas; track cuenta.id) {
              <button
                type="button"
                role="option"
                [attr.aria-selected]="selectedId === cuenta.id"
                (click)="seleccionarCuenta(cuenta.id)"
                class="group flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                [class.border-emerald-500.bg-emerald-50.text-emerald-700.dark:border-emerald-500.dark:bg-emerald-900/20.dark:text-emerald-300]="selectedId === cuenta.id"
                [class.border-slate-200.bg-white.text-slate-700.dark:border-slate-700.dark:bg-slate-800.dark:text-slate-200]="selectedId !== cuenta.id">

                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>

                <div class="flex min-w-0 flex-1 flex-col items-start">
                  <div class="flex w-full min-w-0 items-center gap-2">
                    <span class="min-w-0 truncate font-bold">{{ nombreCuentaVisible(cuenta.nombre) }}</span>
                    <span class="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      {{ cuenta.tipo }}
                    </span>
                  </div>
                  <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ resumenCuentaSelector(cuenta) }}
                  </span>
                </div>

                @if (selectedId === cuenta.id) {
                  <svg class="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414l2.793 2.793 6.543-6.543a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                }
              </button>
            }
            @if (cuentas.length === 0) {
              <div class="flex items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay cuentas disponibles
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CuentaSelectorComponent {
  readonly nombreCuentaVisible = nombreCuentaVisible;
  @Input({ required: true }) cuentas: Cuenta[] = [];
  @Input({ required: true }) selectedId: number | null = null;
  @Input() label: string = 'Cuenta';
  /**
   * En el modal la etiqueta "Cuenta" no aporta: el botón ya muestra el nombre.
   * Se oculta a la vista pero sigue enunciando el control al lector de pantalla,
   * que sí necesita saber de qué campo se trata.
   */
  @Input() etiquetaVisible = true;
  /**
   * Variante encogida para las dos cuentas de una transferencia. Ademas de reducir
   * el boton, deja que el desplegable se liste a todo el ancho del modal.
   */
  @Input() compacto = false;
  @Input() alinearPanelDerecha = false;
  /** Base de los ids. Dos instancias en la misma pantalla necesitan bases distintas. */
  @Input() idBase = 'cuentaId';
  @Output() readonly selectedIdChange = new EventEmitter<number | null>();

  get botonClases(): string {
    const base = 'flex w-full cursor-pointer items-center rounded-2xl border border-slate-300 bg-slate-50 text-left text-sm text-slate-900 transition-all hover:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
    return this.compacto
      ? `${base} min-h-11 gap-2 px-2.5 py-1.5`
      : `${base} min-h-12 gap-3 px-4 py-2.5`;
  }

  get selectId(): string {
    return this.idBase;
  }

  get labelId(): string {
    return `${this.idBase}-label`;
  }

  get opcionesId(): string {
    return `${this.idBase}-opciones`;
  }

  readonly opcionesAbiertas = signal(false);

  constructor(private readonly privacidad: PrivacidadService) {}

  resumenCuentaSelector(cuenta: Cuenta): string {
    return resumenCuentaSelector(cuenta, this.privacidad.ocultarMontos());
  }

  cuentaSeleccionada() {
    return this.cuentas.find(c => c.id === this.selectedId);
  }

  alternarOpciones(): void {
    this.opcionesAbiertas.update(abierta => !abierta);
  }

  cerrarOpciones(): void {
    this.opcionesAbiertas.set(false);
  }

  seleccionarCuenta(id: number): void {
    this.selectedIdChange.emit(id);
    this.cerrarOpciones();
  }
}
