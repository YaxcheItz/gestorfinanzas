import { MontoPrivadoDirective } from '../../shared/directives/monto-privado.directive';
﻿import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaPayload } from '../../core/models/finanzas.models';
import { FinanzasService } from '../../core/services/finanzas.service';
import { CategoriaOrdenService } from '../../core/services/categoria-orden.service';
import { PerfilService } from '../../core/services/perfil.service';
import { mensajeDeError } from '../../core/utils/mensaje-error';
import { ToastService } from '../../core/services/toast.service';
import { CategoriaIconoComponent } from '../../shared/components/categoria-icono/categoria-icono.component';
import { esEmojiCategoria, ICONOS_CATEGORIA, normalizarIconoCategoria } from '../../shared/components/categoria-icono/categoria-iconos';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [MontoPrivadoDirective, CommonModule, FormsModule, CategoriaIconoComponent, FocusTrapDirective],
  template: `
    <main class="finance-page max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Mis categorías</h1>
          <p class="text-sm text-slate-500 mt-1">Organiza tus ingresos y gastos con categorías propias.</p>
        </div>
        <button type="button" (click)="abrirCrear()" class="min-h-11 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold cursor-pointer">
          + Nueva categoría
        </button>
      </header>

      @if (error()) {
        <div role="alert" class="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex justify-between gap-3">
          <span>{{ error() }}</span>
          <button type="button" (click)="cargar()" class="underline font-semibold cursor-pointer">Reintentar</button>
        </div>
      }

      <div class="inline-flex p-1 bg-slate-100 rounded-xl" role="group" aria-label="Filtrar categorías">
        <button type="button" (click)="mostrarInactivas.set(false)" [class]="!mostrarInactivas() ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer">Activas</button>
        <button type="button" (click)="mostrarInactivas.set(true)" [class]="mostrarInactivas() ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer">Archivadas</button>
      </div>

      @if (loading()) {
        <p class="p-12 bg-white border border-slate-200 rounded-2xl text-center text-sm text-slate-400">Cargando categorías...</p>
      } @else if (categoriasVisibles().length === 0) {
        <p class="p-12 bg-white border border-slate-200 rounded-2xl text-center text-sm text-slate-500">
          {{ mostrarInactivas() ? 'No hay categorías archivadas.' : 'Aún no has creado categorías personalizadas.' }}
        </p>
      } @else {
        <section aria-label="Categorías personalizadas" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          @for (categoria of categoriasVisibles(); track categoria.id) {
            <article
              class="min-w-0 bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 sm:gap-4"
              [class.opacity-70]="!categoria.activo"
              [attr.data-categoria-id]="categoria.id"
              [class.ring-2]="destinoTactil() === categoria.id"
              (dragover)="$event.preventDefault()"
              (drop)="soltarDrag($event, categoria)">
              <button
                type="button"
                draggable="true"
                (dragstart)="iniciarDrag($event, categoria)"
                (pointerdown)="iniciarReordenamientoTactil($event, categoria)"
                (pointermove)="moverReordenamientoTactil($event)"
                (pointerup)="terminarReordenamientoTactil($event)"
                (pointercancel)="cancelarReordenamientoTactil()"
                style="touch-action: none; user-select: none"
                [attr.aria-label]="'Arrastrar para reordenar ' + categoria.nombre"
                class="flex min-h-11 min-w-11 shrink-0 cursor-grab items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing">
                <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.4"/><circle cx="16" cy="6" r="1.4"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>
              </button>
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" [style.backgroundColor]="categoria.color || '#f1f5f9'">
                <app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo" clase="h-5 w-5" />
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="font-semibold text-slate-900 truncate">{{ categoria.nombre }}</h2>
                <p class="text-xs text-slate-500">{{ categoria.tipo === 'GASTO' ? 'Gasto' : 'Ingreso' }} · Personalizada</p>
              </div>
              <div class="flex shrink-0 flex-col">
                <button type="button" (click)="moverCategoria(categoria, -1)" [attr.aria-label]="'Subir ' + categoria.nombre" class="min-h-11 px-2 text-xs font-semibold text-slate-500 hover:text-emerald-700">↑</button>
                <button type="button" (click)="moverCategoria(categoria, 1)" [attr.aria-label]="'Bajar ' + categoria.nombre" class="min-h-11 px-2 text-xs font-semibold text-slate-500 hover:text-emerald-700">↓</button>
              </div>
              @if (categoria.activo) {
                <div class="flex shrink-0 flex-col sm:flex-row">
                  <button type="button" (click)="abrirEditar(categoria)" class="min-h-10 px-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer" [attr.aria-label]="'Editar ' + categoria.nombre">Editar</button>
                  <button type="button" (click)="cambiarEstado(categoria, false)" class="min-h-10 px-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" [attr.aria-label]="'Archivar ' + categoria.nombre">Archivar</button>
                </div>
              } @else {
                <button type="button" (click)="cambiarEstado(categoria, true)" class="min-h-10 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer">Restaurar</button>
              }
            </article>
          }
        </section>
      }
    </main>

    @if (modalAbierto()) {
      <div class="fixed inset-0 z-40 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4">
        <section appFocusTrap (focusTrapEscape)="cerrar()" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="categoria-titulo" class="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1rem)] overflow-y-auto border border-slate-200 shadow-2xl">
          <header class="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 id="categoria-titulo" class="text-lg font-bold text-slate-900">{{ editando() ? 'Editar categoría' : 'Nueva categoría' }}</h2>
            <button type="button" (click)="cerrar()" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label="Cerrar">
              <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </header>
          <form (ngSubmit)="guardar()" class="p-4 sm:p-6 space-y-4">
            @if (modalError()) {
              <p role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{{ modalError() }}</p>
            }
            <div>
              <label for="categoria-nombre" class="block text-xs font-semibold text-slate-700 mb-1.5">Nombre</label>
              <input id="categoria-nombre" name="nombre" required minlength="2" [attr.maxlength]="maxLongitudNombre()" [(ngModel)]="nombre" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500" placeholder="Ej. Transporte" />
            </div>
            <div>
              <label for="categoria-tipo" class="block text-xs font-semibold text-slate-700 mb-1.5">Tipo</label>
              <select id="categoria-tipo" name="tipo" [(ngModel)]="tipo" (ngModelChange)="tipoCategoriaCambio($event)" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                <option value="GASTO">Gasto</option>
                <option value="INGRESO">Ingreso</option>
              </select>
            </div>
            <fieldset>
              <legend class="mb-2 block text-xs font-semibold text-slate-700">Icono</legend>
              <div class="mb-3 flex flex-wrap gap-2" aria-label="Emojis nativos">
                @for (emoji of emojisDisponibles; track emoji) {
                  <button type="button" (click)="seleccionarEmoji(emoji)" [attr.aria-label]="'Usar emoji ' + emoji" [attr.aria-pressed]="emojiPersonalizado === emoji" class="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl hover:bg-emerald-50">
                    {{ emoji }}
                  </button>
                }
              </div>
              <div class="flex w-full min-w-0 flex-wrap gap-2">
                @for (opcion of iconosDisponibles; track opcion.codigo) {
                  <button
                    type="button"
                    (click)="seleccionarIcono(opcion.codigo)"
                    [attr.aria-label]="'Icono ' + opcion.nombre"
                    [attr.aria-pressed]="icono === opcion.codigo"
                    [title]="opcion.nombre"
                    [class.category-icon-option--selected]="icono === opcion.codigo"
                    class="category-icon-option flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border">
                    <app-categoria-icono [icono]="opcion.codigo" [clase]="'h-5 w-5'" />
                  </button>
                }
              </div>
              <label class="mt-3 block text-xs font-medium text-slate-700">
                Emoji personalizado (opcional)
                <input
                  [ngModel]="emojiPersonalizado"
                  (ngModelChange)="seleccionarEmoji($event)"
                  name="emojiPersonalizado"
                  type="text"
                  maxlength="16"
                  class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  placeholder="Escribe o pega un emoji, por ejemplo 🏠" />
              </label>
              <p class="mt-1.5 text-xs text-slate-500">Elige un emoji del dispositivo o uno de los iconos disponibles.</p>
            </fieldset>
            <fieldset>
              <legend class="mb-2 text-xs font-semibold text-slate-700">Color</legend>
              <div class="flex flex-wrap gap-2">
                @for (opcion of coloresDisponibles; track opcion) {
                  <button type="button" (click)="color = opcion" [style.backgroundColor]="opcion" [attr.aria-label]="'Color ' + opcion" [attr.aria-pressed]="color === opcion" class="h-9 w-9 rounded-full border border-slate-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                  </button>
                }
              </div>
            </fieldset>
            @if (tipo === 'GASTO') {
              <fieldset class="rounded-xl border border-slate-200 p-3">
                <label class="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input type="checkbox" name="presupuestoActivo" [(ngModel)]="presupuestoActivo" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  Asignar límite mensual para este mes
                </label>
                @if (presupuestoActivo) {
                  <label for="categoria-limite" class="mt-3 block text-xs font-semibold text-slate-700">Límite mensual ({{ monedaPresupuesto }})</label>
                  <input appMontoPrivado id="categoria-limite" name="limiteMensual" type="number" min="0.01" step="0.01" required [(ngModel)]="limiteMensual" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" placeholder="0.00" />
                }
              </fieldset>
            }
            <footer class="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button type="button" (click)="cerrar()" class="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer">Cancelar</button>
              <button type="submit" [disabled]="guardando() || cargandoPresupuesto()" class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl cursor-pointer">
                {{ guardando() ? 'Guardando...' : cargandoPresupuesto() ? 'Cargando límite...' : 'Guardar' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    }
  `
})
export class CategoriasComponent implements OnInit, OnDestroy {
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly categoriaOrden = inject(CategoriaOrdenService);
  private readonly perfilService = inject(PerfilService);

