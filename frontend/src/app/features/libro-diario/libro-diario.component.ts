import { TextoFinancieroPipe } from '../../core/pipes/texto-financiero.pipe';
﻿import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsientoContable, BackfillLibroDiario, ConciliacionCuenta, Cuenta, PageResponse, TipoTransaccion } from '../../core/models/finanzas.models';
import { FinanzasService } from '../../core/services/finanzas.service';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { nombreCuentaVisible } from '../../core/utils/cuenta-financiera';

@Component({
  selector: 'app-libro-diario',
  standalone: true,
  imports: [TextoFinancieroPipe, CommonModule, FormsModule, RouterLink, MontoPipe],
  template: `
    <main class="finance-page mx-auto max-w-5xl space-y-5 px-3 py-5 sm:space-y-7 sm:px-6 sm:py-8">
      <header>
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Finanzas · Registro contable</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Libro diario</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Cada movimiento nuevo se refleja como un asiento de doble partida. Debe y Haber cuadran por separado
          para cada moneda; los saldos actuales de tus cuentas siguen calculándose con el sistema existente.
        </p>
      </header>

      <aside class="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
        Los movimientos nuevos se registran automáticamente. Puedes revisar e incorporar los movimientos antiguos disponibles abajo; el proceso no cambia los saldos operativos.
      </aside>

      <form (ngSubmit)="aplicarFiltros()" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Buscar asientos</h2>
          <span class="text-xs text-slate-500">Los filtros se aplican también al cambiar de página.</span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Desde
            <input type="date" name="desde" [ngModel]="filtroDesde()" (ngModelChange)="filtroDesde.set($event)" class="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </label>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Hasta
            <input type="date" name="hasta" [ngModel]="filtroHasta()" (ngModelChange)="filtroHasta.set($event)" class="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </label>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Movimiento
            <select name="tipoMovimiento" [ngModel]="filtroTipoMovimiento()" (ngModelChange)="filtroTipoMovimiento.set($event)" class="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">Todos</option><option value="INGRESO">Ingreso</option><option value="GASTO">Gasto</option><option value="TRANSFERENCIA">Transferencia</option><option value="SALDO_INICIAL">Saldo inicial</option>
            </select>
          </label>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Evento contable
            <select name="tipoEvento" [ngModel]="filtroTipoEvento()" (ngModelChange)="filtroTipoEvento.set($event)" class="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">Todos</option><option value="CREACION">Registro</option><option value="SALDO_INICIAL">Saldo inicial</option><option value="ACTUALIZACION">Corrección</option><option value="ELIMINACION">Reversión</option><option value="BACKFILL">Historial incorporado</option>
            </select>
          </label>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Cuenta
            <select name="cuentaId" [ngModel]="filtroCuentaId()?.toString() ?? ''" (ngModelChange)="onCuentaFiltroChange($event)" class="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">Todas</option>
              @for (cuenta of cuentas(); track cuenta.id) { <option [value]="cuenta.id">{{ nombreCuentaVisible(cuenta.nombre) }} · {{ cuenta.moneda }}</option> }
            </select>
          </label>
        </div>
        <div class="mt-3 flex flex-wrap justify-end gap-2">
          @if (tieneFiltros()) { <button type="button" (click)="limpiarFiltros()" class="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Limpiar</button> }
          <button type="submit" [disabled]="cargando()" class="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{{ cargando() ? 'Buscando…' : 'Aplicar filtros' }}</button>
        </div>
      </form>

      <details class="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
        <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-semibold text-slate-800 marker:hidden hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-100 dark:hover:bg-slate-800 sm:px-5">
          <span>Historial anterior</span>
          <span class="text-xs font-medium text-slate-500">Revisar y conciliar</span>
        </summary>
      <section aria-labelledby="historial-title" class="border-t border-slate-200 p-4 dark:border-slate-700 sm:p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="historial-title" class="text-base font-bold text-slate-900">Incorporar movimientos disponibles</h2>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Revisa los movimientos antiguos que todavía existen y agrega sus asientos en lotes de hasta 100.
              Esto no cambia los saldos de tus cuentas.
            </p>
          </div>
          <button type="button" (click)="revisarBackfill()" [attr.aria-busy]="cargandoBackfill()" [disabled]="cargandoBackfill() || procesandoBackfill()"
            class="min-h-11 shrink-0 rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
            {{ cargandoBackfill() ? 'Revisando...' : (backfill() ? 'Actualizar revisión' : 'Revisar historial') }}
          </button>
        </div>

        @if (errorBackfill()) {
          <p role="alert" class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ errorBackfill() }}</p>
        }

        @if (backfill(); as resumen) {
          <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="rounded-lg bg-slate-50 p-3"><p class="text-xs text-slate-500">Disponibles</p><p class="mt-1 font-bold text-slate-900">{{ resumen.movimientosEncontrados }}</p></div>
            <div class="rounded-lg bg-emerald-50 p-3"><p class="text-xs text-emerald-800">Pendientes</p><p class="mt-1 font-bold text-emerald-900">{{ resumen.pendientes }}</p></div>
            <div class="rounded-lg bg-slate-50 p-3"><p class="text-xs text-slate-500">Ya contabilizados</p><p class="mt-1 font-bold text-slate-900">{{ resumen.yaContabilizados }}</p></div>
            <div class="rounded-lg bg-amber-50 p-3"><p class="text-xs text-amber-800">Omitidos</p><p class="mt-1 font-bold text-amber-900">{{ resumen.omitidos }}</p></div>
          </div>

          @if (resumen.pendientes > 0) {
            <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p class="font-semibold">Antes de continuar</p>
              <p class="mt-1">Se registrará el estado actual de cada movimiento disponible. Este proceso no reconstruye ediciones anteriores ni movimientos eliminados. Los nuevos asientos aparecerán como “Historial incorporadoâ€.</p>
              <label class="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" [checked]="confirmarBackfill()" (change)="confirmarBackfill.set($any($event.target).checked)"
                  class="mt-1 size-4 accent-emerald-700" />
                <span>Entiendo que se añadirán asientos al libro y que los saldos operativos no cambiarán.</span>
              </label>
              <button type="button" (click)="procesarBackfill()" [attr.aria-busy]="procesandoBackfill()"
                [disabled]="!confirmarBackfill() || procesandoBackfill()"
                class="mt-3 min-h-11 rounded-xl bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                {{ procesandoBackfill() ? 'Agregando lote...' : 'Agregar hasta 100 movimientos' }}
              </button>
              @if (resumen.procesados > 0) {
                <p role="status" class="mt-3 font-medium">Se agregaron {{ resumen.procesados }} asientos. Quedan {{ resumen.pendientesDespues }} pendientes compatibles.</p>
              }
            </div>
          } @else if (resumen.omitidos === 0) {
            <p role="status" class="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Todo el historial disponible ya está incorporado al libro diario.</p>
          }

          @if (Object.keys(resumen.conciliacion).length > 0) {
            <div class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[26rem] text-left text-sm">
                <caption class="pb-2 text-left font-semibold text-slate-800">Conciliación de los movimientos pendientes por moneda</caption>
                <thead class="text-xs uppercase text-slate-500"><tr><th scope="col" class="py-2">Moneda</th><th scope="col" class="py-2 text-right">Debe</th><th scope="col" class="py-2 text-right">Haber</th><th scope="col" class="py-2 text-right">Diferencia</th></tr></thead>
                <tbody class="divide-y divide-slate-100">
                  @for (moneda of Object.keys(resumen.conciliacion); track moneda) {
                    <tr><th scope="row" class="py-2 font-medium">{{ moneda }}</th><td class="py-2 text-right tabular-nums">{{ resumen.conciliacion[moneda].debe | monto:moneda:'symbol':'1.2-2' }}</td><td class="py-2 text-right tabular-nums">{{ resumen.conciliacion[moneda].haber | monto:moneda:'symbol':'1.2-2' }}</td><td class="py-2 text-right font-semibold tabular-nums">{{ resumen.conciliacion[moneda].diferencia | monto:moneda:'symbol':'1.2-2' }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @if (resumen.conciliacionCuentas.length > 0) {
            <div class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[34rem] text-left text-sm">
                <caption class="pb-2 text-left font-semibold text-slate-800">Conciliación guiada por cuenta · revisa movimientos y marca las diferencias atendidas; el marcador es temporal</caption>
                <thead class="text-xs uppercase text-slate-500"><tr><th scope="col" class="py-2">Cuenta</th><th scope="col" class="py-2 text-right">Operativo</th><th scope="col" class="py-2 text-right">Libro proyectado</th><th scope="col" class="py-2 text-right">Diferencia</th><th scope="col" class="py-2 text-right">Revisión</th></tr></thead>
                <tbody class="divide-y divide-slate-100">
                  @for (cuenta of resumen.conciliacionCuentas; track cuenta.cuentaId) {
                    <tr><th scope="row" class="py-2 font-medium">{{ cuenta.cuentaNombre }} <span class="font-normal text-slate-500">· {{ cuenta.moneda }}</span></th><td class="py-2 text-right tabular-nums">{{ cuenta.saldoOperativo | monto:cuenta.moneda:'symbol':'1.2-2' }}</td><td class="py-2 text-right tabular-nums">{{ cuenta.saldoLibroProyectado | monto:cuenta.moneda:'symbol':'1.2-2' }}</td><td class="py-2 text-right font-semibold tabular-nums" [class.text-rose-700]="cuenta.diferencia !== 0" [class.text-emerald-700]="cuenta.diferencia === 0">{{ cuenta.diferencia | monto:cuenta.moneda:'symbol':'1.2-2' }}</td><td class="py-2 text-right">@if (cuenta.diferencia === 0) { <span class="text-xs font-semibold text-emerald-700">Conciliada</span> } @else { <div class="flex min-w-44 flex-col items-end gap-1"><a routerLink="/transacciones" [queryParams]="{ cuentaId: cuenta.cuentaId }" class="inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-semibold text-emerald-800 underline hover:bg-emerald-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300">Revisar movimientos</a><button type="button" [attr.aria-pressed]="cuentaRevisada(cuenta)" [attr.aria-label]="(cuentaRevisada(cuenta) ? 'Desmarcar revisión de ' : 'Marcar como revisada: ') + cuenta.cuentaNombre" (click)="alternarRevisionCuenta(cuenta)" class="min-h-10 rounded-lg px-2 text-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600" [class.text-emerald-800]="cuentaRevisada(cuenta)" [class.text-slate-600]="!cuentaRevisada(cuenta)">{{ cuentaRevisada(cuenta) ? 'Revisada · quitar marca' : 'Marcar revisada' }}</button></div> }</td></tr>
                  }
                </tbody>
              </table>
              <p class="mt-2 text-xs leading-5 text-slate-500">La proyección combina los asientos actuales y los movimientos compatibles pendientes. Las diferencias se muestran para revisión; este proceso no ajusta saldos ni crea partidas de conciliación automáticamente.</p>
            </div>
          }
          @if (resumen.omitidos > 0) {
            <details class="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
              <summary class="min-h-8 cursor-pointer font-semibold text-slate-800">Ver motivos de omisión ({{ resumen.omitidos }})</summary>
              <ul class="mt-2 list-inside list-disc space-y-1 text-slate-600">
                @for (motivo of Object.keys(resumen.motivosOmitidos); track motivo) {
                  <li>{{ motivo }}: {{ resumen.motivosOmitidos[motivo] }}</li>
                }
              </ul>
            </details>
          }
        }
      </section>
      </details>

      @if (error()) {
        <div role="alert" class="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{{ error() }}</span>
          <button type="button" (click)="cargar()" class="self-start font-semibold underline sm:self-auto">Reintentar</button>
        </div>
      } @else if (cargando() && !pagina()) {
        <p role="status" class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Cargando asientos contables...
        </p>
      } @else if (pagina()?.empty) {
        <section class="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-10">
          <h2 class="text-lg font-semibold text-slate-900">Aún no hay asientos contables</h2>
          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Cuando registres un ingreso, gasto, transferencia o saldo inicial, verás aquí sus partidas de Debe y Haber.
          </p>
          <a routerLink="/transacciones" class="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Ver movimientos
          </a>
        </section>
      } @else {
        <section aria-label="Asientos contables" class="space-y-4">
          @for (asiento of pagina()?.content ?? []; track asiento.id) {
            <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <header class="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="break-words text-sm font-bold text-slate-900">{{ (asiento.descripcion) | textoFinanciero }}</h2>
                    @if (asiento.tipoMovimiento) { <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100">{{ etiquetaMovimiento(asiento.tipoMovimiento) }}</span> }
                    <span [class]="claseEvento(asiento.tipoEvento)" class="rounded-full px-2 py-1 text-[11px] font-semibold">
                      {{ etiquetaEvento(asiento.tipoEvento) }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500">
                    Movimiento #{{ asiento.transaccionOrigenId }} · {{ asiento.fechaOperacion | date:'longDate' }}
                  </p>
                  @if (asiento.tipoMovimiento !== 'SALDO_INICIAL' && asiento.tipoEvento !== 'ELIMINACION') {
                    <a routerLink="/transacciones" [queryParams]="{ movimientoId: asiento.transaccionOrigenId }" class="mt-2 inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-semibold text-emerald-800 underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300">Ver movimiento original</a>
                  } @else if (asiento.tipoEvento === 'ELIMINACION') {
                    <span class="mt-2 inline-block text-xs text-slate-500">El movimiento fue eliminado; este asiento conserva su reversión.</span>
                  }
                </div>
                @if (asiento.tasaCambio) {
                  <p class="shrink-0 text-xs text-slate-600">Tipo de cambio: {{ (asiento.tasaCambio | number:'1.0-8') | textoFinanciero }}</p>
                }
              </header>

              <div class="overflow-x-auto">
                <table class="w-full min-w-[30rem] text-left text-sm">
                  <caption class="sr-only">Partidas contables del asiento {{ asiento.id }}</caption>
                  <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" class="px-4 py-3 font-semibold sm:px-5">Cuenta contable</th>
                      <th scope="col" class="px-4 py-3 text-right font-semibold">Debe</th>
                      <th scope="col" class="px-4 py-3 text-right font-semibold sm:px-5">Haber</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (linea of asiento.lineas; track linea.id) {
                      <tr>
                        <th scope="row" class="max-w-56 px-4 py-3 font-medium text-slate-800 sm:max-w-none sm:px-5">
                          <span class="block break-words">{{ linea.nombreCuenta }}</span>
                          <span class="mt-0.5 block text-[11px] font-normal text-slate-500">
                            {{ linea.codigoCuenta }} · {{ linea.moneda }}
                          </span>
                        </th>
                        <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800">
                          {{ linea.lado === 'DEBE' ? (linea.monto | monto:linea.moneda:'symbol':'1.2-2') : '—' }}
                        </td>
                        <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800 sm:px-5">
                          {{ linea.lado === 'HABER' ? (linea.monto | monto:linea.moneda:'symbol':'1.2-2') : '—' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </article>
          }
        </section>

        <nav aria-label="Paginación del libro diario" class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <button type="button" (click)="cambiarPagina(-1)" [disabled]="pagina()?.first || cargando()"
            class="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
            Anterior
          </button>
          <p class="text-center text-xs text-slate-600">
            Página {{ (pagina()?.number ?? 0) + 1 }} de {{ pagina()?.totalPages ?? 1 }}
          </p>
          <button type="button" (click)="cambiarPagina(1)" [disabled]="pagina()?.last || cargando()"
            class="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
            Siguiente
          </button>
        </nav>
      }
    </main>
  `
})
export class LibroDiarioComponent implements OnInit {
  readonly nombreCuentaVisible = nombreCuentaVisible;
  private readonly finanzasService = inject(FinanzasService);

