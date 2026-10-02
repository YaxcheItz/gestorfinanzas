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
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PerfilService } from '../../core/services/perfil.service';
import { CategoriaSelectorComponent } from '../../shared/components/categoria-selector/categoria-selector.component';
import { CuentaSelectorComponent } from '../../shared/components/cuenta-selector/cuenta-selector.component';
import { MovimientoMobileCardComponent } from '../../shared/components/movimiento-mobile-card/movimiento-mobile-card.component';
import { AccionesMovimientoComponent } from '../../shared/components/acciones-movimiento/acciones-movimiento.component';
import { FechaPickerComponent } from '../../shared/components/fecha-picker/fecha-picker.component';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { PrivacidadService } from '../../core/services/privacidad.service';
import { nombreCuentaVisible, resumenCuentaSelector } from '../../core/utils/cuenta-financiera';
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
  imports: [CommonModule, FormsModule, CategoriaSelectorComponent, CuentaSelectorComponent, MovimientoMobileCardComponent, MontoPipe, AccionesMovimientoComponent, FechaPickerComponent],
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
      </div>

      @if (mostrarPrimerosPasos()) {
        <section class="order-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5" aria-labelledby="primeros-pasos-title">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-emerald-800">Empieza aquí</p>
              <h2 id="primeros-pasos-title" class="mt-1 text-lg font-bold text-slate-900">Prepara tu espacio financiero</h2>
              <p class="mt-1 text-sm text-slate-600">Dos pasos sencillos para que tu panel empiece a mostrar información útil.</p>
            </div>
            <p class="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800" role="status">
              {{ pasosInicialesCompletados() }} de 2 pasos
            </p>
          </div>
          <ol class="mt-4 grid gap-2 sm:grid-cols-2">
            <li class="flex min-w-0 items-center gap-3 rounded-xl border border-white bg-white p-3">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                [class.bg-emerald-100]="pasoCuentaCompletado()"
                [class.text-emerald-800]="pasoCuentaCompletado()"
                [class.bg-slate-100]="!pasoCuentaCompletado()"
                [class.text-slate-600]="!pasoCuentaCompletado()"
                [attr.aria-label]="pasoCuentaCompletado() ? 'Completado' : 'Pendiente'">
                {{ pasoCuentaCompletado() ? '✓' : '1' }}
              </span>
              <span class="min-w-0 flex-1 text-sm font-semibold text-slate-800">Crea tu primera cuenta</span>
              @if ((resumen()?.totalCuentas || 0) === 0) {
                <button type="button" (click)="irACuentas()" class="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700">Crear cuenta</button>
              }
            </li>
            <li class="flex min-w-0 items-center gap-3 rounded-xl border border-white bg-white p-3">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                [class.bg-emerald-100]="pasoMovimientoCompletado()"
                [class.text-emerald-800]="pasoMovimientoCompletado()"
                [class.bg-slate-100]="!pasoMovimientoCompletado()"
                [class.text-slate-600]="!pasoMovimientoCompletado()"
                [attr.aria-label]="pasoMovimientoCompletado() ? 'Completado' : 'Pendiente'">
                {{ pasoMovimientoCompletado() ? '✓' : '2' }}
              </span>
              <span class="min-w-0 flex-1 text-sm font-semibold text-slate-800">Registra tu primer movimiento</span>
              @if (!pasoMovimientoCompletado()) {
                <button type="button" (click)="iniciarRegistroPrimerMovimiento()" [disabled]="(resumen()?.totalCuentas || 0) === 0" class="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400">Registrar</button>
              }
            </li>
          </ol>
          @if ((resumen()?.totalCuentas || 0) === 0) {
            <p class="mt-3 text-xs text-slate-600">Primero agrega una cuenta; después podrás registrar ingresos y gastos.</p>
          }
        </section>
      }

      <!-- Tarjeta Consolidada: Saldo + Acciones Rápidas -->
      <section class="order-2 relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-zinc-950 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-transparent" aria-label="Control Financiero">
        <div class="flex flex-col gap-6">

          <!-- Parte Superior: Saldo Principal -->
          <div class="relative">
            <div class="mb-4 flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo Total</p>
              <select
                [ngModel]="monedaResumen()"
                (ngModelChange)="monedaResumen.set($event)"
                aria-label="Moneda del saldo"
                class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-hidden">
                @for (codigo of monedasResumen(); track codigo) {
                  <option [value]="codigo">{{ codigo }}</option>
                }
              </select>
            </div>

            @if (resumenMonedaSeleccionada(); as moneda) {
              <div class="flex flex-col gap-1">
                <p class="dashboard-summary-amount text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                  {{ moneda.balanceTotal | monto:moneda.moneda:'symbol':'1.2-2' }}
                </p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Disponible: {{ (moneda.dineroDisponible ?? moneda.balanceTotal) | monto:moneda.moneda:'symbol':'1.2-2' }}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>{{ moneda.totalCuentas }} cuentas activas</span>
                </div>
              </div>
            } @else {
              <p class="animate-pulse text-sm text-slate-400">Cargando saldos...</p>
            }
          </div>

          <!-- Resumen Mensual: Ingresos y Gastos -->
          @if (resumenMonedaSeleccionada(); as moneda) {
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ingresos mes</p>
                <p class="mt-1 text-sm font-bold text-emerald-700 sm:text-lg">
                  {{ moneda.ingresosMes | monto:moneda.moneda:'symbol':'1.2-2' }}
                </p>
              </div>
              <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gastos mes</p>
                <p class="mt-1 text-sm font-bold text-slate-700 sm:text-lg">
                  {{ moneda.gastosMes | monto:moneda.moneda:'symbol':'1.2-2' }}
                </p>
              </div>
            </div>
          }

          <!-- Separador Visual -->
          <div class="h-px w-full bg-slate-100"></div>

          <!-- Parte Inferior: Acciones Rápidas -->
          <div class="flex flex-col gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Acciones Rápidas</p>
            <app-acciones-movimiento
              (elegir)="abrirModal($event)"
              (navegar)="irACuentas()"
              class="w-full"
            />
          </div>

        </div>
      </section>

      @if (comparacionMonedaSeleccionada(); as comparacion) {
        @if (comparacion.gastosActuales > 0 || comparacion.gastosAnteriores > 0) {
          <section class="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5" aria-labelledby="tendencia-gastos-title" aria-live="polite">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Comparación mensual · {{ comparacion.moneda }}</p>
              <h2 id="tendencia-gastos-title" class="mt-1 text-base font-bold text-slate-900">
                @if (comparacion.gastosAnteriores === 0) {
                  Este mes registraste gastos por primera vez en esta comparación.
                } @else if (comparacion.variacionGastos > 0) {
                  Tus gastos aumentaron frente al mes anterior.
                } @else if (comparacion.variacionGastos < 0) {
                  Tus gastos disminuyeron frente al mes anterior.
                } @else {
                  Tus gastos se mantuvieron igual que el mes anterior.
                }
              </h2>
              @if (comparacion.gastosAnteriores > 0) {
                <p class="mt-1 text-sm text-slate-600">
                  {{ comparacion.variacionGastos | monto:comparacion.moneda:'symbol':'1.2-2' }}
                  ({{ comparacion.variacionGastosPorcentaje | number:'1.0-1' }}%) respecto al periodo anterior.
                </p>
              } @else {
                <p class="mt-1 text-sm text-slate-600">No hay un periodo anterior con gastos para calcular una variación porcentual.</p>
              }
            </div>
            <button type="button" (click)="irATransacciones()" class="mt-3 min-h-11 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700 sm:mt-0">Revisar movimientos</button>
          </section>
        }
      }

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
                    {{ plantilla.monto | monto:plantilla.moneda:'symbol':'1.2-2' }} · {{ nombreCuentaVisible(plantilla.cuentaNombre) }}
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
                [attr.aria-label]="'Distribución de gastos en ' + monedaAnalitica() + '. Total: ' + (gastosTotales() | monto:monedaAnalitica():'symbol':'1.2-2')"
                [style.background]="donutGradient()">
                <div class="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center text-center">
                  <span class="text-[11px] uppercase tracking-wide text-slate-400">Total</span>
                  <span class="text-sm font-bold text-slate-900">{{ gastosTotales() | monto:monedaAnalitica():'symbol':'1.0-0' }}</span>
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
                      {{ categoria.monto | monto:monedaAnalitica():'symbol':'1.2-2' }}
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
                      [title]="'Ingresos: ' + (mes.ingresos | monto:monedaAnalitica():'symbol':'1.2-2') + ' ' + monedaAnalitica()">
                    </div>
                    <div
                      class="w-3 sm:w-4 bg-rose-500 rounded-t-sm transition-[height]"
                      [style.height.%]="mes.gastosAltura"
                      [title]="'Gastos: ' + (mes.gastos | monto:monedaAnalitica():'symbol':'1.2-2') + ' ' + monedaAnalitica()">
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
                    <td>{{ mes.ingresos | monto:monedaAnalitica():'symbol':'1.2-2' }}</td>
                    <td>{{ mes.gastos | monto:monedaAnalitica():'symbol':'1.2-2' }}</td>
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
        <div #movementDialog tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="dashboard-movement-title" class="dashboard-motion-scope dashboard-movement-dialog flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:h-[min(90dvh,48rem)] sm:max-h-[min(90dvh,48rem)] sm:max-w-lg sm:rounded-3xl">
          
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
            <div role="group" aria-label="Tipo de movimiento" class="grid grid-cols-[repeat(3,minmax(0,1fr))] auto-rows-fr items-stretch gap-1.5 rounded-xl bg-slate-100 p-1 text-[11px] font-semibold sm:gap-2 sm:text-xs">
              <button 
                type="button"
                (click)="cambiarTipo('GASTO')"
                [attr.aria-pressed]="formTipo() === 'GASTO'"
                [class]="formTipo() === 'GASTO' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="h-full min-h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-1 py-2 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:min-h-11">
                Gasto
              </button>
              <button 
                type="button"
                (click)="cambiarTipo('INGRESO')"
                [attr.aria-pressed]="formTipo() === 'INGRESO'"
                [class]="formTipo() === 'INGRESO' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="h-full min-h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-1 py-2 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:min-h-11">
                Ingreso
              </button>
              <button 
                type="button"
                (click)="cambiarTipo('TRANSFERENCIA')"
                [attr.aria-pressed]="formTipo() === 'TRANSFERENCIA'"
                [class]="formTipo() === 'TRANSFERENCIA' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="h-full min-h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-1 py-2 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:min-h-11">
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

            <!-- Monto: sin título. El número grande y el símbolo de la moneda ya dicen todo,
                 y una etiqueta encima solo empuja el resto del formulario hacia abajo. -->
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div class="relative flex items-center justify-center">
                <span class="absolute left-0 text-xl font-bold text-slate-400 dark:text-slate-500">
                  {{ monedaCuenta(formCuentaId) }}
                </span>
                <input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  inputmode="decimal"
                  [(ngModel)]="formMonto"
                  name="monto"
                  placeholder="0.00"
                  [attr.aria-label]="'Monto a registrar en ' + monedaCuenta(formCuentaId)"
                  class="w-full bg-transparent py-1 pl-9 pr-2 text-center text-3xl font-black text-slate-900 placeholder:font-bold placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <!-- Cuentas. En transferencia: "De" -> "Para" en una sola fila, con la flecha
                 en una columna propia para que nunca pise ninguno de los dos botones.
                 Fuera de transferencia la etiqueta "Cuenta" sobra: el botón ya va escrito. -->
            @if (formTipo() === 'TRANSFERENCIA') {
              <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div class="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-start gap-1.5">
                  <app-cuenta-selector
                    [cuentas]="cuentas()"
                    [selectedId]="formCuentaId"
                    label="De"
                    idBase="cuentaId"
                    [compacto]="true"
                    (selectedIdChange)="cambiarCuentaOrigen($event)" />

                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"
                       class="mt-5 h-4 w-4 shrink-0 justify-self-center text-slate-400 dark:text-slate-500">
                    <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h9.19L10.72 7.03a.75.75 0 111.06-1.06l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.22-2.22H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
                  </svg>

                  <app-cuenta-selector
                    [cuentas]="cuentasDestinoDisponibles()"
                    [selectedId]="formCuentaDestinoId"
                    label="Para"
                    idBase="cuentaDestinoId"
                    [compacto]="true"
                    [alinearPanelDerecha]="true"
                    (selectedIdChange)="formCuentaDestinoId = $event" />
                </div>

                @if (cuentasDestinoDisponibles().length === 0) {
                  <p class="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    No puedes transferir entre dos tarjetas de crédito. Elige una cuenta que no sea de crédito.
                  </p>
                }
              </div>
            } @else {
              <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <app-cuenta-selector
                  [cuentas]="cuentas()"
                  [selectedId]="formCuentaId"
                  label="Cuenta"
                  [etiquetaVisible]="false"
                  idBase="cuentaId"
                  (selectedIdChange)="cambiarCuentaOrigen($event)" />
              </div>
            }

            <!-- Categoría a lo ancho. Con veinte nombres posibles, media columna estrangula
                 tanto el mosaico como la rejilla que se abre para elegir. -->
            @if (formTipo() !== 'TRANSFERENCIA') {
              <div class="min-w-0">
                @defer (on immediate) {
                  <app-categoria-selector
                    [categorias]="categorias()"
                    [tipo]="formTipo()"
                    [selectedId]="formCategoriaId"
                    (selectedIdChange)="formCategoriaId = $event"
                    (categoriasChange)="categorias.set($event)" />
                } @placeholder {
                  <div class="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"></div>
                }
              </div>
            }

            <!-- Fecha y el campo que la acompaña comparten fila. Ambas etiquetas van
                 fuera de vista: el control de fecha ya muestra su propio formato. -->
            <div class="grid grid-cols-2 gap-2">
              <div class="min-w-0">
                <label for="fecha" class="sr-only">Fecha del movimiento</label>
                <app-fecha-picker id="fecha" label="Fecha del movimiento" [value]="formFecha" (valueChange)="formFecha = $event; actualizarSiguienteFecha()" />
              </div>

              @if (formTipo() === 'TRANSFERENCIA') {
                @if (monedaCuenta(formCuentaId) !== monedaCuenta(formCuentaDestinoId)) {
                  <div class="min-w-0">
                    <label for="tasaCambio" class="sr-only">Tasa de cambio</label>
                    <input
                      id="tasaCambio"
                      type="number"
                      name="tasaCambio"
                      min="0.00000001"
                      step="0.00000001"
                      required
                      inputmode="decimal"
                      [(ngModel)]="formTasaCambio"
                      [attr.aria-label]="'Tasa de cambio de ' + monedaCuenta(formCuentaId) + ' a ' + monedaCuenta(formCuentaDestinoId)"
                      class="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Ej. 17.25"
                    />
                    <p class="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                      1 {{ monedaCuenta(formCuentaId) }} = ? {{ monedaCuenta(formCuentaDestinoId) }}
                      @if (formMonto && formTasaCambio && formTasaCambio > 0) {
                        · llegan {{ formMonto * formTasaCambio | monto:monedaCuenta(formCuentaDestinoId):'symbol':'1.2-2' }}
                      }
                    </p>
                  </div>
                }
              } @else {
                <div class="min-w-0">
                  <label for="notas" class="sr-only">Notas adicionales (opcional)</label>
                  <input
                    id="notas"
                    type="text"
                    maxlength="500"
                    [(ngModel)]="formNotas"
                    name="notas"
                    placeholder="Notas"
                    class="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              }
            </div>

            @if (formTipo() === 'TRANSFERENCIA') {
              <div>
                <label for="notas" class="sr-only">Notas adicionales (opcional)</label>
                <input
                  id="notas"
                  type="text"
                  maxlength="500"
                  [(ngModel)]="formNotas"
                  name="notas"
                  placeholder="Notas"
                  class="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            }

            @if (formTipo() !== 'TRANSFERENCIA') {
              <!-- Repetir y MSI en la misma fila. Son excluyentes: el backend solo
                   programa la plantilla de una forma, y si llegan los dos se queda con MSI. -->
              <div class="grid grid-cols-2 gap-2">
                <label
                  class="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-emerald-500"
                  [class]="movimientoRecurrente
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'">
                  <input type="checkbox" name="movimientoRecurrente" class="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                         [ngModel]="movimientoRecurrente" (ngModelChange)="alternarRecurrente($event)" />
                  <span class="min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Repetir<span class="sr-only"> este movimiento</span>
                  </span>
                </label>

                @if (formTipo() === 'GASTO' && esCuentaCredito()) {
                  <label
                    class="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-emerald-500"
                    [class]="esCompraMsi
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'">
                    <input type="checkbox" name="esCompraMsi" class="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                           [ngModel]="esCompraMsi" (ngModelChange)="alternarMsi($event)" />
                    <span class="min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      MSI<span class="sr-only">: compra a meses sin intereses</span>
                    </span>
                  </label>
                }
              </div>

              @if (movimientoRecurrente) {
                <div class="grid grid-cols-2 gap-2">
                  <label class="min-w-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Frecuencia
                    <select name="frecuenciaRecurrencia" [(ngModel)]="frecuenciaRecurrencia"
                            (ngModelChange)="actualizarSiguienteFecha()"
                            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                      <option value="SEMANAL">Cada semana</option>
                      <option value="QUINCENAL">Cada dos semanas</option>
                      <option value="MENSUAL">Cada mes</option>
                      <option value="ANUAL">Cada año</option>
                    </select>
                  </label>
                  <label class="min-w-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Siguiente cargo
                    <app-fecha-picker id="siguienteFechaRecurrencia" label="Siguiente cargo" [value]="siguienteFechaRecurrencia" [min]="formFecha" (valueChange)="siguienteFechaRecurrencia = $event" />
                  </label>
                </div>
              } @else if (esCompraMsi) {
                <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Plazo en meses
                  <select name="formMsi" [(ngModel)]="formMsi" required
                          class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                    <option [ngValue]="null" disabled>Selecciona el plazo</option>
                    <option [ngValue]="3">3 meses sin intereses</option>
                    <option [ngValue]="6">6 meses sin intereses</option>
                    <option [ngValue]="9">9 meses sin intereses</option>
                    <option [ngValue]="12">12 meses sin intereses</option>
                    <option [ngValue]="18">18 meses sin intereses</option>
                    <option [ngValue]="24">24 meses sin intereses</option>
                  </select>
                </label>
              }
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
  readonly nombreCuentaVisible = nombreCuentaVisible;
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly perfilService = inject(PerfilService);
  private readonly privacidad = inject(PrivacidadService);
  private readonly categoriaPreferida = inject(CategoriaPreferidaService);
  private readonly document = inject(DOCUMENT);
  readonly resumenCuentaSelector = (cuenta: Cuenta) => resumenCuentaSelector(cuenta, this.privacidad.ocultarMontos());
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
  comparacion = signal<DashboardComparacion | null>(null);
  analiticaLoading = signal<boolean>(true);
  analiticaError = signal<string | null>(null);
  analitica = signal<DashboardAnalitica | null>(null);
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
  esCompraMsi = false;
  formMsi: number | null = null;
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

  esCuentaCredito(): boolean {
    return this.cuentas().find(cuenta => cuenta.id === this.formCuentaId)?.tipo === 'CREDITO';
  }

  monedaCuenta(id: number | null): string {
    return this.cuentas().find(cuenta => cuenta.id === id)?.moneda ?? 'MXN';
  }

  cuentasDestinoDisponibles(): Cuenta[] {
    const cuentaOrigen = this.cuentas().find(cuenta => cuenta.id === this.formCuentaId);
    return this.cuentas().filter(cuenta =>
      cuenta.id !== this.formCuentaId
      && !(cuentaOrigen?.tipo === 'CREDITO' && cuenta.tipo === 'CREDITO')
    );
  }

  cambiarCuentaOrigen(cuentaId: number | null): void {
    this.formCuentaId = cuentaId;
    const destinos = this.cuentasDestinoDisponibles();
    if (!destinos.some(cuenta => cuenta.id === this.formCuentaDestinoId)) {
      this.formCuentaDestinoId = destinos[0]?.id ?? null;
    }
    // Los MSI solo existen en tarjetas de crédito: si la cuenta cambia y ya no lo es,
    // dejarlo marcado solo produciría un error del servidor al guardar.
    if (!this.esCuentaCredito()) this.limpiarMsi();
  }

  /**
   * Repetir y MSI no pueden convivir. El servidor solo crea una plantilla por
   * movimiento, y con los dos datos en el request la de MSI se lleva el resto:
   * la periodicidad elegida se perdería sin avisar.
   */
  alternarRecurrente(valor: boolean): void {
    this.movimientoRecurrente = valor;
    if (valor) {
      this.esCompraMsi = false;
      this.formMsi = null;
      this.actualizarSiguienteFecha();
    }
  }

  alternarMsi(valor: boolean): void {
    if (valor && this.formTipo() !== 'GASTO') return;
    this.esCompraMsi = valor;
    if (valor) {
      this.movimientoRecurrente = false;
      this.siguienteFechaRecurrencia = '';
    }
  }

  limpiarMsi(): void {
    this.esCompraMsi = false;
    this.formMsi = null;
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

  mostrarPrimerosPasos(): boolean {
    return this.resumen() !== null && (!this.pasoCuentaCompletado() || !this.pasoMovimientoCompletado());
  }

  pasosInicialesCompletados(): number {
    return Number(this.pasoCuentaCompletado()) + Number(this.pasoMovimientoCompletado());
  }

  pasoCuentaCompletado(): boolean {
    return (this.resumen()?.totalCuentas ?? 0) > 0;
  }

  pasoMovimientoCompletado(): boolean {
    return this.resumen()?.ultimosMovimientos.some(movimiento =>
      movimiento.tipo === 'INGRESO' || movimiento.tipo === 'GASTO'
    ) ?? false;
  }

  iniciarRegistroPrimerMovimiento(): void {
    if (!this.resumen()?.totalCuentas) {
      this.irACuentas();
      return;
    }
    this.abrirModal('GASTO');
  }

  cargarDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.cargarAnalitica();
    this.cargarRecurrencias();
    this.cargarComparacion();

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

  cargarComparacion(): void {
    this.finanzasService.getDashboardComparacion().subscribe({
      next: response => this.comparacion.set(response.success ? response.data ?? null : null),
      error: () => this.comparacion.set(null)
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

  irACuentas(): void {
    this.router.navigate(['/cuentas']);
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
          if (res.data.length > 0 && !res.data.some(cuenta => cuenta.id === this.formCuentaId)) {
            this.formCuentaId = res.data[0].id;
          }
          const destinos = this.cuentasDestinoDisponibles();
          if (!destinos.some(cuenta => cuenta.id === this.formCuentaDestinoId)) {
            this.formCuentaDestinoId = destinos[0]?.id ?? null;
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

  abrirModal(params: TipoTransaccion | { tipo: TipoTransaccion; categoriaId?: number | null } = 'GASTO'): void {
    const tipo = typeof params === 'string' ? params : params.tipo;
    const catId = typeof params === 'object' ? params.categoriaId : null;

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
    this.esCompraMsi = false;
    this.formMsi = null;
    this.frecuenciaRecurrencia = 'MENSUAL';
    this.siguienteFechaRecurrencia = '';
    this.formTasaCambio = null;

    const listaCuentas = this.cuentas();
    if (listaCuentas.length > 0) {
      this.formCuentaId = listaCuentas[0].id;
      this.formCuentaDestinoId = this.cuentasDestinoDisponibles()[0]?.id ?? null;
    }

    if (catId !== null && catId !== undefined) {
      this.formCategoriaId = catId;
    } else {
      const cats = this.categoriasFiltradas();
      // Se abre con la categoria de la ultima vez, si sigue existiendo. Solo si no
      // hay memoria, o la memoria apunta a algo que ya no esta, se cae a la primera.
      const preferida = this.categoriaPreferida.preferida(tipo);
      this.formCategoriaId = cats.some(categoria => categoria.id === preferida)
        ? preferida
        : (cats[0]?.id ?? null);
    }

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
    if (tipo !== 'GASTO') this.limpiarMsi();
    // Cambiar de pestaña también cambia de tipo, así que vale la memoria de ese tipo.
    const cats = this.categoriasFiltradas();
    const preferida = this.categoriaPreferida.preferida(tipo);
    this.formCategoriaId = cats.some(categoria => categoria.id === preferida)
      ? preferida
      : (cats[0]?.id ?? null);
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

    if (this.formTipo() !== 'TRANSFERENCIA' && this.formCategoriaId == null) {
      this.modalError.set('Crea una categoría para este tipo de movimiento y selecciónala.');
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
      const origen = this.cuentas().find(cuenta => cuenta.id === this.formCuentaId);
      const destino = this.cuentas().find(cuenta => cuenta.id === this.formCuentaDestinoId);
      if (origen?.tipo === 'CREDITO' && destino?.tipo === 'CREDITO') {
        this.modalError.set('No se permiten transferencias entre tarjetas de crédito.');
        return;
      }
      if (this.monedaCuenta(this.formCuentaDestinoId) !== this.monedaCuenta(this.formCuentaId)
          && (!this.formTasaCambio || !Number.isFinite(this.formTasaCambio) || this.formTasaCambio <= 0)) {
        this.modalError.set('Ingresa una tasa de cambio mayor a 0 para transferir entre monedas distintas');
        return;
      }
    }

    if (this.esCompraMsi && (!this.formMsi || this.formMsi < 2)) {
      this.modalError.set('Selecciona los meses sin intereses');
      return;
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
      siguienteFechaRecurrencia: this.movimientoRecurrente ? this.siguienteFechaRecurrencia : null,
      // Sin esto el servidor guardaba el gasto completo y sin cuotas: el MSI se perdía.
      msi: this.esCompraMsi ? this.formMsi : null
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