  readonly categorias = signal<Categoria[]>([]);
  readonly iconosDisponibles = ICONOS_CATEGORIA;
  readonly categoriasVisibles = () => this.categorias().filter(c => c.activo !== this.mostrarInactivas());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mostrarInactivas = signal(false);
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly cargandoPresupuesto = signal(false);
  readonly modalError = signal<string | null>(null);
  readonly editando = signal<Categoria | null>(null);
  readonly coloresDisponibles = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#ec4899', '#64748b'
  ];
  readonly emojisDisponibles = ['🛒', '🍽️', '🚗', '🏠', '💊', '🎓', '✈️', '🎁', '💡', '🐾', '🎮', '💰'];

  nombre = '';
  tipo: 'INGRESO' | 'GASTO' = 'GASTO';
  icono = '';
  emojiPersonalizado = '';
  color = this.coloresDisponibles[0];
  presupuestoActivo = false;
  limiteMensual: number | null = null;
  presupuestoId: number | null = null;
  private monedaPresupuestoEditando: string | null = null;
  private categoriaArrastradaId: number | null = null;
  readonly destinoTactil = signal<number | null>(null);
  private holdTactil: ReturnType<typeof setTimeout> | null = null;
  private origenTactil: number | null = null;
  private inicioTactil = { x: 0, y: 0 };
  private punteroTactil: number | null = null;

  ngOnDestroy(): void { this.cancelarReordenamientoTactil(); }

  iniciarReordenamientoTactil(event: PointerEvent, categoria: Categoria): void {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    this.cancelarReordenamientoTactil();
    this.punteroTactil = event.pointerId;
    this.inicioTactil = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.holdTactil = setTimeout(() => {
      this.origenTactil = categoria.id;
      this.destinoTactil.set(categoria.id);
      this.holdTactil = null;
    }, 350);
  }

  moverReordenamientoTactil(event: PointerEvent): void {
    if (event.pointerId !== this.punteroTactil) return;
    if (this.origenTactil === null) {
      if (Math.hypot(event.clientX - this.inicioTactil.x, event.clientY - this.inicioTactil.y) > 10) this.cancelarReordenamientoTactil();
      return;
    }
    const article = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-categoria-id]');
    const id = Number(article?.getAttribute('data-categoria-id'));
    this.destinoTactil.set(this.categoriasVisibles().some(item => item.id === id) ? id : null);
  }

  terminarReordenamientoTactil(event: PointerEvent): void {
    if (event.pointerId !== this.punteroTactil) return;
    const origen = this.origenTactil;
    const destino = this.destinoTactil();
    if (origen !== null && destino !== null) this.reordenarCategoria(origen, destino);
    this.cancelarReordenamientoTactil();
  }

  cancelarReordenamientoTactil(): void {
    if (this.holdTactil !== null) clearTimeout(this.holdTactil);
    this.holdTactil = null;
    this.punteroTactil = null;
    this.origenTactil = null;
    this.destinoTactil.set(null);
  }
  private solicitudPresupuestoVersion = 0;

  get monedaPresupuesto(): string {
    return this.perfilService.perfil()?.monedaPredeterminada ?? 'MXN';
  }

  maxLongitudNombre(): number {
    const longitudOriginal = this.editando()?.nombre.length ?? 0;
    return Math.max(20, longitudOriginal);
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.finanzasService.getMisCategorias().subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudieron cargar las categorías.');
        } else {
          this.categorias.set(this.categoriaOrden.ordenar(response.data));
        }
        this.loading.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err, 'No se pudieron cargar las categorías.'));
        this.loading.set(false);
      }
    });
  }

  abrirCrear(): void {
    this.solicitudPresupuestoVersion += 1;
    this.editando.set(null);
    this.nombre = '';
    this.tipo = 'GASTO';
    this.icono = 'receipt';
    this.emojiPersonalizado = '';
    this.color = this.coloresDisponibles[0];
    this.presupuestoActivo = false;
    this.limiteMensual = null;
    this.presupuestoId = null;
    this.monedaPresupuestoEditando = null;
    this.cargandoPresupuesto.set(false);
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(categoria: Categoria): void {
    const versionPresupuesto = ++this.solicitudPresupuestoVersion;
    this.editando.set(categoria);
    this.nombre = categoria.nombre;
    this.tipo = categoria.tipo === 'INGRESO' ? 'INGRESO' : 'GASTO';
    this.icono = normalizarIconoCategoria(categoria.icono, categoria.tipo);
    this.emojiPersonalizado = esEmojiCategoria(categoria.icono) ? categoria.icono ?? '' : '';
    this.color = categoria.color || this.coloresDisponibles[0];
    this.presupuestoActivo = false;
    this.limiteMensual = null;
    this.presupuestoId = null;
    this.monedaPresupuestoEditando = null;
    this.cargandoPresupuesto.set(categoria.tipo === 'GASTO');
    this.modalError.set(null);
    this.modalAbierto.set(true);
    if (categoria.tipo === 'GASTO') {
      this.finanzasService.getPresupuestos(new Date().getMonth() + 1, new Date().getFullYear()).subscribe({
        next: response => {
          if (versionPresupuesto !== this.solicitudPresupuestoVersion || this.editando()?.id !== categoria.id) return;
          if (!response.success || !response.data) {
            this.cargandoPresupuesto.set(false);
            this.modalError.set(response.message || 'No se pudo consultar el límite mensual.');
            return;
          }
          this.cargandoPresupuesto.set(false);
          const presupuesto = response.data.presupuestos.find(item => item.categoriaId === categoria.id);
          if (!presupuesto) return;
          this.presupuestoId = presupuesto.id;
          this.monedaPresupuestoEditando = presupuesto.moneda;
          this.presupuestoActivo = true;
          this.limiteMensual = presupuesto.montoLimite;
        },
        error: err => {
          if (versionPresupuesto === this.solicitudPresupuestoVersion && this.editando()?.id === categoria.id) {
            this.cargandoPresupuesto.set(false);
            this.modalError.set(mensajeDeError(err, 'No se pudo consultar el límite mensual.'));
          }
        }
      });
    }
  }

  cerrar(): void {
    if (this.guardando()) return;
    this.solicitudPresupuestoVersion += 1;
    this.cargandoPresupuesto.set(false);
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (this.cargandoPresupuesto() || this.guardando()) return;
    const nombre = this.nombre.trim();
    const categoria = this.editando();
    if (nombre.length < 2 || (nombre.length > 20 && nombre !== categoria?.nombre)) {
      this.modalError.set('El nombre debe tener entre 2 y 20 caracteres. Puedes conservar el nombre original de una categoría anterior.');
      return;
    }
    if (this.presupuestoActivo && (this.tipo !== 'GASTO' || !this.limiteMensual || this.limiteMensual <= 0)) {
      this.modalError.set('Indica un límite mensual mayor que cero para una categoría de gasto.');
      return;
    }
    const payload: CategoriaPayload = {
      nombre,
      tipo: this.tipo,
      icono: (this.emojiPersonalizado || this.icono).trim() || undefined,
      color: this.color
    };
    this.guardando.set(true);
    const request = categoria
      ? this.finanzasService.actualizarCategoria(categoria.id, payload)
      : this.finanzasService.crearCategoria(payload);
    request.subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.guardando.set(false);
          this.modalError.set(response.message || 'No se pudo guardar la categoría.');
          return;
        }
        const guardarCategoria = () => {
          this.solicitudPresupuestoVersion += 1;
          this.cargandoPresupuesto.set(false);
          this.modalAbierto.set(false);
          this.toastService.success(categoria ? 'Categoría actualizada.' : 'Categoría creada.');
          this.cargar();
        };
        if (this.tipo === 'GASTO' && this.presupuestoActivo && this.limiteMensual) {
          this.finanzasService.guardarPresupuesto({
            categoriaId: response.data.id,
            montoLimite: this.limiteMensual,
            moneda: this.monedaPresupuestoEditando ?? this.perfilService.perfil()?.monedaPredeterminada ?? 'MXN',
            mes: new Date().getMonth() + 1,
            anio: new Date().getFullYear()
          }).subscribe({
            next: budgetResponse => {
              this.guardando.set(false);
              if (!budgetResponse.success) {
                if (!categoria) this.editando.set(response.data);
                this.modalError.set(budgetResponse.message || 'La categoría se guardó, pero no se pudo guardar el límite mensual.');
                this.toastService.error('La categoría se guardó, pero falló el límite mensual.');
                this.cargar();
                return;
              }
              guardarCategoria();
            },
            error: err => {
              this.guardando.set(false);
              if (!categoria) this.editando.set(response.data);
              this.modalError.set(mensajeDeError(err, 'La categoría se guardó, pero no se pudo guardar el límite mensual.'));
              this.toastService.error('La categoría se guardó, pero falló el límite mensual.');
              this.cargar();
            }
          });
        } else if (this.presupuestoId !== null) {
          this.finanzasService.eliminarPresupuesto(this.presupuestoId).subscribe({
            next: budgetResponse => {
              this.guardando.set(false);
              if (!budgetResponse.success) {
                this.modalError.set(budgetResponse.message || 'La categoría se guardó, pero no se pudo quitar el límite mensual.');
                return;
              }
              guardarCategoria();
            },
            error: err => {
              this.guardando.set(false);
              this.modalError.set(mensajeDeError(err, 'La categoría se guardó, pero no se pudo quitar el límite mensual.'));
            }
          });
        } else {
          this.guardando.set(false);
          guardarCategoria();
        }
      },
      error: err => {
        this.guardando.set(false);
        this.modalError.set(mensajeDeError(err, 'No se pudo guardar la categoría.'));
      }
    });
  }

  cambiarEstado(categoria: Categoria, activa: boolean): void {
    this.finanzasService.cambiarEstadoCategoria(categoria.id, activa).subscribe({
      next: response => {
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo actualizar la categoría.');
          return;
        }
        this.toastService.success(activa ? 'Categoría restaurada.' : 'Categoría archivada.');
        this.cargar();
      },
      error: err => this.toastService.error(mensajeDeError(err, 'No se pudo actualizar la categoría.'))
    });
  }

  seleccionarEmoji(valor: string): void {
    this.emojiPersonalizado = valor;
    if (valor.trim()) this.icono = valor.trim();
  }

  seleccionarIcono(codigo: string): void {
    this.emojiPersonalizado = '';
    this.icono = codigo;
  }

  tipoCategoriaCambio(tipo: 'INGRESO' | 'GASTO'): void {
    if (tipo !== 'INGRESO') return;
    if (this.presupuestoId !== null) {
      this.tipo = 'GASTO';
      this.modalError.set('Quita primero el límite mensual antes de cambiar el tipo de categoría.');
      return;
    }
    this.presupuestoActivo = false;
  }

  moverCategoria(categoria: Categoria, direccion: -1 | 1): void {
    const visibles = this.categoriasVisibles();
    const indice = visibles.findIndex(item => item.id === categoria.id);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= visibles.length) return;
    const ids = visibles.map(item => item.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    this.categoriaOrden.guardarOrden(ids);
    this.categorias.set(this.categoriaOrden.ordenar(this.categorias()));
  }

  iniciarDrag(event: DragEvent, categoria: Categoria): void {
    this.categoriaArrastradaId = categoria.id;
    event.dataTransfer?.setData('text/plain', String(categoria.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  soltarDrag(event: DragEvent, destino: Categoria): void {
    event.preventDefault();
    const id = Number(event.dataTransfer?.getData('text/plain')) || this.categoriaArrastradaId;
    this.categoriaArrastradaId = null;
    if (id) this.reordenarCategoria(id, destino.id);
  }

  private reordenarCategoria(id: number, destinoId: number): void {
    if (id === destinoId) return;
    const ids = this.categoriasVisibles().map(item => item.id);
    const origen = ids.indexOf(id);
    const posicion = ids.indexOf(destinoId);
    if (origen < 0 || posicion < 0) return;
    ids.splice(origen, 1);
    ids.splice(posicion, 0, id);
    this.categoriaOrden.guardarOrden(ids);
    this.categorias.set(this.categoriaOrden.ordenar(this.categorias()));
  }
}