  readonly pagina = signal<PageResponse<AsientoContable> | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly backfill = signal<BackfillLibroDiario | null>(null);
  readonly cargandoBackfill = signal(false);
  readonly procesandoBackfill = signal(false);
  readonly confirmarBackfill = signal(false);
  readonly errorBackfill = signal<string | null>(null);
  readonly Object = Object;
  readonly cuentas = signal<Cuenta[]>([]);
  readonly filtroDesde = signal('');
  readonly filtroHasta = signal('');
  readonly filtroTipoEvento = signal<AsientoContable['tipoEvento'] | ''>('');
  readonly filtroTipoMovimiento = signal<TipoTransaccion | ''>('');
  readonly filtroCuentaId = signal<number | null>(null);
  readonly revisionesCuenta = signal<Record<string, string>>({});
  private paginaSolicitada = 0;

  ngOnInit(): void {
    this.finanzasService.getCuentas(true).subscribe({
      next: response => { if (response.success && response.data) this.cuentas.set(response.data); }
    });
    this.cargar();
  }

  tieneFiltros(): boolean {
    return !!(this.filtroDesde() || this.filtroHasta() || this.filtroTipoEvento()
      || this.filtroTipoMovimiento() || this.filtroCuentaId() != null);
  }

  onCuentaFiltroChange(valor: string): void {
    this.filtroCuentaId.set(valor ? Number(valor) : null);
  }

