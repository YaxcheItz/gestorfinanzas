import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import {
  Categoria,
  Cuenta,
  DashboardAnalitica,
  DashboardResumen,
  TipoTransaccion,
  TransaccionPayload
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Encabezado y Saludo -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Resumen Financiero
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Hola, {{ authService.currentUser()?.nombre || 'Usuario' }}. Aquí tienes el estado consolidado de tus cuentas.
          </p>
        </div>

        <div class="flex items-center space-x-3">
          <button 
            type="button"
            (click)="cargarDashboard()" 
            class="inline-flex items-center px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Actualizar datos">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-slate-400" [class.animate-spin]="loading()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ nombreMesActual() }} {{ resumen()?.anio || anioActual }}
          </button>
          
          <button 
            type="button"
            (click)="abrirModal('GASTO')"
            class="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Movimiento
          </button>
        </div>
      </div>

      <!-- Alertas o Mensaje de Error si la API falla -->
      @if (error()) {
        <div class="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-2xl flex items-center justify-between">
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

      <!-- Métricas separadas por moneda -->
      <section class="space-y-4" aria-label="Resumen financiero por moneda">
        @for (moneda of resumen()?.resumenPorMoneda ?? []; track moneda.moneda) {
          <div>
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{{ moneda.moneda }}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <article class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance total</p>
                <p class="mt-3 text-2xl font-bold text-slate-900">{{ moneda.balanceTotal | currency:moneda.moneda:'symbol':'1.2-2' }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ moneda.totalCuentas }} cuenta{{ moneda.totalCuentas === 1 ? '' : 's' }} activa{{ moneda.totalCuentas === 1 ? '' : 's' }}</p>
              </article>
              <article class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Ingresos del mes</p>
                <p class="mt-3 text-2xl font-bold text-emerald-600">{{ moneda.ingresosMes | currency:moneda.moneda:'symbol':'1.2-2' }}</p>
              </article>
              <article class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Gastos del mes</p>
                <p class="mt-3 text-2xl font-bold text-rose-600">{{ moneda.gastosMes | currency:moneda.moneda:'symbol':'1.2-2' }}</p>
                <p class="mt-1 text-xs text-slate-500">Balance mensual: {{ moneda.balanceMes | currency:moneda.moneda:'symbol':'1.2-2' }}</p>
              </article>
              <article class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasa de ahorro</p>
                <p class="mt-3 text-2xl font-bold text-violet-600">{{ moneda.tasaAhorro | number:'1.1-1' }}%</p>
                <p class="mt-1 text-xs text-slate-500">{{ moneda.tasaAhorro >= 20 ? 'Excelente ritmo de ahorro' : 'Margen para optimizar' }}</p>
              </article>
            </div>
          </div>
        } @empty {
          <p class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Agrega una cuenta para ver tus métricas.</p>
        }
      </section>

      <!-- Analítica de gastos e ingresos -->
      <section aria-label="Analítica financiera" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <article class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
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
            <div class="h-52 flex items-center justify-center text-sm text-slate-400">
              <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Cargando analítica...
            </div>
          } @else if (analiticaError()) {
            <div class="h-52 flex flex-col items-center justify-center gap-2 text-center">
              <p class="text-sm text-rose-600">{{ analiticaError() }}</p>
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
                  <span class="text-[10px] uppercase tracking-wide text-slate-400">Total</span>
                  <span class="text-sm font-bold text-slate-900">{{ gastosTotales() | currency:monedaAnalitica():'symbol':'1.0-0' }}</span>
                </div>
              </div>
              <ul class="w-full space-y-3">
                @for (categoria of gastosPorCategoria(); track categoria.categoriaId ?? categoria.categoriaNombre; let i = $index) {
                  <li class="flex items-center justify-between gap-3 text-xs">
                    <span class="flex items-center gap-2 min-w-0 text-slate-600">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="colorCategoria(categoria, i)"></span>
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

        <article class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="mb-6">
            <h2 class="text-base font-bold text-slate-900">Ingresos vs. gastos</h2>
            <p class="text-xs text-slate-500 mt-1">Comparativo de los últimos seis meses</p>
          </div>

          @if (analiticaLoading()) {
            <div class="h-52 flex items-center justify-center text-sm text-slate-400">
              <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Cargando analítica...
            </div>
          } @else if (analiticaError()) {
            <div class="h-52 flex flex-col items-center justify-center gap-2 text-center">
              <p class="text-sm text-rose-600">{{ analiticaError() }}</p>
              <button type="button" (click)="cargarAnalitica()" class="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Reintentar
              </button>
            </div>
          } @else {
            <div class="flex items-center justify-center gap-5 text-xs text-slate-500 mb-3">
              <span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>Ingresos</span>
              <span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>Gastos</span>
            </div>
            <div class="h-44 flex items-end justify-around gap-2 border-b border-slate-100 px-1">
              @for (mes of barrasMensuales(); track mes.anio + '-' + mes.mes) {
                <div class="flex-1 h-full flex flex-col justify-end items-center min-w-0" [attr.aria-label]="mes.etiqueta + ': ingresos $' + mes.ingresos + ', gastos $' + mes.gastos">
                  <div class="w-full max-w-12 flex items-end justify-center gap-1 h-full">
                    <div
                      class="w-3 sm:w-4 bg-emerald-500 rounded-t-sm transition-[height]"
                      [style.height.%]="mes.ingresosAltura"
                      [title]="'Ingresos: $' + (mes.ingresos | number:'1.2-2')">
                    </div>
                    <div
                      class="w-3 sm:w-4 bg-rose-500 rounded-t-sm transition-[height]"
                      [style.height.%]="mes.gastosAltura"
                      [title]="'Gastos: $' + (mes.gastos | number:'1.2-2')">
                    </div>
                  </div>
                  <span class="mt-2 text-[10px] sm:text-xs text-slate-500 capitalize">{{ mes.etiqueta }}</span>
                </div>
              }
            </div>
          }
        </article>
      </section>

      <!-- Banner de Inteligencia Artificial (Spring AI) -->
      <div class="bg-linear-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1 relative z-10">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Spring AI Ready ✨
            </span>
            <span class="text-xs text-slate-400">Módulo Inteligente</span>
          </div>
          <h2 class="text-lg font-bold">Asistente y Clasificador Inteligente</h2>
          <p class="text-xs text-slate-300 max-w-xl">
            Tu backend está preparado para conectar modelos de lenguaje para clasificar recibos, sugerir presupuestos y responder preguntas sobre tus balances.
          </p>
        </div>
        <button 
          type="button"
          class="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl transition-all cursor-pointer self-start md:self-center">
          Próximamente
        </button>
      </div>

      <!-- Tabla de Transacciones Recientes -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Últimos Movimientos</h2>
            <p class="text-xs text-slate-500 mt-0.5">Historial registrado en tiempo real en la base de datos</p>
          </div>
          <button 
            type="button"
            (click)="abrirModal('GASTO')"
            class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer">
            + Registrar movimiento
          </button>
        </div>

        @if (loading()) {
          <div class="p-12 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando movimientos...</span>
          </div>
        } @else if ((resumen()?.ultimosMovimientos?.length || 0) === 0) {
          <div class="p-12 text-center text-slate-400 text-sm space-y-3">
            <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p class="font-medium text-slate-600">Aún no tienes movimientos registrados</p>
            <p class="text-xs text-slate-400">Haz clic en "Nuevo Movimiento" para registrar tu primer gasto, ingreso o transferencia.</p>
            <button 
              type="button"
              (click)="abrirModal('GASTO')"
              class="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
              Crear mi primer movimiento
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th class="px-6 py-3.5">Concepto</th>
                  <th class="px-6 py-3.5">Categoría</th>
                  <th class="px-6 py-3.5">Cuenta</th>
                  <th class="px-6 py-3.5">Fecha</th>
                  <th class="px-6 py-3.5 text-right">Monto</th>
                  <th class="px-4 py-3.5 text-center w-12"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (m of resumen()?.ultimosMovimientos; track m.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors group">
                    <td class="px-6 py-4 font-medium text-slate-900 flex items-center space-x-3">
                      <div 
                        [class]="m.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' : (m.tipo === 'GASTO' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700')"
                        class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        @if (m.tipo === 'INGRESO') {
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                        } @else if (m.tipo === 'GASTO') {
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          </svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        }
                      </div>
                      <div class="truncate max-w-xs">
                        <span class="block truncate">{{ m.descripcion }}</span>
                        @if (m.notas) {
                          <span class="block text-xs text-slate-400 font-normal truncate">{{ m.notas }}</span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      @if (m.categoriaNombre) {
                        <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {{ m.categoriaNombre }}
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400 italic">
                          {{ m.tipo === 'TRANSFERENCIA' ? 'Transferencia' : m.tipo === 'SALDO_INICIAL' ? 'Saldo inicial' : 'Sin categoría' }}
                        </span>
                      }
                    </td>
                    <td class="px-6 py-4 text-xs font-medium text-slate-600">
                      @if (m.tipo === 'TRANSFERENCIA') {
                        <span>{{ m.cuentaNombre }} &rarr; {{ m.cuentaDestinoNombre }}</span>
                      } @else {
                        <span>{{ m.cuentaNombre }}</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {{ m.fecha }}
                    </td>
                    <td class="px-6 py-4 text-right font-bold whitespace-nowrap"
                        [class.text-emerald-600]="m.tipo === 'INGRESO'"
                        [class.text-rose-600]="m.tipo === 'GASTO'"
                        [class.text-blue-600]="m.tipo === 'TRANSFERENCIA'"
                        [class.text-emerald-600]="m.tipo === 'SALDO_INICIAL'">
                      @if (m.tipo === 'TRANSFERENCIA') {
                        -{{ m.monto | currency:m.moneda:'symbol':'1.2-2' }}
                        <span class="block text-xs font-medium text-slate-500">
                          +{{ (m.montoDestino ?? m.monto) | currency:(m.monedaDestino ?? m.moneda):'symbol':'1.2-2' }}
                        </span>
                      } @else {
                        {{ m.tipo === 'INGRESO' || m.tipo === 'SALDO_INICIAL' ? '+' : '-' }}{{ m.monto | currency:m.moneda:'symbol':'1.2-2' }}
                      }
                    </td>
                    <td class="px-4 py-4 text-center">
                      <button 
                        type="button"
                        (click)="eliminarMovimiento(m.id)"
                        class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                        title="Eliminar movimiento">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

    </div>

    <!-- Modal Interactivo 'Nuevo Movimiento' -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        
        <div class="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Encabezado del Modal con Selector de Tipo -->
          <div class="p-6 border-b border-slate-100">
            <div class="flex items-center justify-between pb-4">
              <h2 class="text-lg font-bold text-slate-900">Registrar Movimiento</h2>
              <button 
                type="button"
                (click)="cerrarModal()" 
                class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Tabs de Tipo de Transacción -->
            <div class="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button 
                type="button"
                (click)="cambiarTipo('GASTO')"
                [class]="formTipo() === 'GASTO' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="py-2 rounded-lg transition-all text-center cursor-pointer">
                Gasto
              </button>
              <button 
                type="button"
                (click)="cambiarTipo('INGRESO')"
                [class]="formTipo() === 'INGRESO' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="py-2 rounded-lg transition-all text-center cursor-pointer">
                Ingreso
              </button>
              <button 
                type="button"
                (click)="cambiarTipo('TRANSFERENCIA')"
                [class]="formTipo() === 'TRANSFERENCIA' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="py-2 rounded-lg transition-all text-center cursor-pointer">
                Transferencia
              </button>
            </div>
          </div>

          <!-- Formulario -->
          <form (ngSubmit)="guardarMovimiento()" class="p-6 space-y-4">
            
            @if (modalError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {{ modalError() }}
              </div>
            }

            <!-- Monto -->
            <div>
              <label for="monto" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Monto ($)
              </label>
              <div class="relative rounded-xl shadow-2xs">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  $
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
                  class="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <!-- Concepto / Descripción -->
            <div>
              <label for="descripcion" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Concepto / Descripción
              </label>
              <input
                id="descripcion"
                type="text"
                required
                [(ngModel)]="formDescripcion"
                name="descripcion"
                placeholder="Ej. Supermercado, Pago de nómina, Gasolina..."
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

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
                      {{ c.nombre }} ({{ c.saldoActual | currency:c.moneda:'symbol':'1.2-2' }})
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
                          {{ c.nombre }} ({{ c.saldoActual | currency:c.moneda:'symbol':'1.2-2' }})
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
              } @else {
                <!-- Categoría (solo para Gasto o Ingreso) -->
                <div>
                  <label for="categoriaId" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    id="categoriaId"
                    [(ngModel)]="formCategoriaId"
                    name="categoriaId"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer">
                    <option [ngValue]="null">-- Sin categoría --</option>
                    @for (cat of categoriasFiltradas(); track cat.id) {
                      <option [ngValue]="cat.id">
                        {{ cat.nombre }}
                      </option>
                    }
                  </select>
                </div>
              }
            </div>

            <!-- Fecha -->
            <div>
              <label for="fecha" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                required
                [(ngModel)]="formFecha"
                name="fecha"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <!-- Notas (opcional) -->
            <div>
              <label for="notas" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Notas adicionales (opcional)
              </label>
              <textarea
                id="notas"
                rows="2"
                [(ngModel)]="formNotas"
                name="notas"
                placeholder="Detalles sobre el gasto o movimiento..."
                class="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none">
              </textarea>
            </div>

            <!-- Botones de Acción -->
            <div class="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModal()"
                class="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              
              <button
                type="submit"
                [disabled]="submitting()"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2 cursor-pointer">
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
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly anioActual = new Date().getFullYear();

  // Estados reactivos con Signals
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  resumen = signal<DashboardResumen | null>(null);
  analiticaLoading = signal<boolean>(true);
  analiticaError = signal<string | null>(null);
  analitica = signal<DashboardAnalitica | null>(null);
  monedaAnalitica = signal('MXN');

  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);

  // Estados del modal
  modalAbierto = signal<boolean>(false);
  submitting = signal<boolean>(false);
  modalError = signal<string | null>(null);

  // Campos del formulario
  formTipo = signal<TipoTransaccion>('GASTO');
  formMonto: number | null = null;
  formDescripcion = '';
  formCuentaId: number | null = null;
  formCuentaDestinoId: number | null = null;
  formTasaCambio: number | null = null;
  formCategoriaId: number | null = null;
  formFecha = new Date().toISOString().split('T')[0];
  formNotas = '';

  categoriasFiltradas = computed(() => {
    const tipo = this.formTipo();
    return this.categorias().filter(c => c.tipo === tipo);
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

  ngOnInit(): void {
    this.cargarDashboard();
    this.cargarCuentasYCategorias();
  }

  cargarDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.cargarAnalitica();

    this.finanzasService.getDashboardResumen().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.resumen.set(res.data);
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
    this.formTipo.set(tipo);
    this.modalError.set(null);
    this.formMonto = null;
    this.formDescripcion = '';
    this.formNotas = '';
    this.formFecha = new Date().toISOString().split('T')[0];
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

  cambiarTipo(tipo: TipoTransaccion): void {
    this.formTipo.set(tipo);
    const cats = this.categoriasFiltradas();
    this.formCategoriaId = cats.length > 0 ? cats[0].id : null;
  }

  guardarMovimiento(): void {
    if (!this.formMonto || this.formMonto <= 0) {
      this.modalError.set('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!this.formDescripcion.trim()) {
      this.modalError.set('Ingresa una descripción o concepto');
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
      descripcion: this.formDescripcion.trim(),
      notas: this.formNotas.trim() || null
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
        error: (err) => {
          this.toastService.error(err.error?.message || 'No se pudo eliminar el movimiento.');
        }
      });
    });
  }

  nombreMesActual(): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mesIndex = (this.resumen()?.mes ? this.resumen()!.mes - 1 : new Date().getMonth());
    return meses[mesIndex];
  }
}
