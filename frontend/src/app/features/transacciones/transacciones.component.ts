import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { CategoriaSelectorComponent } from '../../shared/components/categoria-selector/categoria-selector.component';
import { MovimientoMobileCardComponent } from '../../shared/components/movimiento-mobile-card/movimiento-mobile-card.component';
import {
  Categoria,
  Cuenta,
  FrecuenciaRecurrencia,
  PageResponse,
  TipoTransaccion,
  Transaccion,
  TransaccionFiltro,
  TransaccionPayload
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoriaSelectorComponent, MovimientoMobileCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">

      <!-- Encabezado y Acción Principal -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Historial de Movimientos
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Consulta, busca y filtra todos tus ingresos, gastos y transferencias.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            (click)="exportarCsv()"
            [disabled]="exportando()"
            class="inline-flex items-center justify-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            {{ exportando() ? 'Preparando...' : 'Exportar CSV' }}
          </button>
          <button
            type="button"
            (click)="abrirModal('GASTO')"
            class="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Movimiento
          </button>
        </div>
      </div>

      <!-- Barra de Filtros Avanzados -->
      <button
        type="button"
        (click)="filtrosMovilAbiertos.update(abiertos => !abiertos)"
        [attr.aria-expanded]="filtrosMovilAbiertos()"
        aria-controls="filtros-avanzados-movimientos"
        class="mb-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs sm:hidden">
        <span>{{ tieneFiltrosActivos() ? 'Filtros activos' : 'Filtros avanzados' }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" [class.rotate-180]="filtrosMovilAbiertos()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div id="filtros-avanzados-movimientos"
           [class.is-open]="filtrosMovilAbiertos()"
           class="mobile-transaction-filters bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 shadow-xs space-y-4">
        
        <!-- Fila 1: Buscador y Filtro por Tipo (Chips) -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <!-- Buscador de Texto -->
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              [ngModel]="filtroBusqueda()"
              (ngModelChange)="onBusquedaChange($event)"
              placeholder="Buscar por categoría o notas..."
              class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <!-- Selector de Tipo por Chips -->
          <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              (click)="setTipoFiltro('')"
              [class]="filtroTipo() === '' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Todos
            </button>
            <button
              type="button"
              (click)="setTipoFiltro('INGRESO')"
              [class]="filtroTipo() === 'INGRESO' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Ingresos
            </button>
            <button
              type="button"
              (click)="setTipoFiltro('GASTO')"
              [class]="filtroTipo() === 'GASTO' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Gastos
            </button>
            <button
              type="button"
              (click)="setTipoFiltro('TRANSFERENCIA')"
              [class]="filtroTipo() === 'TRANSFERENCIA' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap">
              Transferencias
            </button>
          </div>

        </div>

        <!-- Fila 2: Selectores de Cuenta, Categoría, Rango de Fechas y Botón Limpiar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          
          <!-- Filtro Cuenta -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cuenta</label>
            <select
              [ngModel]="filtroCuentaId()"
              (ngModelChange)="onCuentaChange($event)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer">
              <option [ngValue]="null">Todas las cuentas</option>
              @for (c of cuentas(); track c.id) {
                <option [ngValue]="c.id">{{ c.nombre }} ({{ c.tipo }})</option>
              }
            </select>
          </div>

          <!-- Filtro Categoría -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoría</label>
            <select
              [ngModel]="filtroCategoriaId()"
              (ngModelChange)="onCategoriaChange($event)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer">
              <option [ngValue]="null">Todas las categorías</option>
              @for (cat of categorias(); track cat.id) {
                <option [ngValue]="cat.id">{{ cat.nombre }}</option>
              }
            </select>
          </div>

          <!-- Fecha Desde -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Desde</label>
            <input
              type="date"
              [ngModel]="filtroFechaInicio()"
              (ngModelChange)="onFechaInicioChange($event)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          <!-- Fecha Hasta & Limpiar -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Hasta</label>
              @if (tieneFiltrosActivos()) {
                <button
                  type="button"
                  (click)="limpiarFiltros()"
                  class="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer">
                  Limpiar filtros
                </button>
              }
            </div>
            <input
              type="date"
              [ngModel]="filtroFechaFin()"
              (ngModelChange)="onFechaFinChange($event)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

        </div>

        <!-- Presets Rápidos de Fecha -->
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 pt-1">
          <span class="font-medium text-slate-400">Rango rápido:</span>
          <button (click)="aplicarRangoRapido('ESTE_MES')" class="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer">Este mes</button>
          <span>•</span>
          <button (click)="aplicarRangoRapido('MES_PASADO')" class="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer">Mes anterior</button>
          <span>•</span>
          <button (click)="aplicarRangoRapido('ULTIMOS_30')" class="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer">Últimos 30 días</button>
          <span>•</span>
          <button (click)="aplicarRangoRapido('TODO')" class="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer">Todo el historial</button>
        </div>

      </div>

      <!-- Resumen de Totales del Filtro Actual, separado por moneda -->
      <div class="space-y-3">
        @for (resumen of resumenPaginaPorMoneda(); track resumen.moneda) {
          <section class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{{ resumen.moneda }}</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Ingresos (Página)</span>
                <span class="text-base font-bold text-emerald-600">+{{ resumen.ingresos | currency:resumen.moneda:'symbol':'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Gastos (Página)</span>
                <span class="text-base font-bold text-rose-600">-{{ resumen.gastos | currency:resumen.moneda:'symbol':'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance Neto</span>
                <span
                  [class.text-emerald-600]="resumen.balance >= 0"
                  [class.text-rose-600]="resumen.balance < 0"
                  class="text-base font-bold">
                  {{ resumen.balance | currency:resumen.moneda:'symbol':'1.2-2' }}
                </span>
              </div>
            </div>
          </section>
        } @empty {
          <p class="text-sm text-slate-500">No hay ingresos ni gastos en esta página.</p>
        }
      </div>

      <!-- Tabla de Transacciones -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        @if (loading()) {
          <div class="p-16 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Buscando movimientos...</span>
          </div>
        } @else if (!pageData() || pageData()!.content.length === 0) {
          <!-- Empty State -->
          <div class="p-16 text-center space-y-4">
            <div class="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div class="max-w-sm mx-auto">
              <h3 class="text-base font-bold text-slate-800">No se encontraron movimientos</h3>
              <p class="text-xs text-slate-400 mt-1">
                No hay transacciones registradas con los filtros aplicados. Prueba cambiando las fechas o el criterio de búsqueda.
              </p>
            </div>
            @if (tieneFiltrosActivos()) {
              <button 
                type="button"
                (click)="limpiarFiltros()"
                class="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                Restablecer todos los filtros
              </button>
            }
          </div>
        } @else {
          <div class="hidden overflow-x-auto sm:block" role="region" aria-label="Movimientos; desliza horizontalmente para ver más columnas" tabindex="0">
            <table class="w-full min-w-[620px] text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th class="px-6 py-3.5">Movimiento</th>
                  <th class="px-6 py-3.5">Cuenta</th>
                  <th class="px-6 py-3.5">Fecha</th>
                  <th class="px-6 py-3.5 text-right">Monto</th>
                  <th class="px-4 py-3.5 text-center w-12"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (m of pageData()!.content; track m.id) {
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
                      <div class="truncate max-w-xs sm:max-w-md">
                        <span class="block truncate text-slate-900 font-semibold">{{ m.categoriaNombre || m.descripcion }}</span>
                        @if (m.notas) {
                          <span class="block text-xs text-slate-400 font-normal truncate">{{ m.notas }}</span>
                        }
                      </div>
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
                      @if (m.tipo !== 'SALDO_INICIAL') {
                        <button
                          type="button"
                          (click)="abrirModalEditar(m)"
                          class="text-slate-500 hover:text-emerald-700 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer"
                          [attr.aria-label]="'Editar movimiento ' + (m.categoriaNombre || m.descripcion)"
                          title="Editar movimiento">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      }
                      <button 
                        type="button"
                        (click)="eliminarMovimiento(m.id)"
                        class="text-slate-500 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
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
          <div class="space-y-3 p-3 sm:hidden" aria-label="Lista de movimientos">
            <p class="px-1 text-xs text-slate-500">Desliza a la izquierda o toca ⋯ para editar o eliminar.</p>
            @for (m of pageData()!.content; track m.id) {
              <app-movimiento-mobile-card
                [movimiento]="m"
                (editar)="abrirModalEditar($event)"
                (eliminar)="eliminarMovimiento($event)" />
            }
          </div>

          <!-- Barra de Paginación -->
          <div class="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              Mostrando <span class="font-semibold text-slate-700">{{ (paginaActual() * tamanioPagina()) + 1 }}</span> a 
              <span class="font-semibold text-slate-700">{{ calcularLimiteSuperior() }}</span> de 
              <span class="font-semibold text-slate-700">{{ pageData()!.totalElements }}</span> movimientos
            </div>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                [disabled]="pageData()!.first"
                (click)="irAPagina(paginaActual() - 1)"
                class="px-3 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                Anterior
              </button>

              <span class="font-semibold text-slate-700 px-2">
                Pág. {{ paginaActual() + 1 }} de {{ pageData()!.totalPages || 1 }}
              </span>

              <button
                type="button"
                [disabled]="pageData()!.last"
                (click)="irAPagina(paginaActual() + 1)"
                class="px-3 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                Siguiente
              </button>
            </div>
          </div>
        }

      </div>

    </div>

    <!-- Modal Interactivo 'Nuevo Movimiento' -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4">
        
        <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[calc(100dvh-1rem)] overflow-y-auto border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          
          <div class="p-4 sm:p-6 border-b border-slate-100">
            <div class="flex items-center justify-between pb-4">
              <h2 class="text-lg font-bold text-slate-900">{{ modoEdicion() ? 'Editar Movimiento' : 'Registrar Movimiento' }}</h2>
              <button 
                type="button"
                (click)="cerrarModal()" 
                class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Tabs de Tipo -->
            <div class="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button 
                type="button"
                (click)="cambiarTipoModal('GASTO')"
                [class]="formTipo() === 'GASTO' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="py-2 rounded-lg transition-all text-center cursor-pointer">
                Gasto
              </button>
              <button 
                type="button"
                (click)="cambiarTipoModal('INGRESO')"
                [class]="formTipo() === 'INGRESO' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="py-2 rounded-lg transition-all text-center cursor-pointer">
                Ingreso
              </button>
              <button 
                type="button"
                (click)="cambiarTipoModal('TRANSFERENCIA')"
                [class]="formTipo() === 'TRANSFERENCIA' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="py-2 rounded-lg transition-all text-center cursor-pointer">
                Transferencia
              </button>
            </div>
          </div>

          <!-- Formulario -->
          <form (ngSubmit)="guardarMovimiento()" class="p-4 sm:p-6 space-y-4">
            
            @if (modalError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
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
                  class="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
            </div>

            <!-- Cuentas -->
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
                  class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer">
                  @for (c of cuentas(); track c.id) {
                    <option [ngValue]="c.id">{{ c.nombre }} ({{ c.saldoActual | currency:c.moneda:'symbol':'1.2-2' }})</option>
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
                    class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer">
                    @for (c of cuentas(); track c.id) {
                      @if (c.id !== formCuentaId) {
                        <option [ngValue]="c.id">{{ c.nombre }} ({{ c.saldoActual | currency:c.moneda:'symbol':'1.2-2' }})</option>
                      }
                    }
                  </select>
                  @if (monedaCuenta(formCuentaId) !== monedaCuenta(formCuentaDestinoId)) {
                    <div class="mt-4">
                      <label for="tasaCambio" class="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tasa de cambio (1 {{ monedaCuenta(formCuentaId) }} = ? {{ monedaCuenta(formCuentaDestinoId) }})
                      </label>
                      <input
                        id="tasaCambio"
                        type="number"
                        name="tasaCambio"
                        min="0.00000001"
                        step="0.00000001"
                        required
                        [(ngModel)]="formTasaCambio"
                        class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
              }
            </div>

            <!-- Fecha y Notas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
                />
              </div>

              <div class="sm:col-span-2">
                <label for="notas" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas adicionales (Opcional)
                </label>
                <input
                  id="notas"
                  type="text"
                  [(ngModel)]="formNotas"
                  name="notas"
                  placeholder="Agrega un detalle si lo necesitas..."
                  class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            @if (!modoEdicion() && formTipo() !== 'TRANSFERENCIA') {
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
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button"
                (click)="cerrarModal()"
                class="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                Cancelar
              </button>
              
              <button 
                type="submit"
                [disabled]="submitting()"
                class="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
                @if (submitting()) {
                  <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Guardando...</span>
                } @else {
                  <span>{{ modoEdicion() ? 'Guardar cambios' : 'Registrar' }}</span>
                }
              </button>
            </div>

          </form>

        </div>
      </div>
    }
  `
})
export class TransaccionesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  // Filtros Signals
  readonly filtroTipo = signal<TipoTransaccion | ''>('');
  readonly filtrosMovilAbiertos = signal(false);
  readonly filtroCuentaId = signal<number | null>(null);
  readonly filtroCategoriaId = signal<number | null>(null);
  readonly filtroFechaInicio = signal<string>('');
  readonly filtroFechaFin = signal<string>('');
  readonly filtroBusqueda = signal<string>('');

  // Paginación y Datos Signals
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(15);
  readonly pageData = signal<PageResponse<Transaccion> | null>(null);
  readonly loading = signal<boolean>(false);
  readonly exportando = signal(false);
  readonly error = signal<string | null>(null);

  // Auxiliares
  readonly cuentas = signal<Cuenta[]>([]);
  readonly categorias = signal<Categoria[]>([]);

  // Modal Signals
  readonly modalAbierto = signal<boolean>(false);
  readonly formTipo = signal<TipoTransaccion>('GASTO');
  readonly modoEdicion = signal(false);
  readonly transaccionEditando = signal<Transaccion | null>(null);
  readonly submitting = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  formMonto: number | null = null;
  formCuentaId: number | null = null;
  formCuentaDestinoId: number | null = null;
  formTasaCambio: number | null = null;
  formCategoriaId: number | null = null;
  formFecha: string = '';
  formNotas: string = '';
  movimientoRecurrente = false;
  frecuenciaRecurrencia: FrecuenciaRecurrencia = 'MENSUAL';
  siguienteFechaRecurrencia = '';

  // Categorías filtradas por tipo para el modal
  readonly categoriasModal = computed(() => {
    return this.categorias().filter(c => c.tipo === this.formTipo());
  });
  monedaCuenta(id: number | null): string {
    return this.cuentas().find(cuenta => cuenta.id === id)?.moneda ?? 'MXN';
  }

  readonly resumenPaginaPorMoneda = computed(() => {
    const resumen = new Map<string, { ingresos: number; gastos: number }>();
    for (const transaccion of this.pageData()?.content || []) {
      if (transaccion.tipo !== 'INGRESO' && transaccion.tipo !== 'GASTO') continue;
      const totales = resumen.get(transaccion.moneda) ?? { ingresos: 0, gastos: 0 };
      if (transaccion.tipo === 'INGRESO') totales.ingresos += Number(transaccion.monto);
      else totales.gastos += Number(transaccion.monto);
      resumen.set(transaccion.moneda, totales);
    }
    return Array.from(resumen, ([moneda, totales]) => ({
      moneda,
      ingresos: totales.ingresos,
      gastos: totales.gastos,
      balance: totales.ingresos - totales.gastos
    }));
  });

  readonly tieneFiltrosActivos = computed(() => {
    return (
      this.filtroTipo() !== '' ||
      this.filtroCuentaId() !== null ||
      this.filtroCategoriaId() !== null ||
      this.filtroFechaInicio() !== '' ||
      this.filtroFechaFin() !== '' ||
      this.filtroBusqueda().trim() !== ''
    );
  });

  ngOnInit(): void {
    this.cargarCuentasYCategorias();
    this.cargarTransacciones();
    const transaccionId = Number(this.route.snapshot.queryParamMap.get('editar'));
    if (Number.isSafeInteger(transaccionId) && transaccionId > 0) {
      this.finanzasService.getTransaccion(transaccionId).subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.toastService.error(response.message || 'No se pudo abrir el movimiento para editar.');
            return;
          }
          this.abrirModalEditar(response.data);
        },
        error: err => this.toastService.error(err.error?.message || 'No se pudo abrir el movimiento para editar.')
      });
    }
  }

  cargarCuentasYCategorias(): void {
    this.finanzasService.getCuentas().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.cuentas.set(res.data.filter(c => c.activo));
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

  cargarTransacciones(): void {
    this.loading.set(true);
    this.error.set(null);

    const filtros: TransaccionFiltro = {
      tipo: this.filtroTipo(),
      cuentaId: this.filtroCuentaId(),
      categoriaId: this.filtroCategoriaId(),
      fechaInicio: this.filtroFechaInicio() || null,
      fechaFin: this.filtroFechaFin() || null,
      busqueda: this.filtroBusqueda()
    };

    this.finanzasService.getTransaccionesPaginadas(filtros, this.paginaActual(), this.tamanioPagina()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.pageData.set(res.data);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al obtener transacciones');
      }
    });
  }

  onBusquedaChange(val: string): void {
    this.filtroBusqueda.set(val);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  setTipoFiltro(tipo: TipoTransaccion | ''): void {
    this.filtroTipo.set(tipo);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onCuentaChange(cuentaId: number | null): void {
    this.filtroCuentaId.set(cuentaId);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onCategoriaChange(categoriaId: number | null): void {
    this.filtroCategoriaId.set(categoriaId);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onFechaInicioChange(fecha: string): void {
    this.filtroFechaInicio.set(fecha);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onFechaFinChange(fecha: string): void {
    this.filtroFechaFin.set(fecha);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  aplicarRangoRapido(preset: 'ESTE_MES' | 'MES_PASADO' | 'ULTIMOS_30' | 'TODO'): void {
    const hoy = new Date();
    if (preset === 'TODO') {
      this.filtroFechaInicio.set('');
      this.filtroFechaFin.set('');
    } else if (preset === 'ESTE_MES') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      this.filtroFechaInicio.set(inicio.toISOString().split('T')[0]);
      this.filtroFechaFin.set(fin.toISOString().split('T')[0]);
    } else if (preset === 'MES_PASADO') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      this.filtroFechaInicio.set(inicio.toISOString().split('T')[0]);
      this.filtroFechaFin.set(fin.toISOString().split('T')[0]);
    } else if (preset === 'ULTIMOS_30') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 30);
      this.filtroFechaInicio.set(inicio.toISOString().split('T')[0]);
      this.filtroFechaFin.set(hoy.toISOString().split('T')[0]);
    }

    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  limpiarFiltros(): void {
    this.filtroTipo.set('');
    this.filtroCuentaId.set(null);
    this.filtroCategoriaId.set(null);
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
    this.filtroBusqueda.set('');
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  exportarCsv(): void {
    const filtros: TransaccionFiltro = {
      tipo: this.filtroTipo(),
      cuentaId: this.filtroCuentaId(),
      categoriaId: this.filtroCategoriaId(),
      fechaInicio: this.filtroFechaInicio() || null,
      fechaFin: this.filtroFechaFin() || null,
      busqueda: this.filtroBusqueda()
    };
    this.exportando.set(true);
    this.finanzasService.exportarTransaccionesCsv(filtros).subscribe({
      next: respuesta => {
        this.exportando.set(false);
        if (!respuesta.body) {
          this.toastService.error('El servidor devolvió un archivo CSV vacío.');
          return;
        }
        const disposition = respuesta.headers.get('Content-Disposition');
        const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'movimientos.csv';
        const url = URL.createObjectURL(respuesta.body);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = filename;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: err => {
        this.exportando.set(false);
        this.toastService.error(err.error?.message || 'No se pudieron exportar los movimientos.');
      }
    });
  }

  irAPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && (!this.pageData() || nuevaPagina < this.pageData()!.totalPages)) {
      this.paginaActual.set(nuevaPagina);
      this.cargarTransacciones();
    }
  }

  calcularLimiteSuperior(): number {
    if (!this.pageData()) return 0;
    return Math.min((this.paginaActual() + 1) * this.tamanioPagina(), this.pageData()!.totalElements);
  }

  async eliminarMovimiento(id: number): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Eliminar Movimiento',
      message: '¿Eliminar este movimiento? Los saldos se recalcularán automáticamente.',
      type: 'danger'
    });

    if (confirmed) {
      this.finanzasService.eliminarTransaccion(id).subscribe({
        next: () => {
          this.cargarTransacciones();
          this.cargarCuentasYCategorias();
          this.toastService.success('Movimiento eliminado correctamente');
        },
        error: (err) => {
          this.toastService.error('Error al eliminar: ' + (err.error?.message || 'Desconocido'));
        }
      });
    }
  }

  // --- Modal Logic ---
  abrirModal(tipo: TipoTransaccion): void {
    this.modoEdicion.set(false);
    this.transaccionEditando.set(null);
    this.formTipo.set(tipo);
    this.formMonto = null;
    this.formNotas = '';
    this.movimientoRecurrente = false;
    this.frecuenciaRecurrencia = 'MENSUAL';
    this.siguienteFechaRecurrencia = '';
    this.formFecha = new Date().toISOString().split('T')[0];
    this.modalError.set(null);

    const lista = this.cuentas();
    this.formTasaCambio = null;
    if (lista.length > 0) {
      this.formCuentaId = lista[0].id;
      if (lista.length > 1) {
        this.formCuentaDestinoId = lista[1].id;
      }
    }

    const cats = this.categoriasModal();
    this.formCategoriaId = cats.length > 0 ? cats[0].id : null;
    this.modalAbierto.set(true);
  }

  abrirModalEditar(transaccion: Transaccion): void {
    if (transaccion.tipo === 'SALDO_INICIAL') return;
    this.modoEdicion.set(true);
    this.transaccionEditando.set(transaccion);
    this.formTipo.set(transaccion.tipo);
    this.formMonto = transaccion.monto;
    this.movimientoRecurrente = false;
    this.formCuentaId = transaccion.cuentaId;
    this.formCuentaDestinoId = transaccion.cuentaDestinoId ?? null;
    this.formTasaCambio = transaccion.tasaCambio ?? null;
    this.formCategoriaId = transaccion.categoriaId ?? null;
    this.formFecha = transaccion.fecha;
    this.formNotas = transaccion.notas ?? '';
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalError.set(null);
    this.modoEdicion.set(false);
    this.transaccionEditando.set(null);
    if (this.route.snapshot.queryParamMap.has('editar')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editar: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  cambiarTipoModal(tipo: TipoTransaccion): void {
    this.formTipo.set(tipo);
    if (tipo === 'TRANSFERENCIA') this.movimientoRecurrente = false;
    const cats = this.categoriasModal();
    this.formCategoriaId = cats.length > 0 ? cats[0].id : null;
    if (tipo === 'TRANSFERENCIA') {
      this.formCuentaDestinoId = this.cuentas().find(cuenta => cuenta.id !== this.formCuentaId)?.id ?? null;
    } else {
      this.formCuentaDestinoId = null;
      this.formTasaCambio = null;
    }
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

    const transaccion = this.transaccionEditando();
    const request = transaccion
      ? this.finanzasService.actualizarTransaccion(transaccion.id, payload)
      : this.finanzasService.crearTransaccion(payload);
    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.cerrarModal();
        this.cargarTransacciones();
        this.cargarCuentasYCategorias();
        this.toastService.success(transaccion ? 'Movimiento actualizado correctamente.' : 'Movimiento registrado correctamente.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.modalError.set(err.error?.message || 'Error al guardar la transacción');
      }
    });
  }
}