  cuentaRevisada(cuenta: ConciliacionCuenta): boolean {
    return this.revisionesCuenta()[this.claveCuenta(cuenta)] === this.huellaCuenta(cuenta);
  }

  alternarRevisionCuenta(cuenta: ConciliacionCuenta): void {
    const clave = this.claveCuenta(cuenta);
    const huella = this.huellaCuenta(cuenta);
    this.revisionesCuenta.update(revisiones => {
      const actualizadas = { ...revisiones };
      if (actualizadas[clave] === huella) delete actualizadas[clave];
      else actualizadas[clave] = huella;
      return actualizadas;
    });
  }

  private claveCuenta(cuenta: ConciliacionCuenta): string {
    return `${cuenta.cuentaId}:${cuenta.moneda}`;
  }

  private huellaCuenta(cuenta: ConciliacionCuenta): string {
    return `${cuenta.saldoOperativo}|${cuenta.saldoLibroProyectado}|${cuenta.diferencia}`;
  }

  aplicarFiltros(): void {
    if (this.filtroDesde() && this.filtroHasta() && this.filtroDesde() > this.filtroHasta()) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.paginaSolicitada = 0;
    this.pagina.set(null);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.filtroTipoEvento.set('');
    this.filtroTipoMovimiento.set('');
    this.filtroCuentaId.set(null);
    this.paginaSolicitada = 0;
    this.pagina.set(null);
    this.cargar();
  }

  cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    this.finanzasService.getLibroDiario(this.paginaSolicitada, 20, {
      desde: this.filtroDesde(),
      hasta: this.filtroHasta(),
      tipoEvento: this.filtroTipoEvento(),
      tipoMovimiento: this.filtroTipoMovimiento(),
      cuentaId: this.filtroCuentaId()
    }).subscribe({
      next: response => {
        this.cargando.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudo cargar el libro diario.');
          return;
        }
        this.pagina.set(response.data);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el libro diario.');
      }
    });
  }

  revisarBackfill(): void {
    if (this.cargandoBackfill() || this.procesandoBackfill()) return;
    this.cargandoBackfill.set(true);
    this.errorBackfill.set(null);
    this.finanzasService.getResumenBackfillLibroDiario().subscribe({
      next: response => {
        this.cargandoBackfill.set(false);
        if (!response.success || !response.data) {
          this.errorBackfill.set(response.message || 'No se pudo revisar el historial.');
          return;
        }
        this.backfill.set(response.data);
        this.confirmarBackfill.set(false);
      },
      error: err => {
        this.cargandoBackfill.set(false);
        this.errorBackfill.set(err.error?.message || 'No se pudo revisar el historial.');
      }
    });
  }

  procesarBackfill(): void {
    if (!this.confirmarBackfill() || this.procesandoBackfill()) return;
    this.procesandoBackfill.set(true);
    this.errorBackfill.set(null);
    this.finanzasService.ejecutarBackfillLibroDiario().subscribe({
      next: response => {
        this.procesandoBackfill.set(false);
        if (!response.success || !response.data) {
          this.errorBackfill.set(response.message || 'No se pudo agregar el historial.');
          return;
        }
        this.backfill.set(response.data);
        this.confirmarBackfill.set(false);
        this.paginaSolicitada = 0;
        this.pagina.set(null);
        this.cargar();
      },
      error: err => {
        this.procesandoBackfill.set(false);
        this.errorBackfill.set(err.error?.message || 'No se pudo agregar el historial.');
      }
    });
  }

  cambiarPagina(cambio: number): void {
    const siguiente = this.paginaSolicitada + cambio;
    if (siguiente < 0 || siguiente >= (this.pagina()?.totalPages ?? 0)) return;
    this.paginaSolicitada = siguiente;
    this.cargar();
  }

  etiquetaEvento(evento: AsientoContable['tipoEvento']): string {
    switch (evento) {
      case 'CREACION': return 'Registro';
      case 'SALDO_INICIAL': return 'Saldo inicial';
      case 'ACTUALIZACION': return 'Corrección';
      case 'ELIMINACION': return 'Reversión';
      case 'BACKFILL': return 'Historial incorporado';
    }
  }

  etiquetaMovimiento(tipo: TipoTransaccion): string {
    switch (tipo) {
      case 'INGRESO': return 'Ingreso';
      case 'GASTO': return 'Gasto';
      case 'TRANSFERENCIA': return 'Transferencia';
      case 'SALDO_INICIAL': return 'Saldo inicial';
    }
  }

  claseEvento(evento: AsientoContable['tipoEvento']): string {
    return evento === 'ELIMINACION'
      ? 'bg-rose-50 text-rose-700'
      : evento === 'ACTUALIZACION'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-emerald-50 text-emerald-700';
  }
}
