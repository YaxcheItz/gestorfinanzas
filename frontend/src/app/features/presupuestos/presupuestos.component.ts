import { MontoPrivadoDirective } from '../../shared/directives/monto-privado.directive';
import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { ListaContextoService } from '../../core/services/lista-contexto.service';
import {
  Categoria,
  MONEDAS_DISPONIBLES,
  Presupuesto,
  PresupuestoDetalle,
  PresupuestoPayload,
  PresupuestoResumen
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-presupuestos',
  standalone: true,
  imports: [MontoPrivadoDirective, CommonModule, FormsModule, FocusTrapDirective, MontoPipe],
  template: `
    <div class="finance-page budgets-page max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      
      <!-- Encabezado y Navegación de Período -->
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Presupuestos
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pon un límite a lo que importa y revisa cuánto te queda.
          </p>
        </div>

        <div class="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <!-- Selector de Mes y Año -->
          <div class="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
            <select
              [ngModel]="mesSeleccionado()"
              (ngModelChange)="cambiarMes($event)"
              aria-label="Mes del presupuesto"
              class="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5 px-2 focus:outline-hidden cursor-pointer">
              @for (mes of meses; track mes.numero) {
                <option [value]="mes.numero">{{ mes.nombre }}</option>
              }
            </select>
            <span class="text-slate-300 dark:text-slate-600">|</span>
            <select
              [ngModel]="anioSeleccionado()"
              (ngModelChange)="cambiarAnio($event)"
              aria-label="Año del presupuesto"
              class="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5 px-2 focus:outline-hidden cursor-pointer">
              @for (anio of aniosDisponibles; track anio) {
                <option [value]="anio">{{ anio }}</option>
              }
            </select>
          </div>

          <!-- Botón Nuevo Presupuesto -->
          <button 
            type="button"
            (click)="abrirModalNuevo()"
            class="inline-flex min-h-11 items-center justify-center px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Fijar Presupuesto
          </button>
        </div>
      </div>

      <!-- Alertas o Mensaje de Error -->
      @if (error()) {
        <div role="alert" class="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-2xl flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-rose-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ error() }}</span>
          </div>
          <button (click)="cargarPresupuestos()" class="text-xs font-semibold text-rose-800 hover:underline cursor-pointer">
            Reintentar
          </button>
        </div>
      }

      <!-- Totales separados por moneda -->
      @if (!loading() && !error()) {
      <section class="space-y-4" aria-label="Totales de presupuestos por moneda">
        @for (moneda of resumen()?.resumenPorMoneda ?? []; track moneda.moneda) {
          <article class="budget-overview rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div class="flex items-start justify-between gap-4">
              <div><p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Límites del mes</p><h2 class="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{{ moneda.moneda }}</h2></div>
              <span class="budget-overview__percent" [class.is-over]="moneda.totalDisponible < 0">{{ moneda.porcentajeConsumido | number:'1.0-0' }}%</span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div><p class="text-xs font-medium text-slate-500 dark:text-slate-400">Ya gastaste</p><p class="mt-1 break-words text-xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">{{ moneda.totalGastado | monto:moneda.moneda:'symbol':'1.2-2' }}</p></div>
              <div class="text-right"><p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ moneda.totalDisponible >= 0 ? 'Te queda' : 'Te excediste' }}</p><p class="mt-1 break-words text-xl font-bold tracking-tight tabular-nums" [ngClass]="moneda.totalDisponible >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'">{{ (moneda.totalDisponible >= 0 ? moneda.totalDisponible : -moneda.totalDisponible) | monto:moneda.moneda:'symbol':'1.2-2' }}</p></div>
            </div>
            <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" [attr.aria-label]="'Uso del presupuesto en ' + moneda.moneda" aria-valuemin="0" [attr.aria-valuemax]="moneda.totalPresupuestado" [attr.aria-valuenow]="gastadoLimitado(moneda.totalGastado, moneda.totalPresupuestado)"><div [style.width.%]="obtenerAnchoBarra(moneda.porcentajeConsumido)" [class]="obtenerColorBarra(moneda.porcentajeConsumido)" class="h-full rounded-full"></div></div>
            <p class="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">de {{ moneda.totalPresupuestado | monto:moneda.moneda:'symbol':'1.2-2' }} presupuestados</p>
          </article>
        }
      </section>
      }

      <!-- Sección de Tarjetas de Presupuesto por Categoría -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">Tus categorías</h2>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
            Período: {{ nombreMes(mesSeleccionado()) }} {{ anioSeleccionado() }}
          </span>
        </div>

        @if (loading()) {
          <div class="finance-loading-list" role="status" aria-label="Cargando presupuestos"><span class="sr-only">Calculando presupuestos del período...</span>@for (fila of [0,1,2]; track fila) {<div class="finance-loading-card" aria-hidden="true"><span class="loading-placeholder"></span><span class="loading-placeholder loading-placeholder--amount"></span></div>}</div>
        } @else if (error()) {
          <p class="finance-state-note">No pudimos consultar este período. Tus límites guardados se conservan.</p>
        } @else if ((resumen()?.presupuestos?.length || 0) === 0) {
          <!-- Empty State -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 sm:p-8 text-center space-y-4 [overflow-wrap:anywhere]">
            <div class="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div class="max-w-md mx-auto">
              <h3 class="text-base font-bold text-slate-800 dark:text-white">No hay presupuestos fijados para este mes</h3>
              <p class="text-xs text-slate-400 mt-1">
                Fija límites de gasto en tus categorías clave para recibir alertas antes de sobrepasar tu presupuesto.
              </p>
            </div>
            <button 
              type="button"
              (click)="abrirModalNuevo()"
              class="inline-flex min-h-11 max-w-full items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="min-w-0 [overflow-wrap:anywhere]">Crear primer presupuesto</span>
            </button>
          </div>
        } @else {
          <!-- Grid de Tarjetas de Presupuesto -->
          <div class="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
            @for (p of resumen()?.presupuestos; track p.id) {
              <article class="budget-category-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-700 dark:bg-slate-900">
                
                <!-- Encabezado de la Tarjeta -->
                <div class="budget-category-head flex items-start justify-between">
                  <div class="flex min-w-0 items-center space-x-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-emerald-700 font-bold text-sm dark:bg-slate-700 dark:text-emerald-300">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ p.categoriaNombre }}</h3>
                        @if (p.listaNombre) {
                          <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {{ p.listaNombre }}
                          </span>
                        }
                      </div>
                      <span 
                        [class]="obtenerBadgeEstadoClass(p.estado)"
                        class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        {{ p.estado === 'EXCEDIDO' ? 'Excedido' : (p.estado === 'ALERTA' ? 'Cerca del límite (' + (p.porcentajeAlerta || 80) + '%)' : 'Bajo control') }}
                      </span>
                    </div>
                  </div>

                  <!-- Botones de Acción -->
                  <div class="flex items-center space-x-1">
                    <button 
                      type="button"
                      (click)="abrirDetalle(p)"
                      [attr.aria-label]="'Ver detalle y movimientos de ' + p.categoriaNombre"
                      class="h-10 w-10 inline-flex items-center justify-center text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Ver detalle de gastos">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      (click)="abrirModalEditar(p)"
                      [attr.aria-label]="'Modificar presupuesto de ' + p.categoriaNombre"
                      class="h-10 w-10 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Modificar límite">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <details class="budget-manage">
                    <summary [attr.aria-label]="'Más opciones de ' + p.categoriaNombre">⋯</summary>
                    <button 
                      type="button"
                      (click)="eliminarPresupuesto(p.id)"
                      [attr.aria-label]="'Eliminar presupuesto de ' + p.categoriaNombre"
                      class="budget-manage__delete inline-flex items-center justify-center text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Eliminar meta de presupuesto">
                      Eliminar
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    </details>
                  </div>
                </div>

                <!-- Barra de Progreso y Montos -->
                <div class="budget-remaining" [class.is-over]="p.montoDisponible < 0"><span>{{ p.montoDisponible >= 0 ? 'Te queda' : 'Te excediste' }} · {{ p.moneda }}</span><strong>{{ (p.montoDisponible >= 0 ? p.montoDisponible : -p.montoDisponible) | monto:p.moneda:'symbol':'1.2-2' }}</strong></div>
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-slate-500 dark:text-slate-400">Gastado: {{ p.montoGastado | monto:p.moneda:'symbol':'1.2-2' }}</span>
                    <span class="font-bold text-slate-800 dark:text-slate-100">Meta: {{ p.montoLimite | monto:p.moneda:'symbol':'1.2-2' }}</span>
                  </div>

                  <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" [attr.aria-label]="'Uso del presupuesto de ' + p.categoriaNombre" aria-valuemin="0" [attr.aria-valuemax]="p.montoLimite" [attr.aria-valuenow]="gastadoLimitado(p.montoGastado, p.montoLimite)">
                    <div 
                      [style.width.%]="obtenerAnchoBarra(p.porcentajeConsumido)"
                      [class]="obtenerColorBarra(p.porcentajeConsumido)"
                      class="h-full rounded-full transition-all duration-500">
                    </div>
                    @if (p.porcentajeAlerta && p.porcentajeAlerta < 100) {
                      <div class="absolute top-0 bottom-0 w-0.5 bg-amber-500/80 pointer-events-none"
                           [style.left.%]="p.porcentajeAlerta"
                           [title]="'Aviso al ' + p.porcentajeAlerta + '%'">
                      </div>
                    }
                  </div>

                  <div class="flex items-center justify-between text-xs pt-1">
                    <span class="text-slate-500 dark:text-slate-400">
                      Del límite mensual
                      @if (p.porcentajeAlerta) { · aviso al {{ p.porcentajeAlerta }}% }
                    </span>
                    <span class="font-bold text-slate-700 dark:text-slate-200">
                      {{ p.porcentajeConsumido | number:'1.0-0' }}%
                    </span>
                  </div>
                </div>

              </article>
            }
          </div>
        }
      </div>

    </div>

    <!-- Modal Interactivo 'Fijar Presupuesto' -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xs sm:items-center sm:p-4">
        
        <div appFocusTrap (focusTrapEscape)="cerrarModal()" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="presupuesto-modal-titulo" class="budget-entry-sheet max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl">
          
          <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700 sm:p-6">
            <h2 id="presupuesto-modal-titulo" class="text-lg font-bold text-slate-900 dark:text-white">
              {{ modoEdicion() ? 'Editar Presupuesto' : 'Fijar Presupuesto' }}
            </h2>
            <button 
              type="button"
              (click)="cerrarModal()" 
              aria-label="Cerrar formulario de presupuesto"
              class="inline-flex min-h-11 min-w-11 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form (ngSubmit)="guardarPresupuesto()" class="p-4 sm:p-6 space-y-4">
            
            @if (modalError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {{ modalError() }}
              </div>
            }

            <!-- Categoría -->
            <div>
              <label for="modalCat" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <select
                id="modalCat"
                required
                [disabled]="modoEdicion()"
                [(ngModel)]="formCategoriaId"
                name="categoriaId"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <option [ngValue]="null" disabled>Selecciona una categoría de gasto</option>
                @for (cat of categorias(); track cat.id) {
                  <option [ngValue]="cat.id">{{ cat.nombre }}</option>
                }
              </select>
            </div>

            <!-- Lista financiera -->
            <div>
              <label for="modalLista" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Lista financiera
              </label>
              <select
                id="modalLista"
                [(ngModel)]="formListaId"
                name="listaId"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <option [ngValue]="null">Personal (Sin lista específica)</option>
                @for (lista of listasEditables(); track lista.id) {
                  <option [ngValue]="lista.id">{{ lista.emoji }} {{ lista.nombre }}</option>
                }
              </select>
            </div>

            <div>
              <label for="modalMoneda" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Moneda del presupuesto</label>
              <select id="modalMoneda" [(ngModel)]="formMoneda" name="moneda" required class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                @for (moneda of monedasDisponibles; track moneda.codigo) {
                  <option [ngValue]="moneda.codigo">{{ moneda.codigo }} — {{ moneda.nombre }}</option>
                }
              </select>
            </div>

            <!-- Monto Límite -->
            <div>
              <label for="modalMonto" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Monto límite mensual ({{ formMoneda }})
              </label>
              <div class="relative rounded-xl shadow-2xs">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  {{ formMoneda }}
                </div>
                <input appMontoPrivado
                  id="modalMonto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  [(ngModel)]="formMontoLimite"
                  name="montoLimite"
                  placeholder="0.00"
                  class="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>

            <!-- Umbral de aviso -->
            <div>
              <label for="modalAlerta" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Avisar al alcanzar (% del límite)
              </label>
              <div class="relative rounded-xl shadow-2xs">
                <input
                  id="modalAlerta"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  required
                  [(ngModel)]="formPorcentajeAlerta"
                  name="porcentajeAlerta"
                  placeholder="80"
                  class="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
                <span class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-semibold">%</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Aviso preventivo al alcanzar este porcentaje de consumo.</p>
            </div>

            <!-- Período informativo -->
            <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Período de aplicación:</span>
              <span class="font-bold text-slate-800 dark:text-white">{{ nombreMes(mesSeleccionado()) }} {{ anioSeleccionado() }}</span>
            </div>

            <!-- Botones de Acción -->
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                type="button"
                (click)="cerrarModal()"
                class="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
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
                  <span>{{ modoEdicion() ? 'Actualizar Meta' : 'Guardar Presupuesto' }}</span>
                }
              </button>
            </div>

          </form>

        </div>
      </div>
    }

    <!-- Modal Detalle del Presupuesto y Movimientos -->
    @if (modalDetalleAbierto()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xs sm:items-center sm:p-4">
        <div appFocusTrap (focusTrapEscape)="cerrarDetalle()" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="detalle-modal-titulo" class="budget-entry-sheet max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl">
          
          <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700 sm:p-6">
            <div>
              <h2 id="detalle-modal-titulo" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Detalle del Presupuesto</span>
                @if (detallePresupuesto()?.presupuesto?.listaNombre; as ln) {
                  <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {{ ln }}
                  </span>
                }
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {{ detallePresupuesto()?.presupuesto?.categoriaNombre }} · {{ nombreMes(mesSeleccionado()) }} {{ anioSeleccionado() }}
              </p>
            </div>
            <button 
              type="button"
              (click)="cerrarDetalle()" 
              aria-label="Cerrar detalle"
              class="inline-flex min-h-11 min-w-11 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-4 sm:p-6 space-y-5">
            @if (loadingDetalle()) {
              <div class="flex items-center justify-center py-10 text-sm text-slate-500">
                <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                Cargando movimientos del presupuesto...
              </div>
            } @else if (errorDetalle()) {
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {{ errorDetalle() }}
              </div>
            } @else if (detallePresupuesto(); as det) {
              <!-- Resumen de montos -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Límite mensual</p>
                  <p class="text-base font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">
                    {{ det.presupuesto.montoLimite | monto:det.presupuesto.moneda:'symbol':'1.2-2' }}
                  </p>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total gastado</p>
                  <p class="text-base font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {{ det.presupuesto.montoGastado | monto:det.presupuesto.moneda:'symbol':'1.2-2' }}
                  </p>
                </div>
                <div class="p-3 col-span-2 sm:col-span-1 rounded-xl border"
                     [ngClass]="det.presupuesto.montoDisponible >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200' : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'">
                  <p class="text-[11px] font-medium opacity-80">{{ det.presupuesto.montoDisponible >= 0 ? 'Disponible restante' : 'Excedido por' }}</p>
                  <p class="text-base font-bold tabular-nums mt-0.5">
                    {{ (det.presupuesto.montoDisponible >= 0 ? det.presupuesto.montoDisponible : -det.presupuesto.montoDisponible) | monto:det.presupuesto.moneda:'symbol':'1.2-2' }}
                  </p>
                </div>
              </div>

              <!-- Barra visual con umbral de alerta -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-slate-600 dark:text-slate-400">
                    Consumido: {{ det.presupuesto.porcentajeConsumido | number:'1.0-0' }}%
                  </span>
                  <span class="text-slate-500 text-[11px]">
                    Umbral de aviso: {{ det.presupuesto.porcentajeAlerta || 80 }}%
                  </span>
                </div>
                <div class="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div 
                    [style.width.%]="obtenerAnchoBarra(det.presupuesto.porcentajeConsumido)"
                    [class]="obtenerColorBarra(det.presupuesto.porcentajeConsumido)"
                    class="h-full rounded-full transition-all duration-300">
                  </div>
                  @if (det.presupuesto.porcentajeAlerta && det.presupuesto.porcentajeAlerta < 100) {
                    <span class="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10 pointer-events-none" [style.left.%]="det.presupuesto.porcentajeAlerta" [title]="'Aviso al ' + det.presupuesto.porcentajeAlerta + '%'"></span>
                  }
                </div>
              </div>

              <!-- Lista de movimientos del periodo -->
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Movimientos del período ({{ det.movimientos.length }})
                </h3>
                @if (det.movimientos.length === 0) {
                  <div class="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    No hay gastos registrados en esta categoría durante este período.
                  </div>
                } @else {
                  <div class="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                    @for (m of det.movimientos; track m.id) {
                      <div class="p-3 flex items-center justify-between text-xs hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                        <div class="min-w-0 pr-3">
                          <p class="font-semibold text-slate-800 dark:text-white truncate">
                            {{ m.descripcion || det.presupuesto.categoriaNombre }}
                          </p>
                          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{{ m.fecha }}</span>
                            @if (m.cuentaNombre) { <span>· {{ m.cuentaNombre }}</span> }
                            @for (tag of m.etiquetas ?? []; track tag) {
                              <span class="bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1 py-0.2 rounded text-[10px]">#{{ tag }}</span>
                            }
                          </p>
                        </div>
                        <span class="font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                          {{ m.monto | monto:det.presupuesto.moneda:'symbol':'1.2-2' }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Acciones del detalle -->
              <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  (click)="editarDesdeDetalle(det.presupuesto)"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                  Modificar límite
                </button>
                <button 
                  type="button"
                  (click)="cerrarDetalle()"
                  class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                  Cerrar
                </button>
              </div>
            }
          </div>

        </div>
      </div>
    }
  `
})
export class PresupuestosComponent implements OnInit {
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly contextoLista = inject(ListaContextoService);
  private presupuestoRequest?: Subscription;

