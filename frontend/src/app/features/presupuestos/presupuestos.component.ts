import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import {
  Categoria,
  MONEDAS_DISPONIBLES,
  Presupuesto,
  PresupuestoPayload,
  PresupuestoResumen
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-presupuestos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      
      <!-- Encabezado y Navegación de Período -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Control de Presupuestos
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Establece metas de gasto por categoría y mantén tus finanzas bajo control.
          </p>
        </div>

        <div class="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <!-- Selector de Mes y Año -->
          <div class="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <select
              [ngModel]="mesSeleccionado()"
              (ngModelChange)="cambiarMes($event)"
              class="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 py-1.5 px-2 focus:outline-hidden cursor-pointer">
              @for (mes of meses; track mes.numero) {
                <option [value]="mes.numero">{{ mes.nombre }}</option>
              }
            </select>
            <span class="text-slate-300">|</span>
            <select
              [ngModel]="anioSeleccionado()"
              (ngModelChange)="cambiarAnio($event)"
              class="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 py-1.5 px-2 focus:outline-hidden cursor-pointer">
              @for (anio of aniosDisponibles; track anio) {
                <option [value]="anio">{{ anio }}</option>
              }
            </select>
          </div>

          <!-- Botón Nuevo Presupuesto -->
          <button 
            type="button"
            (click)="abrirModalNuevo()"
            class="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Fijar Presupuesto
          </button>
        </div>
      </div>

      <!-- Alertas o Mensaje de Error -->
      @if (error()) {
        <div class="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-2xl flex items-center justify-between">
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
      <section class="space-y-4" aria-label="Totales de presupuestos por moneda">
        @for (moneda of resumen()?.resumenPorMoneda ?? []; track moneda.moneda) {
          <article class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 class="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">{{ moneda.moneda }}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><p class="text-xs text-slate-500">Presupuestado</p><p class="mt-1 text-xl font-bold text-slate-900">{{ moneda.totalPresupuestado | currency:moneda.moneda:'symbol':'1.2-2' }}</p></div>
              <div><p class="text-xs text-slate-500">Gastado</p><p class="mt-1 text-xl font-bold text-rose-600">{{ moneda.totalGastado | currency:moneda.moneda:'symbol':'1.2-2' }}</p></div>
              <div><p class="text-xs text-slate-500">Disponible</p><p class="mt-1 text-xl font-bold" [class.text-emerald-600]="moneda.totalDisponible >= 0" [class.text-rose-600]="moneda.totalDisponible < 0">{{ moneda.totalDisponible | currency:moneda.moneda:'symbol':'1.2-2' }}</p></div>
              <div><p class="text-xs text-slate-500">Consumo</p><p class="mt-1 text-xl font-bold text-violet-600">{{ moneda.porcentajeConsumido | number:'1.1-1' }}%</p></div>
            </div>
          </article>
        } @empty {
          <p class="p-5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-500">Todavía no hay presupuestos para este período.</p>
        }
      </section>

      <!-- Sección de Tarjetas de Presupuesto por Categoría -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <h2 class="text-lg font-bold text-slate-900">Presupuestos por Categoría</h2>
          <span class="text-xs font-medium text-slate-500">
            Período: {{ nombreMes(mesSeleccionado()) }} {{ anioSeleccionado() }}
          </span>
        </div>

        @if (loading()) {
          <div class="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <div class="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Calculando presupuestos del período...</span>
          </div>
        } @else if ((resumen()?.presupuestos?.length || 0) === 0) {
          <!-- Empty State -->
          <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-4">
            <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div class="max-w-md mx-auto">
              <h3 class="text-base font-bold text-slate-800">No hay presupuestos fijados para este mes</h3>
              <p class="text-xs text-slate-400 mt-1">
                Fija límites de gasto en tus categorías clave (comida, transporte, ocio) para recibir alertas antes de sobrepasar tu presupuesto.
              </p>
            </div>
            <button 
              type="button"
              (click)="abrirModalNuevo()"
              class="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Crear primer presupuesto
            </button>
          </div>
        } @else {
          <!-- Grid de Tarjetas de Presupuesto -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (p of resumen()?.presupuestos; track p.id) {
              <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
                
                <!-- Encabezado de la Tarjeta -->
                <div class="flex items-start justify-between">
                  <div class="flex items-center space-x-3">
                    <div 
                      [style.backgroundColor]="(p.categoriaColor || '#10b981') + '15'"
                      [style.color]="p.categoriaColor || '#10b981'"
                      class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-900 text-sm">{{ p.categoriaNombre }}</h3>
                      <span 
                        [class]="obtenerBadgeEstadoClass(p.estado)"
                        class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        {{ p.estado === 'EXCEDIDO' ? 'Excedido' : (p.estado === 'ALERTA' ? 'Cerca del límite' : 'Bajo control') }}
                      </span>
                    </div>
                  </div>

                  <!-- Botones de Acción -->
                  <div class="flex items-center space-x-1">
                    <button 
                      type="button"
                      (click)="abrirModalEditar(p)"
                      class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Modificar límite">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      (click)="eliminarPresupuesto(p.id)"
                      class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar meta de presupuesto">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Barra de Progreso y Montos -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium">Gastado: {{ p.montoGastado | currency:p.moneda:'symbol':'1.2-2' }}</span>
                    <span class="font-bold text-slate-800">Meta: {{ p.montoLimite | currency:p.moneda:'symbol':'1.2-2' }}</span>
                  </div>

                  <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      [style.width.%]="obtenerAnchoBarra(p.porcentajeConsumido)"
                      [class]="obtenerColorBarra(p.porcentajeConsumido)"
                      class="h-full rounded-full transition-all duration-500">
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-1">
                    <span 
                      [class]="p.montoDisponible >= 0 ? 'text-slate-500' : 'text-rose-600 font-bold'">
                      {{ p.montoDisponible >= 0 ? 'Disponible: ' : 'Excedido por: ' }}{{ (p.montoDisponible >= 0 ? p.montoDisponible : -p.montoDisponible) | currency:p.moneda:'symbol':'1.2-2' }}
                    </span>
                    <span class="font-bold text-slate-700">
                      {{ p.porcentajeConsumido | number:'1.0-0' }}%
                    </span>
                  </div>
                </div>

              </div>
            }
          </div>
        }
      </div>

    </div>

    <!-- Modal Interactivo 'Fijar Presupuesto' -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4">
        
        <div class="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[calc(100dvh-1rem)] overflow-y-auto border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          
          <div class="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900">
              {{ modoEdicion() ? 'Editar Presupuesto' : 'Fijar Presupuesto' }}
            </h2>
            <button 
              type="button"
              (click)="cerrarModal()" 
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
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
              <label for="modalCat" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <select
                id="modalCat"
                required
                [disabled]="modoEdicion()"
                [(ngModel)]="formCategoriaId"
                name="categoriaId"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                <option [ngValue]="null" disabled>Selecciona una categoría de gasto</option>
                @for (cat of categorias(); track cat.id) {
                  <option [ngValue]="cat.id">{{ cat.nombre }}</option>
                }
              </select>
            </div>

            <div>
              <label for="modalMoneda" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Moneda del presupuesto</label>
              <select id="modalMoneda" [(ngModel)]="formMoneda" name="moneda" required class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                @for (moneda of monedasDisponibles; track moneda.codigo) {
                  <option [ngValue]="moneda.codigo">{{ moneda.codigo }} — {{ moneda.nombre }}</option>
                }
              </select>
            </div>

            <!-- Monto Límite -->
            <div>
              <label for="modalMonto" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Monto límite mensual ({{ formMoneda }})
              </label>
              <div class="relative rounded-xl shadow-2xs">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  {{ formMoneda }}
                </div>
                <input
                  id="modalMonto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  [(ngModel)]="formMontoLimite"
                  name="montoLimite"
                  placeholder="0.00"
                  class="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <!-- Período informativo -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Período de aplicación:</span>
              <span class="font-bold text-slate-800">{{ nombreMes(mesSeleccionado()) }} {{ anioSeleccionado() }}</span>
            </div>

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
                  <span>{{ modoEdicion() ? 'Actualizar Meta' : 'Guardar Presupuesto' }}</span>
                }
              </button>
            </div>

          </form>

        </div>
      </div>
    }
  `
})
export class PresupuestosComponent implements OnInit {
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

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

  // Form Fields
  formCategoriaId: number | null = null;
  formMontoLimite: number | null = null;
  formMoneda = 'MXN';
  readonly monedasDisponibles = MONEDAS_DISPONIBLES;

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarPresupuestos();
  }

  cargarPresupuestos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.finanzasService.getPresupuestos(this.mesSeleccionado(), this.anioSeleccionado()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.resumen.set(res.data);
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
          // Filtrar categorías aplicables a gastos
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
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalError.set(null);
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

    const payload: PresupuestoPayload = {
      categoriaId: this.formCategoriaId,
      montoLimite: this.formMontoLimite,
      moneda: this.formMoneda,
      mes: this.mesSeleccionado(),
      anio: this.anioSeleccionado()
    };

    this.submitting.set(true);
    this.modalError.set(null);

    this.finanzasService.guardarPresupuesto(payload).subscribe({
      next: (res) => {
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
