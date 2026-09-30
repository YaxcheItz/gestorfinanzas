import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParejaService } from '../../core/services/pareja.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { mensajeDeError } from '../../core/utils/mensaje-error';
import { Pareja, TipoReparto } from '../../core/models/pareja.models';

type FormularioAbierto = 'aporte' | 'gasto' | 'pago' | null;

@Component({
  selector: 'app-pareja',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusTrapDirective, MontoPipe],
  template: `
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">

      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Gastos en pareja</h1>
          <p class="text-sm text-slate-500 mt-1">
            Un fondo común entre los dos. No mueve dinero de tus cuentas: solo lleva
            cuenta de qué puso cada quien y en qué se gastó.
          </p>
        </div>
        @if (pareja()) {
          <button
            type="button"
            (click)="desvincular()"
            [disabled]="ocupado()"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Desvincular
          </button>
        }
      </header>

      @if (cargando()) {
        <p class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Cargando tus gastos en pareja…
        </p>
      } @else if (error()) {
        <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {{ error() }}
        </div>
      } @else if (!pareja()) {
        <!-- Sin pareja: el estado inicial, no un error. -->
        <section class="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <h2 class="text-lg font-semibold text-slate-900">Vincula a tu pareja</h2>
          <p class="mt-1 text-sm text-slate-500">
            Necesita tener su cuenta en Kaptal. Solo pueden vincularse dos personas y
            cada una puede tener una pareja activa.
          </p>
          <form (ngSubmit)="vincular()" class="mt-5 space-y-3">
            <div>
              <label for="correo-pareja" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Correo de tu pareja</label>
              <input
                id="correo-pareja"
                name="correoPareja"
                type="email"
                required
                autocomplete="off"
                [(ngModel)]="correoPareja"
                placeholder="nombre@correo.com"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
            </div>
            @if (modalError()) {
              <p role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ modalError() }}</p>
            }
            <button
              type="submit"
              [disabled]="enviando() || !correoPareja.trim()"
              class="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
              {{ enviando() ? 'Vinculando…' : 'Vincular' }}
            </button>
          </form>
        </section>
      } @else {
        <!-- Resumen del fondo -->
        <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Fondo común</p>
            <p class="mt-1 text-2xl font-bold"
               [class.text-rose-600]="fondoNegativo()" [class.text-slate-900]="!fondoNegativo()"
               [class.dark:text-rose-400]="fondoNegativo()" [class.dark:text-white]="!fondoNegativo()">
              {{ estado()!.resumen.fondoDisponible | monto: estado()!.moneda }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              Puesto {{ estado()!.resumen.totalAportado | monto: estado()!.moneda }} ·
              gastado {{ estado()!.resumen.totalGastado | monto: estado()!.moneda }}
            </p>
          </div>

          @for (miembro of miembros(); track miembro.id) {
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900">
              <p class="truncate text-sm font-semibold text-slate-900">{{ miembro.nombre }}</p>
              <p class="mt-1 text-xl font-bold"
                 [class.text-rose-600]="miembro.saldo < 0" [class.text-emerald-600]="miembro.saldo >= 0">
                {{ miembro.saldo | monto: estado()!.moneda }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Puso {{ miembro.aportado | monto: estado()!.moneda }} ·
                consumió {{ miembro.consumido | monto: estado()!.moneda }}
              </p>
            </div>
          }
        </section>

        @if (deuda()) {
          <p class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {{ nombreDeudor() }} le debe <strong>{{ deuda()!.montoDeuda | monto: estado()!.moneda }}</strong> a
            {{ nombreAcreedor() }}.
          </p>
        }

        <!-- Acciones -->
        <div class="grid gap-2 sm:grid-cols-3">
          <button type="button" (click)="abrir('aporte')"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            Registrar aporte
          </button>
          <button type="button" (click)="abrir('gasto')"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Registrar gasto
          </button>
          <button type="button" (click)="abrir('pago')"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Registrar pago
          </button>
        </div>

        <!-- Movimientos -->
        <section class="space-y-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Aportes</h2>
            @if (estado()!.aportes.length === 0) {
              <p class="mt-1 text-sm text-slate-500">Todavía no han puesto nada.</p>
            }
          </div>
          @for (aporte of estado()!.aportes; track aporte.id) {
            <article class="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900">{{ aporte.usuarioNombre }}</p>
                <p class="text-xs text-slate-500">
                  {{ aporte.fecha | date:'d MMM y' }}@if (aporte.notas) { <span> · {{ aporte.notas }}</span>}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-sm font-semibold text-emerald-600">+{{ aporte.monto | monto: aporte.moneda }}</span>
                <button type="button" (click)="eliminarAporte(aporte.id)" [disabled]="ocupado()"
                  aria-label="Eliminar aporte" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950">
                  <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                </button>
              </div>
            </article>
          }
        </section>

        <section class="space-y-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Gastos compartidos</h2>
            @if (estado()!.gastos.length === 0) {
              <p class="mt-1 text-sm text-slate-500">Todavía no hay gastos.</p>
            }
          </div>
          @for (gasto of estado()!.gastos; track gasto.id) {
            <article class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-900">{{ gasto.descripcion }}</p>
                  <p class="text-xs text-slate-500">
                    {{ gasto.pagadoPorNombre }} pagó · {{ gasto.fecha | date:'d MMM y' }} ·
                    {{ etiquetaReparto(gasto.tipoReparto) }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">{{ gasto.monto | monto: gasto.moneda }}</span>
                  <button type="button" (click)="eliminarGasto(gasto.id)" [disabled]="ocupado()"
                    aria-label="Eliminar gasto" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950">
                    <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                  </button>
                </div>
              </div>
              <ul class="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                @for (parte of gasto.repartos; track parte.usuarioId) {
                  <li class="flex items-center justify-between gap-3 text-xs">
                    <span class="min-w-0 truncate text-slate-600 dark:text-slate-300">
                      {{ parte.usuarioNombre }} ({{ parte.porcentaje | number:'1.0-2' }}%)
                    </span>
                    <span class="shrink-0 font-medium text-slate-900">{{ parte.monto | monto: gasto.moneda }}</span>
                  </li>
                }
                <li class="flex items-center justify-between gap-3 text-xs font-semibold text-slate-900">
                  <span>Tu parte</span>
                  <span>{{ gasto.miParte | monto: gasto.moneda }}</span>
                </li>
              </ul>
            </article>
          }
        </section>

        <section class="space-y-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Pagos entre los dos</h2>
            @if (estado()!.pagos.length === 0) {
              <p class="mt-1 text-sm text-slate-500">No se han registrado pagos.</p>
            }
          </div>
          @for (pago of estado()!.pagos; track pago.id) {
            <article class="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900">
                  {{ pago.pagadorNombre }} → {{ pago.beneficiarioNombre }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ pago.fecha | date:'d MMM y' }}@if (pago.notas) { <span> · {{ pago.notas }}</span>}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-sm font-semibold text-slate-900">{{ pago.monto | monto: pago.moneda }}</span>
                <button type="button" (click)="eliminarPago(pago.id)" [disabled]="ocupado()"
                  aria-label="Eliminar pago" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950">
                  <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                </button>
              </div>
            </article>
          }
        </section>
      }
    </div>

    @if (formulario()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center" (click)="cerrar()">
        <div appFocusTrap role="dialog" aria-modal="true" [attr.aria-label]="tituloFormulario()"
          (click)="$event.stopPropagation()"
          class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6 dark:border-slate-700 dark:bg-slate-900">

          <h2 class="text-lg font-semibold text-slate-900">{{ tituloFormulario() }}</h2>
          @if (explicacion()) {
            <p class="mt-1 text-sm text-slate-500">{{ explicacion() }}</p>
          }

          <form (ngSubmit)="guardar()" class="mt-4 space-y-3">
            <div>
              <label for="form-monto" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Monto</label>
              <input id="form-monto" name="monto" type="number" inputmode="decimal" step="0.01" min="0.01" required
                [(ngModel)]="formMonto"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
            </div>

            @if (formulario() === 'gasto') {
              <div>
                <label for="form-descripcion" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Descripción</label>
                <input id="form-descripcion" name="descripcion" type="text" required maxlength="200" [(ngModel)]="formDescripcion"
                  class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
              </div>
              <div>
                <label for="form-tipo" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Cómo se reparte</label>
                <select id="form-tipo" name="tipoReparto" [(ngModel)]="formTipoReparto"
                  class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
                  <option value="IGUAL">A partes iguales</option>
                  <option value="PORCENTAJE">Por porcentaje</option>
                  <option value="EXACTO">Por monto exacto</option>
                </select>
              </div>
              @if (formTipoReparto === 'PORCENTAJE') {
                <div>
                  <label for="form-porcentaje" class="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    % que le toca a {{ parejaNombre() }}
                  </label>
                  <input id="form-porcentaje" name="porcentaje" type="number" inputmode="decimal" step="0.01" min="0.01" max="99.99" required
                    [(ngModel)]="formPorcentaje"
                    class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
                  <p class="mt-1 text-xs text-slate-500">Lo que queda es tu parte: {{ porcentajePropio() | number:'1.0-2' }}%.</p>
                </div>
              }
              @if (formTipoReparto === 'EXACTO') {
                <div>
                  <label for="form-exacto" class="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Monto que le toca a {{ parejaNombre() }}
                  </label>
                  <input id="form-exacto" name="exacto" type="number" inputmode="decimal" step="0.01" min="0.01" required
                    [(ngModel)]="formExacto"
                    class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
                  <p class="mt-1 text-xs text-slate-500">Lo que queda es tu parte: {{ montoPropio() | monto: estado()!.moneda }}.</p>
                </div>
              }
            }

            @if (formulario() === 'pago') {
              <p class="text-sm text-slate-600 dark:text-slate-300">
                Registra a quién le estás transferiendo para saldar la deuda.
              </p>
            }

            <div>
              <label for="form-notas" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Notas (opcional)</label>
              <input id="form-notas" name="notas" type="text" maxlength="500" [(ngModel)]="formNotas"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800">
            </div>

            @if (modalError()) {
              <p role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ modalError() }}</p>
            }

            <div class="flex gap-2 pt-1">
              <button type="button" (click)="cerrar()" [disabled]="enviando()"
                class="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button type="submit" [disabled]="enviando() || !puedeGuardar()"
                class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                {{ enviando() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class ParejaComponent implements OnInit {

  private readonly parejaService = inject(ParejaService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly pareja = signal<Pareja | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly enviando = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly formulario = signal<FormularioAbierto>(null);

  correoPareja = '';
  formMonto: number | null = null;
  formDescripcion = '';
  formTipoReparto: TipoReparto = 'IGUAL';
  formPorcentaje: number | null = null;
  formExacto: number | null = null;
  formNotas = '';

  readonly estado = computed(() => this.pareja());
  readonly comoVinculada = computed(() => this.pareja() !== null);
  readonly ocupado = computed(() => this.enviando());
  readonly miembros = computed(() => {
    const actual = this.pareja();
    return actual ? [actual.yo, actual.pareja] : [];
  });
  readonly fondoNegativo = computed(() => (this.pareja()?.resumen.fondoDisponible ?? 0) < 0);
  readonly deuda = computed(() => this.pareja()?.resumen ?? null);
  readonly comoConDeuda = computed(() => this.deuda()?.idQuienDebe != null);
  readonly parejaNombre = computed(() => this.pareja()?.pareja.nombre ?? 'tu pareja');

  readonly nombreDeudor = computed(() =>
    this.miembros().find(m => m.id === this.deuda()?.idQuienDebe)?.nombre ?? '');
  readonly nombreAcreedor = computed(() => {
    const actual = this.pareja();
    if (!actual) return '';
    const deudor = this.deuda()?.idQuienDebe;
    return [actual.yo, actual.pareja].find(m => m.id !== deudor)?.nombre ?? '';
  });

  readonly tituloFormulario = computed(() => {
    switch (this.formulario()) {
      case 'aporte': return 'Registrar aporte';
      case 'gasto': return 'Registrar gasto compartido';
      case 'pago': return 'Registrar pago';
      default: return '';
    }
  });

  readonly explicacion = computed(() => {
    if (this.formulario() === 'gasto') {
      return 'Lo que pagas tú aquí no sale de ninguna cuenta: solo se anota para saber quién debe qué.';
    }
    return '';
  });

  readonly porcentajePropio = computed(() => {
    if (this.formTipoReparto === 'IGUAL') return 50;
    if (this.formTipoReparto === 'PORCENTAJE' && this.formPorcentaje) {
      return Number((100 - this.formPorcentaje).toFixed(2));
    }
    return null;
  });

  readonly montoPropio = computed(() => {
    if (this.formTipoReparto !== 'EXACTO' || !this.formMonto || !this.formExacto) return null;
    return Number((this.formMonto - this.formExacto).toFixed(2));
  });

  /** El backend rechaza repartos que dejen a alguien sin parte, así que aquí se avisa antes. */
  puedeGuardar(): boolean {
    if (!this.formMonto || this.formMonto <= 0) return false;
    if (this.formulario() === 'gasto') {
      if (!this.formDescripcion.trim()) return false;
      if (this.formTipoReparto === 'PORCENTAJE') {
        return this.formPorcentaje != null && this.formPorcentaje > 0 && this.formPorcentaje < 100;
      }
      if (this.formTipoReparto === 'EXACTO') {
        return this.formExacto != null && this.formExacto > 0 && this.formExacto < this.formMonto;
      }
    }
    return true;
  }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.parejaService.obtener().subscribe({
      next: respuesta => {
        this.cargando.set(false);
        if (respuesta.success) this.pareja.set(respuesta.data);
      },
      error: fallo => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(fallo, 'No pudimos cargar tus gastos en pareja.'));
      }
    });
  }

  vincular(): void {
    this.enviando.set(true);
    this.modalError.set(null);
    this.parejaService.crear({ email: this.correoPareja.trim() }).subscribe({
      next: respuesta => {
        this.enviando.set(false);
        if (respuesta.success) {
          this.pareja.set(respuesta.data);
          this.correoPareja = '';
          this.toastService.show('success', 'Pareja vinculada correctamente');
        }
      },
      error: fallo => {
        this.enviando.set(false);
        this.modalError.set(mensajeDeError(fallo, 'No se pudo vincular la pareja.'));
      }
    });
  }

  abrir(que: FormularioAbierto): void {
    this.formulario.set(que);
    this.modalError.set(null);
    this.formMonto = null;
    this.formDescripcion = '';
    this.formTipoReparto = 'IGUAL';
    this.formPorcentaje = null;
    this.formExacto = null;
    this.formNotas = '';
  }

  cerrar(): void {
    if (this.enviando()) return;
    this.formulario.set(null);
    this.modalError.set(null);
  }

  guardar(): void {
    const tipo = this.formulario();
    if (!tipo || !this.puedeGuardar()) return;
    const fecha = new Date().toISOString().slice(0, 10);

    if (tipo === 'aporte') {
      this.enviar(this.parejaService.agregarAporte({
        monto: this.formMonto!, fecha, notas: this.normalizarNotas()
      }), 'Aporte registrado');
      return;
    }

    if (tipo === 'gasto') {
      this.enviar(this.parejaService.agregarGasto({
        monto: this.formMonto!,
        fecha,
        descripcion: this.formDescripcion.trim(),
        tipoReparto: this.formTipoReparto,
        porcentajePareja: this.formTipoReparto === 'PORCENTAJE' ? this.formPorcentaje : null,
        montoExactoPareja: this.formTipoReparto === 'EXACTO' ? this.formExacto : null
      }), 'Gasto compartido registrado');
      return;
    }

    const actual = this.pareja();
    if (!actual) return;
    // Quien registra el pago es el que paga, salvo que elija lo contrario.
    this.parejaService.registrarPago({
      monto: this.formMonto!,
      fecha,
      pagadorId: this.pagadorPorDefecto(),
      beneficiarioId: this.beneficiarioPorDefecto(),
      notas: this.normalizarNotas()
    }).subscribe({
      next: respuesta => this.trasExito(respuesta, 'Pago registrado'),
      error: fallo => this.trasFallo(fallo, 'No se pudo registrar el pago.')
    });
    this.enviando.set(true);
  }

  eliminarAporte(id: number): void { this.eliminar(this.parejaService.eliminarAporte(id), 'Aporte'); }
  eliminarGasto(id: number): void { this.eliminar(this.parejaService.eliminarGasto(id), 'Gasto'); }
  eliminarPago(id: number): void { this.eliminar(this.parejaService.eliminarPago(id), 'Pago'); }

  async desvincular(): Promise<void> {
    const actual = this.pareja();
    if (!actual) return;
    const confirmado = await this.confirmDialogService.confirm({
      title: 'Desvincular',
      message: `Se va a separar de ${actual.pareja.nombre}. El historial se conserva y pueden volver a vincularse más adelante.`,
      confirmText: 'Desvincular',
      type: 'warning'
    });
    if (!confirmado) return;
    this.parejaService.desvincular(actual.id).subscribe({
      next: respuesta => {
        if (respuesta.success) {
          this.pareja.set(null);
          this.toastService.show('success', 'Pareja desvinculada');
        }
      },
      error: fallo => this.toastService.error(mensajeDeError(fallo, 'No se pudo desvincular.'))
    });
  }

  etiquetaReparto(tipo: TipoReparto | null): string {
    switch (tipo) {
      case 'IGUAL': return 'Mitad y mitad';
      case 'PORCENTAJE': return 'Por porcentaje';
      case 'EXACTO': return 'Por monto exacto';
      default: return '';
    }
  }

  private enviar(operacion: { subscribe: (o: any) => void }, exito: string): void {
    this.enviando.set(true);
    this.modalError.set(null);
    operacion.subscribe({
      next: (respuesta: any) => this.trasExito(respuesta, exito),
      error: (fallo: any) => this.trasFallo(fallo, 'No se pudo guardar el movimiento.')
    });
  }

  private eliminar(operacion: { subscribe: (o: any) => void }, que: string): void {
    operacion.subscribe({
      next: (respuesta: any) => {
        if (respuesta.success) this.pareja.set(respuesta.data);
      },
      error: (fallo: any) => this.toastService.error(mensajeDeError(fallo, `No se pudo eliminar el ${que.toLowerCase()}.`))
    });
  }

  private trasExito(respuesta: { success: boolean; data: Pareja | null }, exito: string): void {
    this.enviando.set(false);
    if (respuesta.success) {
      this.pareja.set(respuesta.data);
      this.formulario.set(null);
      this.toastService.show('success', exito);
    }
  }

  private trasFallo(fallo: unknown, alternativa: string): void {
    this.enviando.set(false);
    this.modalError.set(mensajeDeError(fallo, alternativa));
  }

  private pagadorPorDefecto(): number {
    return this.deuda()?.idQuienDebe ?? this.pareja()!.yo.id;
  }

  private beneficiarioPorDefecto(): number {
    const deudor = this.deuda()?.idQuienDebe;
    if (deudor != null) return deudor;
    return this.pareja()!.pareja.id;
  }

  private normalizarNotas(): string | null {
    const texto = this.formNotas.trim();
    return texto.length > 0 ? texto : null;
  }
}