  readonly meses = [
    { numero: 1, nombre: 'Enero' },
    { numero: 2, nombre: 'Febrero' },
    { numero: 3, nombre: 'Marzo' },
    { numero: 4, nombre: 'Abril' },
    { numero: 5, nombre: 'Mayo' },
    { numero: 6, nombre: 'Junio' },
    { numero: 7, nombre: 'Julio' },
    { numero: 8, nombre: 'Agosto' },
    { numero: 9, nombre: 'Septiembre' },
    { numero: 10, nombre: 'Octubre' },
    { numero: 11, nombre: 'Noviembre' },
    { numero: 12, nombre: 'Diciembre' }
  ];

  readonly aniosDisponibles = [2024, 2025, 2026, 2027];

  // Signals de Estado
  readonly mesSeleccionado = signal<number>(new Date().getMonth() + 1);
  readonly anioSeleccionado = signal<number>(new Date().getFullYear());
  readonly resumen = signal<PresupuestoResumen | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Modal Signals
  readonly modalAbierto = signal<boolean>(false);
  readonly modoEdicion = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  // Detalle Signals
  readonly modalDetalleAbierto = signal<boolean>(false);
  readonly detallePresupuesto = signal<PresupuestoDetalle | null>(null);
  readonly loadingDetalle = signal<boolean>(false);
  readonly errorDetalle = signal<string | null>(null);

