import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PerfilService } from '../../core/services/perfil.service';
import { CategoriaSelectorComponent } from '../../shared/components/categoria-selector/categoria-selector.component';
import { MovimientoMobileCardComponent } from '../../shared/components/movimiento-mobile-card/movimiento-mobile-card.component';
import { resumenCuentaSelector } from '../../core/utils/cuenta-financiera';
import {
  Categoria,
  Cuenta,
  DashboardAnalitica,
  DashboardComparacion,
  DashboardResumen,
  FrecuenciaRecurrencia,
  PlantillaRecurrente,
  TipoTransaccion,
  TransaccionPayload
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoriaSelectorComponent, MovimientoMobileCardComponent],
  template: `
    <div class="dashboard-motion-scope max-w-7xl mx-auto flex flex-col px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      
      <!-- Encabezado y Saludo -->
      <div class="order-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Resumen Financiero
          </h1>
          <p class="mt-1 inline-flex items-center gap-1.5 text-xs font-medium capitalize text-slate-500" aria-label="Fecha actual">
            <svg aria-hidden="true" class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18" />
            </svg>
            {{ fechaActual }}
          </p>
          <p class="hidden sm:block text-sm text-slate-500 mt-1">
            Hola, {{ authService.currentUser()?.nombre || 'Usuario' }}. Aquí tienes el estado consolidado de tus cuentas.
          </p>
        </div>

        <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <button 
            type="button"
            (click)="abrirModal('GASTO')"
            class="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Movimiento
          </button>
        </div>
      </div>

      <!-- Alertas o Mensaje de Error si la API falla -->
      @if (error()) {
        <div class="order-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-2xl flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-rose-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ error() }}</span>
          </div>
          <button (click)="cargarDashboard()" class="text-xs font-semibold text-rose-800 hover:underline cursor-pointer">
            Reintentar
          </button>
        </div>
      }

      <section class="order-2 lg:order-3" aria-label="Resumen financiero por moneda">
        @if (resumenMonedaSeleccionada(); as moneda) {
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
            <article class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-7 lg:col-span-3">
              <div class="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/10"></div>
              <div class="pointer-events-none absolute -right-2 -top-6 h-32 w-32 rounded-full border border-white/10"></div>
              <div class="relative flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Patrimonio en cuentas</p>
                  <p class="mt-1 text-xs text-slate-300">Balance total disponible</p>
                </div>
                <label class="sr-only" for="dashboard-currency">Moneda del resumen</label>
                <select
                  id="dashboard-currency"
                  [ngModel]="monedaResumen()"
                  (ngModelChange)="monedaResumen.set($event)"
                  class="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-300">
                  @for (codigo of monedasResumen(); track codigo) {
                    <option class="bg-slate-900 text-white" [value]="codigo">{{ codigo }}</option>
                  }
                </select>
              </div>
              <p class="dashboard-summary-amount relative mt-5 min-w-0 break-words text-2xl font-bold tracking-tight sm:text-4xl">
                {{ moneda.balanceTotal | currency:moneda.moneda:'symbol':'1.2-2' }}
              </p>
              <div class="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Flujo neto del mes</p>
                  <p class="dashboard-summary-amount mt-1 min-w-0 break-words text-sm font-bold" [class.text-emerald-300]="moneda.balanceMes >= 0" [class.text-rose-300]="moneda.balanceMes < 0">
                    {{ moneda.balanceMes | currency:moneda.moneda:'symbol':'1.2-2' }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Cuentas activas</p>
                  <p class="mt-1 text-sm font-bold text-white">{{ moneda.totalCuentas }}</p>
                </div>
              </div>
            </article>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
              <article class="rounded-2xl border border-emerald-100 bg-white p-3 shadow-xs sm:p-5">
                <div class="flex items-center gap-2">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">↗</span>
                  <p class="text-xs font-semibold text-slate-500">Ingresos del mes</p>
                </div>
                <p class="dashboard-summary-amount mt-3 min-w-0 break-words text-base font-bold text-emerald-700 sm:text-2xl">
                  {{ moneda.ingresosMes | currency:moneda.moneda:'symbol':'1.2-2' }}
                </p>
              </article>
              <article class="rounded-2xl border border-rose-100 bg-white p-3 shadow-xs sm:p-5">
                <div class="flex items-center gap-2">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-lg font-bold text-rose-700">↘</span>
                  <p class="text-xs font-semibold text-slate-500">Gastos del mes</p>
                </div>
                <p class="dashboard-summary-amount mt-3 min-w-0 break-words text-base font-bold text-rose-700 sm:text-2xl">
                  {{ moneda.gastosMes | currency:moneda.moneda:'symbol':'1.2-2' }}
                </p>
                <p class="mt-1 text-xs text-slate-500">Ahorro: {{ moneda.tasaAhorro | number:'1.1-1' }}%</p>
              </article>
            </div>
          </div>
          <article class="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:mt-4 sm:p-5" aria-live="polite">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-sm font-bold text-slate-900">Comparación de gastos</h2>
                @if (comparacion()) {
                  <p class="mt-1 text-xs text-slate-500">
                    {{ periodoTexto(comparacion()!.mes, comparacion()!.anio) }}
                    frente a {{ periodoTexto(comparacion()!.mesAnterior, comparacion()!.anioAnterior) }}
                    · {{ moneda.moneda }}
                  </p>
                }
              </div>
              @if (comparacionCargando()) {
                <p role="status" class="text-xs text-slate-500">Cargando comparación...</p>
              } @else if (comparacionError()) {
                <div class="flex items-center gap-2 text-xs text-rose-700">
                  <span role="alert">{{ comparacionError() }}</span>
                  <button type="button" (click)="cargarComparacion()" class="font-semibold underline">Reintentar</button>
                </div>
              } @else if (comparacionMonedaSeleccionada(); as comparacionMoneda) {
                <div class="grid grid-cols-2 gap-4 sm:min-w-80">
                  <div>
                    <p class="text-xs font-medium text-slate-500">Mes anterior</p>
                    <p class="mt-1 text-sm font-bold text-slate-800">
                      {{ comparacionMoneda.gastosAnteriores | currency:moneda.moneda:'symbol':'1.2-2' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-slate-500">Mes actual</p>
                    <p class="mt-1 text-sm font-bold text-slate-800">
                      {{ comparacionMoneda.gastosActuales | currency:moneda.moneda:'symbol':'1.2-2' }}
                    </p>
                  </div>
                  <p class="col-span-2 text-xs font-semibold"
                     [class.text-rose-700]="comparacionMoneda.variacionGastos > 0"
                     [class.text-emerald-700]="comparacionMoneda.variacionGastos <= 0">
                    @if (comparacionMoneda.variacionGastos > 0) {
                      Gastaste {{ comparacionMoneda.variacionGastos | currency:moneda.moneda:'symbol':'1.2-2' }} más
                    } @else if (comparacionMoneda.variacionGastos < 0) {
                      Gastaste {{ -comparacionMoneda.variacionGastos | currency:moneda.moneda:'symbol':'1.2-2' }} menos
                    } @else {
                      Tus gastos se mantuvieron iguales
                    }
                    @if (comparacionMoneda.variacionGastosPorcentaje !== null) {
                      ({{ comparacionMoneda.variacionGastosPorcentaje | number:'1.0-1' }}%)
                    } @else {
                      (sin base previa para calcular porcentaje)
                    }
                  </p>
                </div>
              }
            </div>
          </article>
        } @else if (!loading()) {
          <p class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Agrega una cuenta para ver tu resumen financiero.</p>
        } @else {
          <div class="h-36 animate-pulse rounded-3xl bg-slate-200"></div>
        }
      </section>

      @if (errorRecurrencias()) {
        <div role="alert" class="order-3 flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{{ errorRecurrencias() }}</span>
          <button type="button" (click)="cargarRecurrencias()" class="self-start font-semibold underline sm:self-auto">Reintentar</button>
        </div>
      } @else if (plantillasPorAtender().length > 0) {
        <section class="order-3 space-y-3" aria-label="Recordatorios de movimientos recurrentes">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-slate-900">Próximos movimientos</h2>
              <p class="mt-1 text-xs text-slate-500">Te avisamos aquí; Kaptal no registra cargos automáticamente.</p>
            </div>
            <button type="button" (click)="irAConfiguracion()" class="min-h-10 rounded-lg px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              Ver recurrencias
            </button>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            @for (plantilla of plantillasPorAtender(); track plantilla.id) {
              <article class="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
                <div class="min-w-0">
                  <p class="break-words text-sm font-semibold text-slate-900">
                    {{ plantilla.categoriaNombre || (plantilla.tipo === 'INGRESO' ? 'Ingreso recurrente' : 'Gasto recurrente') }}
                  </p>
                  <p class="mt-1 text-sm font-bold text-slate-800">
                    {{ plantilla.monto | currency:plantilla.moneda:'symbol':'1.2-2' }} · {{ plantilla.cuentaNombre }}
                  </p>
                  <p class="mt-1 text-xs font-medium text-amber-900">
                    {{ plantilla.siguienteFecha <= fechaHoy() ? 'Pendiente de confirmar' : 'Próximo movimiento' }} · {{ plantilla.siguienteFecha }}
                  </p>
                </div>
                @if (plantilla.siguienteFecha <= fechaHoy()) {
                  <button
                    type="button"
                    (click)="registrarRecurrente(plantilla)"
                    [disabled]="registrandoRecurrenciaId() === plantilla.id"
                    class="min-h-10 shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                    {{ registrandoRecurrenciaId() === plantilla.id ? 'Registrando...' : 'Confirmar movimiento' }}
                  </button>
                }
              </article>
            }
          </div>
        </section>
      }

      <section class="order-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:order-6" aria-label="Últimos movimientos">
        <div class="border-b border-slate-100 p-4 sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="min-w-0 text-base font-bold text-slate-900">Últimos movimientos</h2>
            <button
              type="button"
              (click)="irATransacciones()"
              class="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 sm:gap-2 sm:px-4">
              Ver más
              <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.24a.75.75 0 010 1.06l-4.25 4.24a.75.75 0 01-1.06 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <p class="mt-0.5 hidden text-xs text-slate-500 sm:block">Tus transacciones más recientes</p>
        </div>
        @if (loading()) {
          <div class="flex items-center justify-center gap-2 p-8 text-sm text-slate-400">
            <span class="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></span>
            Cargando movimientos...
          </div>
        } @else if ((resumen()?.ultimosMovimientos?.length || 0) === 0) {
          <div class="space-y-3 p-8 text-center text-sm text-slate-500">
            <p>Aún no tienes movimientos registrados.</p>
            <button type="button" (click)="abrirModal('GASTO')" class="font-semibold text-emerald-700 hover:underline">
              Registrar tu primer movimiento
            </button>
          </div>
        } @else {
          <div class="space-y-3 p-3 sm:p-5" aria-label="Lista de últimos movimientos">
            @for (m of resumen()?.ultimosMovimientos; track m.id) {
              <app-movimiento-mobile-card
                [movimiento]="m"
                (editar)="editarMovimiento($event.id)"
                (eliminar)="eliminarMovimiento($event)" />
            }
          </div>
        }
      </section>

      <!-- Analítica de gastos e ingresos -->
      <section aria-label="Analítica financiera" class="order-5 space-y-3 lg:order-4">
        <p role="status" aria-live="polite" aria-atomic="true" class="sr-only">
          {{ analiticaLoading() ? 'Cargando analítica financiera.' : '' }}
        </p>
        <p role="alert" aria-live="assertive" aria-atomic="true" class="sr-only">
          {{ analiticaError() || '' }}
        </p>
        <button
          type="button"
          (click)="analiticaMovilAbierta.update(abierta => !abierta)"
          [attr.aria-expanded]="analiticaMovilAbierta()"
          aria-controls="dashboard-analytics-content"
          class="flex min-h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs lg:hidden">
          <span>Analítica financiera</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" [class.rotate-180]="analiticaMovilAbierta()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div id="dashboard-analytics-content" class="dashboard-analytics-content" [class.is-open]="analiticaMovilAbierta()">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <article class="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="mb-6">
            <h2 class="text-base font-bold text-slate-900">Gastos por categoría</h2>
            <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-slate-500">Distribución del mes actual</p>
              <select
                aria-label="Moneda de la analítica"
                [ngModel]="monedaAnalitica()"
                (ngModelChange)="monedaAnalitica.set($event)"
                class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                @for (moneda of monedasAnalitica(); track moneda) {
                  <option [value]="moneda">{{ moneda }}</option>
                }
              </select>
            </div>
          </div>

          @if (analiticaLoading()) {
            <div aria-hidden="true" class="h-52 flex items-center justify-center text-sm text-slate-400">
              <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Cargando analítica...
            </div>
          } @else if (analiticaError()) {
            <div class="h-52 flex flex-col items-center justify-center gap-2 text-center">
              <p aria-hidden="true" class="text-sm text-rose-600">{{ analiticaError() }}</p>
              <button type="button" (click)="cargarAnalitica()" class="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Reintentar
              </button>
            </div>
          } @else if (gastosTotales() === 0) {
            <div class="h-52 flex items-center justify-center text-sm text-slate-400">
              No hay gastos registrados este mes.
            </div>
          } @else {
            <div class="flex flex-col sm:flex-row items-center justify-center gap-7">
              <div
                class="w-44 h-44 rounded-full flex items-center justify-center shrink-0"
                role="img"
                [attr.aria-label]="'Distribución de gastos en ' + monedaAnalitica() + '. Total: ' + (gastosTotales() | currency:monedaAnalitica():'symbol':'1.2-2')"
                [style.background]="donutGradient()">
                <div class="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center text-center">
                  <span class="text-[11px] uppercase tracking-wide text-slate-400">Total</span>
                  <span class="text-sm font-bold text-slate-900">{{ gastosTotales() | currency:monedaAnalitica():'symbol':'1.0-0' }}</span>
                </div>
              </div>
              <ul aria-label="Gastos por categoría e importe" class="w-full space-y-3">
                @for (categoria of gastosPorCategoria(); track categoria.categoriaId ?? categoria.categoriaNombre; let i = $index) {
                  <li class="flex items-center justify-between gap-3 text-xs">
                    <span class="flex items-center gap-2 min-w-0 text-slate-600">
                      <span aria-hidden="true" class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="colorCategoria(categoria, i)"></span>
                      <span class="truncate">{{ categoria.categoriaNombre }}</span>
                    </span>
                    <span class="font-semibold text-slate-800 whitespace-nowrap">
                      {{ categoria.monto | currency:monedaAnalitica():'symbol':'1.2-2' }}
                      <span class="font-normal text-slate-400">({{ categoria.monto / gastosTotales() | percent:'1.0-0' }})</span>
                    </span>
                  </li>
                }
              </ul>
            </div>
          }
        </article>

        <article class="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="mb-6">
            <h2 class="text-base font-bold text-slate-900">Ingresos vs. gastos</h2>
            <p class="text-xs text-slate-500 mt-1">Comparativo de los últimos seis meses</p>
          </div>

          @if (analiticaLoading()) {
            <div aria-hidden="true" class="h-52 flex items-center justify-center text-sm text-slate-400">
              <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Cargando analítica...
            </div>
          } @else if (analiticaError()) {
            <div class="h-52 flex flex-col items-center justify-center gap-2 text-center">
              <p aria-hidden="true" class="text-sm text-rose-600">{{ analiticaError() }}</p>
              <button type="button" (click)="cargarAnalitica()" class="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Reintentar
              </button>
            </div>
          } @else {
            <div aria-hidden="true" class="flex items-center justify-center gap-5 text-xs text-slate-500 mb-3">
              <span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>Ingresos</span>
              <span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>Gastos</span>
            </div>
            <div aria-hidden="true" class="h-44 flex items-end justify-around gap-2 border-b border-slate-100 px-1">
              @for (mes of barrasMensuales(); track mes.anio + '-' + mes.mes) {
                <div class="flex-1 h-full flex flex-col justify-end items-center min-w-0">
                  <div class="w-full max-w-12 flex items-end justify-center gap-1 h-full">
                    <div
                      class="w-3 sm:w-4 bg-emerald-500 rounded-t-sm transition-[height]"
                      [style.height.%]="mes.ingresosAltura"
                      [title]="'Ingresos: ' + (mes.ingresos | number:'1.2-2') + ' ' + monedaAnalitica()">
                    </div>
                    <div
                      class="w-3 sm:w-4 bg-rose-500 rounded-t-sm transition-[height]"
                      [style.height.%]="mes.gastosAltura"
                      [title]="'Gastos: ' + (mes.gastos | number:'1.2-2') + ' ' + monedaAnalitica()">
                    </div>
                  </div>
                  <span class="mt-2 text-[11px] sm:text-xs text-slate-500 capitalize">{{ mes.etiqueta }}</span>
                </div>
              }
            </div>
            <table class="sr-only">
              <caption>Ingresos y gastos de los últimos seis meses, en {{ monedaAnalitica() }}</caption>
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col">Ingresos</th>
                  <th scope="col">Gastos</th>
                </tr>
              </thead>
              <tbody>
                @for (mes of barrasMensuales(); track mes.anio + '-' + mes.mes) {
                  <tr>
                    <th scope="row">{{ mes.etiqueta }} {{ mes.anio }}</th>
                    <td>{{ mes.ingresos | currency:monedaAnalitica():'symbol':'1.2-2' }}</td>
                    <td>{{ mes.gastos | currency:monedaAnalitica():'symbol':'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </article>
          </div>
        </div>
      </section>

    </div>

    <!-- Modal Interactivo 'Nuevo Movimiento' -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-slate-900/60 px-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xs sm:items-center sm:p-4">
        <div #movementDialog tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="dashboard-movement-title" class="dashboard-motion-scope dashboard-movement-dialog flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-h-[min(90dvh,48rem)] sm:max-w-lg sm:rounded-3xl">
          
          <!-- Encabezado del Modal con Selector de Tipo -->
          <div class="shrink-0 border-b border-slate-100 p-4 sm:p-6">
            <div class="flex items-center justify-between gap-3 pb-3 sm:pb-4">
              <h2 id="dashboard-movement-title" class="text-base font-bold text-slate-900 sm:text-lg">Registrar Movimiento</h2>
              <button 
                type="button"
                (click)="cerrarModal()" 
                aria-label="Cerrar formulario de movimiento"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Tabs de Tipo de Transacción -->
            <div role="group" aria-label="Tipo de movimiento" class="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 text-[11px] font-semibold sm:gap-2 sm:text-xs">
              <button 
                type="button"
                (click)="cambiarTipo('GASTO')"
                [attr.aria-pressed]="formTipo() === 'GASTO'"
                [class]="formTipo() === 'GASTO' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="min-h-10 rounded-lg px-1 py-2 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:min-h-11">
                Gasto
              </button>
              <button 
                type="button"
                (click)="cambiarTipo('INGRESO')"
                [attr.aria-pressed]="formTipo() === 'INGRESO'"
                [class]="formTipo() === 'INGRESO' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="min-h-10 rounded-lg px-1 py-2 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:min-h-11">
                Ingreso
              </button>
              <button 
                type="button"
                (click)="cambiarTipo('TRANSFERENCIA')"
                [attr.aria-pressed]="formTipo() === 'TRANSFERENCIA'"
                [class]="formTipo() === 'TRANSFERENCIA' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="min-h-10 rounded-lg px-1 py-2 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:min-h-11">
                Transferencia
              </button>
            </div>
          </div>

          <!-- Formulario -->
          <form (ngSubmit)="guardarMovimiento()" class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:space-y-4 sm:p-6 sm:pb-8">
            
            @if (modalError()) {
              <div role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {{ modalError() }}
              </div>
            }

            <!-- Monto -->
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <label for="monto" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Monto
                </label>
                <span class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <span class="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Moneda</span>
                  {{ monedaCuenta(formCuentaId) }}
                </span>
              </div>
              <input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  [(ngModel)]="formMonto"
                  name="monto"
                  placeholder="0.00"
                  class="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
            </div>

            @if (formTipo() !== 'TRANSFERENCIA') {
              <div>
                @defer (on immediate) {
                  <app-categoria-selector
                    [categorias]="categorias()"
                    [tipo]="formTipo()"
                    [selectedId]="formCategoriaId"
                    (selectedIdChange)="formCategoriaId = $event"
                    (categoriasChange)="categorias.set($event)" />
                } @placeholder {
                  <div class="h-20 animate-pulse rounded-xl bg-slate-100"></div>
                }
              </div>
            }

            <!-- Cuentas (Origen y Destino si es transferencia) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="cuentaId" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {{ formTipo() === 'TRANSFERENCIA' ? 'Cuenta Origen' : 'Cuenta' }}
                </label>
                <select
                  id="cuentaId"
                  required
                  [(ngModel)]="formCuentaId"
                  name="cuentaId"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer">
                  @for (c of cuentas(); track c.id) {
                    <option [ngValue]="c.id">
                      {{ c.nombre }} ({{ resumenCuentaSelector(c) }})
                    </option>
                  }
                </select>
              </div>

              @if (formTipo() === 'TRANSFERENCIA') {
                <div>
                  <label for="cuentaDestinoId" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cuenta Destino
                  </label>
                  <select
                    id="cuentaDestinoId"
                    required
                    [(ngModel)]="formCuentaDestinoId"
                    name="cuentaDestinoId"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer">
                    @for (c of cuentas(); track c.id) {
                      @if (c.id !== formCuentaId) {
                        <option [ngValue]="c.id">
                          {{ c.nombre }} ({{ resumenCuentaSelector(c) }})
                        </option>
                      }
                    }
                  </select>
                  @if (monedaCuenta(formCuentaId) !== monedaCuenta(formCuentaDestinoId)) {
                    <div class="mt-4">
                      <label for="dashboard-tasa-cambio" class="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tasa de cambio (1 {{ monedaCuenta(formCuentaId) }} = ? {{ monedaCuenta(formCuentaDestinoId) }})
                      </label>
                      <input
                        id="dashboard-tasa-cambio"
                        type="number"
                        name="tasaCambio"
                        min="0.00000001"
                        step="0.00000001"
                        required
                        [(ngModel)]="formTasaCambio"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ej. 17.25" />
                      @if (formMonto && formTasaCambio && formTasaCambio > 0) {
                        <p class="mt-1 text-xs text-slate-500">
                          Se depositarán {{ formMonto * formTasaCambio | currency:monedaCuenta(formCuentaDestinoId):'symbol':'1.2-2' }}.
                        </p>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Fecha y notas -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="fecha" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  required
                  [(ngModel)]="formFecha"
                  (ngModelChange)="actualizarSiguienteFecha()"
                  name="fecha"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label for="notas" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  id="notas"
                  rows="2"
                  [(ngModel)]="formNotas"
                  name="notas"
                  placeholder="Agrega un detalle si lo necesitas..."
                  class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none">
                </textarea>
              </div>
            </div>

            @if (formTipo() !== 'TRANSFERENCIA') {
              <section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label class="flex min-h-10 cursor-pointer items-center gap-3">
                  <input type="checkbox" name="movimientoRecurrente" [(ngModel)]="movimientoRecurrente"
                         (ngModelChange)="actualizarSiguienteFecha()"
                         class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span>
                    <span class="block text-sm font-semibold text-slate-800">Repetir este movimiento</span>
                    <span class="block text-xs text-slate-500">Se guardará como plantilla; confirmarás cada cargo en su fecha.</span>
                  </span>
                </label>
                @if (movimientoRecurrente) {
                  <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label class="block text-xs font-semibold text-slate-700">
                      Frecuencia
                      <select name="frecuenciaRecurrencia" [(ngModel)]="frecuenciaRecurrencia"
                              (ngModelChange)="actualizarSiguienteFecha()"
                              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
                        <option value="SEMANAL">Cada semana</option>
                        <option value="QUINCENAL">Cada dos semanas</option>
                        <option value="MENSUAL">Cada mes</option>
                        <option value="ANUAL">Cada año</option>
                      </select>
                    </label>
                    <label class="block text-xs font-semibold text-slate-700">
                      Siguiente fecha
                      <input id="siguienteFechaRecurrencia" name="siguienteFechaRecurrencia" type="date"
                             [(ngModel)]="siguienteFechaRecurrencia" [min]="formFecha" required
                             class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" />
                    </label>
                  </div>
                }
              </section>
            }

            <!-- Botones de Acción -->
            <div class="grid grid-cols-1 gap-2 border-t border-slate-100 bg-white pt-4 sm:flex sm:items-center sm:justify-end sm:space-x-3">
              <button
                type="button"
                (click)="cerrarModal()"
                class="min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:w-auto">
                Cancelar
              </button>
              
              <button
                type="submit"
                [disabled]="submitting()"
                class="inline-flex min-h-11 w-full items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer sm:w-auto">
                @if (submitting()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                } @else {
                  <span>Guardar Movimiento</span>
                }
              </button>
            </div>

          </form>

        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly perfilService = inject(PerfilService);
  private readonly document = inject(DOCUMENT);
  readonly resumenCuentaSelector = resumenCuentaSelector;
  private monedaPreferidaAplicada = false;
  private elementoConFocoPrevio: HTMLElement | null = null;
  private elementoDialogo: HTMLDivElement | null = null;

  @ViewChild('movementDialog')
  set movementDialog(element: ElementRef<HTMLDivElement> | undefined) {
    if (element) {
      this.elementoDialogo = element.nativeElement;
      const monto = element.nativeElement.querySelector<HTMLElement>('#monto');
      (monto ?? element.nativeElement).focus();
      return;
    }

    this.elementoDialogo = null;
    if (!this.modalAbierto()) {
      const previousFocus = this.elementoConFocoPrevio;
      this.elementoConFocoPrevio = null;
      if (previousFocus?.isConnected) previousFocus.focus();
    }
  }

  readonly fechaActual = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Estados reactivos con Signals
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  resumen = signal<DashboardResumen | null>(null);
  analiticaLoading = signal<boolean>(true);
  analiticaError = signal<string | null>(null);
  analitica = signal<DashboardAnalitica | null>(null);
  comparacion = signal<DashboardComparacion | null>(null);
  comparacionCargando = signal(false);
  comparacionError = signal<string | null>(null);
  readonly plantillasRecurrentes = signal<PlantillaRecurrente[]>([]);
  readonly errorRecurrencias = signal<string | null>(null);
  readonly registrandoRecurrenciaId = signal<number | null>(null);
  readonly fechaHoy = signal(this.fechaLocal(new Date()));
  readonly fechaLimiteRecurrencias = computed(() => this.agregarDias(this.fechaHoy(), 7));
  readonly analiticaMovilAbierta = signal(false);
  readonly monedaResumen = signal('MXN');
  monedaAnalitica = signal('MXN');
  readonly monedasResumen = computed(() =>
    (this.resumen()?.resumenPorMoneda ?? []).map(item => item.moneda).sort()
  );
  readonly resumenMonedaSeleccionada = computed(() =>
    this.resumen()?.resumenPorMoneda.find(item => item.moneda === this.monedaResumen()) ?? null
  );
  readonly comparacionMonedaSeleccionada = computed(() =>
    this.comparacion()?.porMoneda.find(item => item.moneda === this.monedaResumen()) ?? null
  );
  readonly plantillasPorAtender = computed(() =>
    this.plantillasRecurrentes().filter(plantilla =>
      plantilla.activa
      && plantilla.siguienteFecha >= this.fechaHoy()
      && plantilla.siguienteFecha <= this.fechaLimiteRecurrencias()
    )
  );

  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);

  // Estados del modal
  modalAbierto = signal<boolean>(false);
  submitting = signal<boolean>(false);
  modalError = signal<string | null>(null);

  // Campos del formulario
  formTipo = signal<TipoTransaccion>('GASTO');
  formMonto: number | null = null;
  formCuentaId: number | null = null;
  formCuentaDestinoId: number | null = null;
  formTasaCambio: number | null = null;
  formCategoriaId: number | null = null;
  formFecha = new Date().toISOString().split('T')[0];
  formNotas = '';
  movimientoRecurrente = false;
  frecuenciaRecurrencia: FrecuenciaRecurrencia = 'MENSUAL';
  siguienteFechaRecurrencia = '';

  categoriasFiltradas = computed(() => {
    const tipo = this.formTipo();
    return this.categorias().filter(c => c.tipo === tipo);
    effect(() => {
      const perfil = this.perfilService.perfil();
      if (this.monedaPreferidaAplicada || !perfil || !this.monedasResumen().includes(perfil.monedaPredeterminada)) return;
      this.monedaResumen.set(perfil.monedaPredeterminada);
      this.monedaPreferidaAplicada = true;
    });
  });

  monedaCuenta(id: number | null): string {
    return this.cuentas().find(cuenta => cuenta.id === id)?.moneda ?? 'MXN';
  }

  gastosTotales = computed(() =>
    this.gastosPorCategoria().reduce((total, categoria) => total + categoria.monto, 0)
  );

  monedasAnalitica = computed(() => {
    const currencies = new Set([
      ...(this.analitica()?.gastosPorCategoria.map(item => item.moneda) ?? []),
      ...(this.analitica()?.ultimosSeisMeses.map(item => item.moneda) ?? [])
    ]);
    return [...currencies].sort();
  });

  gastosPorCategoria = computed(() =>
    (this.analitica()?.gastosPorCategoria ?? []).filter(item => item.moneda === this.monedaAnalitica())
  );

  barrasMensuales = computed(() => {
    const meses = (this.analitica()?.ultimosSeisMeses ?? [])
      .filter(item => item.moneda === this.monedaAnalitica());
    const maximo = Math.max(1, ...meses.flatMap(mes => [mes.ingresos, mes.gastos]));

    return meses.map(mes => ({
      ...mes,
      etiqueta: new Date(mes.anio, mes.mes - 1, 1)
        .toLocaleDateString('es-MX', { month: 'short' })
        .replace('.', ''),
      ingresosAltura: mes.ingresos > 0 ? mes.ingresos / maximo * 100 : 0,
      gastosAltura: mes.gastos > 0 ? mes.gastos / maximo * 100 : 0
    }));
  });

  donutGradient = computed(() => {
    const categorias = this.gastosPorCategoria();
    const total = this.gastosTotales();
    if (total <= 0) return 'conic-gradient(#e2e8f0 0% 100%)';

    let inicio = 0;
    const segmentos = categorias.map((categoria, indice) => {
      const fin = inicio + categoria.monto / total * 100;
      const segmento = `${this.colorCategoria(categoria, indice)} ${inicio}% ${fin}%`;
      inicio = fin;
      return segmento;
    });
    return `conic-gradient(${segmentos.join(', ')})`;
  });

  constructor() {
    effect(() => {
      const perfil = this.perfilService.perfil();
      if (this.monedaPreferidaAplicada || !perfil || !this.monedasResumen().includes(perfil.monedaPredeterminada)) return;
      this.monedaResumen.set(perfil.monedaPredeterminada);
      this.monedaPreferidaAplicada = true;
    });
  }

  ngOnInit(): void {
    this.cargarDashboard();
    this.cargarCuentasYCategorias();
  }

  cargarDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.cargarAnalitica();
    this.cargarComparacion();
    this.cargarRecurrencias();

    this.finanzasService.getDashboardResumen().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.resumen.set(res.data);
          if (!res.data.resumenPorMoneda.some(item => item.moneda === this.monedaResumen())) {
            this.monedaResumen.set(
              res.data.resumenPorMoneda.find(item => item.moneda === 'MXN')?.moneda
                ?? res.data.resumenPorMoneda[0]?.moneda
                ?? 'MXN'
            );
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar el resumen financiero. Verifica que el backend esté en ejecución.');
        this.loading.set(false);
      }
    });
  }

  cargarAnalitica(): void {
    this.analiticaLoading.set(true);
    this.analiticaError.set(null);

    this.finanzasService.getDashboardAnalitica().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.analitica.set(res.data);
          const currencies = new Set([
            ...res.data.gastosPorCategoria.map(item => item.moneda),
            ...res.data.ultimosSeisMeses.map(item => item.moneda)
          ]);
          if (!currencies.has(this.monedaAnalitica()) && currencies.size > 0) {
            this.monedaAnalitica.set(currencies.has('MXN') ? 'MXN' : [...currencies].sort()[0]);
          }
        } else {
          this.analiticaError.set('No se pudo cargar la analítica financiera.');
        }
        this.analiticaLoading.set(false);
      },
      error: () => {
        this.analiticaError.set('No se pudo cargar la analítica financiera.');
        this.analiticaLoading.set(false);
      }
    });
  }

  cargarComparacion(): void {
    this.comparacionCargando.set(true);
    this.comparacionError.set(null);
    this.finanzasService.getDashboardComparacion().subscribe({
      next: response => {
        this.comparacionCargando.set(false);
        if (!response.success || !response.data) {
          this.comparacionError.set(response.message || 'No se pudo cargar la comparación.');
          return;
        }
        this.comparacion.set(response.data);
      },
      error: () => {
        this.comparacionCargando.set(false);
        this.comparacionError.set('No se pudo cargar la comparación de gastos.');
      }
    });
  }

  periodoTexto(mes: number, anio: number): string {
    return new Date(anio, mes - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  cargarRecurrencias(): void {
    this.errorRecurrencias.set(null);
    this.finanzasService.getPlantillasRecurrentes().subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorRecurrencias.set(response.message || 'No se pudieron cargar los próximos movimientos.');
          return;
        }
        this.plantillasRecurrentes.set(response.data);
      },
      error: err => {
        this.errorRecurrencias.set(err.error?.message || 'No se pudieron cargar los próximos movimientos.');
      }
    });
  }

  registrarRecurrente(plantilla: PlantillaRecurrente): void {
    if (this.registrandoRecurrenciaId() !== null) return;
    this.registrandoRecurrenciaId.set(plantilla.id);
    this.finanzasService.registrarMovimientoRecurrente(plantilla.id).subscribe({
      next: response => {
        this.registrandoRecurrenciaId.set(null);
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo confirmar el movimiento recurrente.');
          return;
        }
        this.toastService.success('Movimiento recurrente confirmado y registrado.');
        this.cargarDashboard();
        this.cargarCuentasYCategorias();
      },
      error: err => {
        this.registrandoRecurrenciaId.set(null);
        this.toastService.error(err.error?.message || 'No se pudo confirmar el movimiento recurrente.');
      }
    });
  }

  irAConfiguracion(): void {
    this.router.navigate(['/configuracion']);
  }

  private fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private agregarDias(fechaISO: string, dias: number): string {
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    return this.fechaLocal(new Date(anio, mes - 1, dia + dias));
  }

  colorCategoria(categoria: DashboardAnalitica['gastosPorCategoria'][number], indice: number): string {
    const color = categoria.categoriaColor;
    return color && /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(color)
      ? color
      : ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#64748b'][indice % 7];
  }

  cargarCuentasYCategorias(): void {
    this.finanzasService.getCuentas().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.cuentas.set(res.data);
          if (res.data.length > 0 && !this.formCuentaId) {
            this.formCuentaId = res.data[0].id;
          }
        }
      }
    });

    this.finanzasService.getCategorias().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categorias.set(res.data);
        }
      }
    });
  }

  abrirModal(tipo: TipoTransaccion = 'GASTO'): void {
    const activeElement = this.document.activeElement;
    this.elementoConFocoPrevio = activeElement && typeof (activeElement as HTMLElement).focus === 'function'
      ? activeElement as HTMLElement
      : null;
    this.formTipo.set(tipo);
    this.modalError.set(null);
    this.formMonto = null;
    this.formNotas = '';
    this.formFecha = new Date().toISOString().split('T')[0];
    this.movimientoRecurrente = false;
    this.frecuenciaRecurrencia = 'MENSUAL';
    this.siguienteFechaRecurrencia = '';
    this.formTasaCambio = null;

    const listaCuentas = this.cuentas();
    if (listaCuentas.length > 0) {
      this.formCuentaId = listaCuentas[0].id;
      if (listaCuentas.length > 1) {
        this.formCuentaDestinoId = listaCuentas[1].id;
      }
    }

    const cats = this.categoriasFiltradas();
    this.formCategoriaId = cats.length > 0 ? cats[0].id : null;

    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalError.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  manejarTecladoModal(event: KeyboardEvent): void {
    const dialog = this.elementoDialogo;
    if (!this.modalAbierto() || !dialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrarModal();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'
    )).filter(element =>
      !('disabled' in element && element.disabled)
      && element.tabIndex >= 0
      && !element.closest('[hidden], [aria-hidden="true"]')
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = this.document.activeElement;
    if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  cambiarTipo(tipo: TipoTransaccion): void {
    this.formTipo.set(tipo);
    if (tipo === 'TRANSFERENCIA') this.movimientoRecurrente = false;
    const cats = this.categoriasFiltradas();
    this.formCategoriaId = cats.length > 0 ? cats[0].id : null;
  }

  actualizarSiguienteFecha(): void {
    if (!this.movimientoRecurrente || !this.formFecha) return;
    const [anio, mes, dia] = this.formFecha.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    if (this.frecuenciaRecurrencia === 'SEMANAL') {
      fecha.setDate(fecha.getDate() + 7);
    } else if (this.frecuenciaRecurrencia === 'QUINCENAL') {
      fecha.setDate(fecha.getDate() + 14);
    } else if (this.frecuenciaRecurrencia === 'ANUAL') {
      fecha.setFullYear(fecha.getFullYear() + 1);
    } else {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      fecha.setDate(1);
      fecha.setMonth(fecha.getMonth() + 1);
      const ultimoDiaSiguienteMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
      fecha.setDate(dia === ultimoDiaMes ? ultimoDiaSiguienteMes : Math.min(dia, ultimoDiaSiguienteMes));
    }
    this.siguienteFechaRecurrencia = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');
  }

  guardarMovimiento(): void {
    if (!this.formMonto || this.formMonto <= 0) {
      this.modalError.set('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!this.formCuentaId) {
      this.modalError.set('Selecciona una cuenta');
      return;
    }

    if (this.formTipo() === 'TRANSFERENCIA') {
      if (!this.formCuentaDestinoId) {
        this.modalError.set('Selecciona la cuenta de destino');
        return;
      }
      if (this.formCuentaDestinoId === this.formCuentaId) {
        this.modalError.set('La cuenta origen y destino deben ser distintas');
        return;
      }
      if (this.monedaCuenta(this.formCuentaDestinoId) !== this.monedaCuenta(this.formCuentaId)
          && (!this.formTasaCambio || !Number.isFinite(this.formTasaCambio) || this.formTasaCambio <= 0)) {
        this.modalError.set('Ingresa una tasa de cambio mayor a 0 para transferir entre monedas distintas');
        return;
      }
    }

    const payload: TransaccionPayload = {
      cuentaId: this.formCuentaId,
      cuentaDestinoId: this.formTipo() === 'TRANSFERENCIA' ? this.formCuentaDestinoId : null,
      categoriaId: this.formTipo() !== 'TRANSFERENCIA' ? this.formCategoriaId : null,
      tipo: this.formTipo(),
      monto: this.formMonto,
      tasaCambio: this.formTipo() === 'TRANSFERENCIA'
        && this.monedaCuenta(this.formCuentaDestinoId) !== this.monedaCuenta(this.formCuentaId)
        ? this.formTasaCambio
        : null,
      fecha: this.formFecha,
      notas: this.formNotas.trim() || null,
      frecuenciaRecurrencia: this.movimientoRecurrente ? this.frecuenciaRecurrencia : null,
      siguienteFechaRecurrencia: this.movimientoRecurrente ? this.siguienteFechaRecurrencia : null
    };

    this.submitting.set(true);
    this.modalError.set(null);

    this.finanzasService.crearTransaccion(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.cerrarModal();
        this.cargarDashboard();
        this.cargarCuentasYCategorias();
        this.toastService.success('Movimiento registrado correctamente.');
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err.error?.message || 'Error al guardar la transacción';
        this.modalError.set(msg);
      }
    });
  }

  irATransacciones(): void {
    this.router.navigate(['/transacciones']);
  }

  eliminarMovimiento(id: number): void {
    this.confirmDialog.confirm({
      title: 'Eliminar movimiento',
      message: 'Esta acción eliminará el movimiento y recalculará automáticamente los saldos de las cuentas involucradas. ¿Deseas continuar?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.finanzasService.eliminarTransaccion(id).subscribe({
        next: () => {
          this.toastService.success('Movimiento eliminado y saldos actualizados.');
          this.cargarDashboard();
          this.cargarCuentasYCategorias();
        },
        error: err => this.toastService.error(err.error?.message || 'No se pudo eliminar el movimiento.')
      });
    });
  }

  editarMovimiento(id: number): void {
    this.router.navigate(['/transacciones'], { queryParams: { editar: id } });
  }

}