  // Form Fields
  formCategoriaId: number | null = null;
  formMontoLimite: number | null = null;
  formMoneda = 'MXN';
  formListaId: number | null = null;
  formPorcentajeAlerta: number = 80;
  readonly monedasDisponibles = MONEDAS_DISPONIBLES;

  private listaObservada: number | null | undefined = undefined;

  constructor() {
    effect(() => {
      const actual = this.contextoLista.activaId();
      if (this.listaObservada === undefined) {
        this.listaObservada = actual;
        return;
      }
      if (this.listaObservada !== actual) {
        this.listaObservada = actual;
        untracked(() => this.cargarPresupuestos());
      }
    });
  }

  listasEditables() {
    return this.contextoLista.listas().filter(l => !l.archivada && l.rol !== 'LECTOR');
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarPresupuestos();
  }

  cargarPresupuestos(): void {
    this.presupuestoRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.presupuestoRequest = this.finanzasService.getPresupuestos(
      this.mesSeleccionado(),
      this.anioSeleccionado(),
      this.contextoLista.activaId()
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.resumen.set(res.data);
        } else {
          this.error.set('No pudimos consultar los presupuestos. Vuelve a intentarlo.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al obtener los presupuestos');
      }
    });
  }

  cargarCategorias(): void {
    this.finanzasService.getCategorias().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const deGasto = res.data.filter(c => c.tipo === 'GASTO');
          this.categorias.set(deGasto);
        }
      }
    });
  }

  cambiarMes(nuevoMes: number): void {
    this.mesSeleccionado.set(Number(nuevoMes));
    this.cargarPresupuestos();
  }

  cambiarAnio(nuevoAnio: number): void {
    this.anioSeleccionado.set(Number(nuevoAnio));
    this.cargarPresupuestos();
  }

  abrirModalNuevo(): void {
    this.modoEdicion.set(false);
    this.modalError.set(null);
    this.formMontoLimite = null;
    this.formMoneda = 'MXN';
    this.formListaId = this.contextoLista.activaId();
    this.formPorcentajeAlerta = 80;
    const cats = this.categorias();
    this.formCategoriaId = cats.length > 0 ? cats[0].id : null;
    this.modalAbierto.set(true);
  }

  abrirModalEditar(p: Presupuesto): void {
    this.modoEdicion.set(true);
    this.modalError.set(null);
    this.formCategoriaId = p.categoriaId;
    this.formMontoLimite = p.montoLimite;
    this.formMoneda = p.moneda;
    this.formListaId = p.listaId ?? null;
    this.formPorcentajeAlerta = p.porcentajeAlerta ?? 80;
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalError.set(null);
  }

  abrirDetalle(p: Presupuesto): void {
    this.modalDetalleAbierto.set(true);
    this.loadingDetalle.set(true);
    this.errorDetalle.set(null);
    this.detallePresupuesto.set(null);
    this.finanzasService.getPresupuestoDetalle(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.loadingDetalle.set(false);
        if (res.success && res.data) {
          this.detallePresupuesto.set(res.data);
        } else {
          this.errorDetalle.set('No pudimos cargar los movimientos del presupuesto.');
        }
      },
      error: (err) => {
        this.loadingDetalle.set(false);
        this.errorDetalle.set(err.error?.message || 'Error al cargar los movimientos del presupuesto');
      }
    });
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.detallePresupuesto.set(null);
    this.errorDetalle.set(null);
  }

  editarDesdeDetalle(p: Presupuesto): void {
    this.cerrarDetalle();
    this.abrirModalEditar(p);
  }

  guardarPresupuesto(): void {
    if (!this.formCategoriaId) {
      this.modalError.set('Selecciona una categoría');
      return;
    }
    if (!this.formMontoLimite || this.formMontoLimite <= 0) {
      this.modalError.set('Ingresa un monto límite válido mayor a 0');
      return;
    }
    if (!this.formPorcentajeAlerta || this.formPorcentajeAlerta < 1 || this.formPorcentajeAlerta > 100) {
      this.modalError.set('El porcentaje de alerta debe estar entre 1% y 100%');
      return;
    }

    const payload: PresupuestoPayload = {
      categoriaId: this.formCategoriaId,
      montoLimite: this.formMontoLimite,
      moneda: this.formMoneda,
      mes: this.mesSeleccionado(),
      anio: this.anioSeleccionado(),
      listaId: this.formListaId,
      porcentajeAlerta: this.formPorcentajeAlerta
    };

    this.submitting.set(true);
    this.modalError.set(null);

    this.finanzasService.guardarPresupuesto(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.cerrarModal();
        this.cargarPresupuestos();
      },
      error: (err) => {
        this.submitting.set(false);
        this.modalError.set(err.error?.message || 'Error al guardar el presupuesto');
      }
    });
  }

  async eliminarPresupuesto(id: number): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Eliminar Presupuesto',
      message: '¿Deseas eliminar este presupuesto para el mes actual?',
      type: 'warning'
    });

    if (confirmed) {
      this.finanzasService.eliminarPresupuesto(id).subscribe({
        next: () => {
          this.cargarPresupuestos();
          this.toastService.success('Presupuesto eliminado correctamente');
        },
        error: (err) => {
          this.toastService.error('Error al eliminar presupuesto: ' + (err.error?.message || 'Desconocido'));
        }
      });
    }
  }

  nombreMes(mes: number): string {
    const found = this.meses.find(m => m.numero === mes);
    return found ? found.nombre : '';
  }

  obtenerAnchoBarra(porcentaje: number): number {
    return Math.min(Math.max(porcentaje, 0), 100);
  }

  gastadoLimitado(gastado: number, limite: number): number {
    return Math.min(Math.max(gastado, 0), Math.max(limite, 0));
  }

  obtenerColorBarra(porcentaje: number): string {
    if (porcentaje >= 100) return 'bg-rose-500';
    if (porcentaje >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  obtenerBadgeEstadoClass(estado: string): string {
    switch (estado) {
      case 'EXCEDIDO':
        return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'ALERTA':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    }
  }
}
