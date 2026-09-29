import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaPayload, TipoTransaccion } from '../../../core/models/finanzas.models';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoriaIconoComponent } from '../categoria-icono/categoria-icono.component';
import { esEmojiCategoria, ICONOS_CATEGORIA, normalizarIconoCategoria } from '../categoria-icono/categoria-iconos';

@Component({
  selector: 'app-categoria-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoriaIconoComponent],
  styles: [':host { display: block; width: 100%; min-width: 0; }'],
  template: `
    <div class="relative space-y-2">
      <div class="flex items-center justify-between gap-2">
        <label [for]="selectId" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Categoría
        </label>
        <div class="flex shrink-0 items-center gap-2">
          <button type="button" (click)="abrirCrear()" class="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700">
            <span aria-hidden="true" class="text-base leading-none">+</span>
            Nueva
          </button>
          @if (categoriaSeleccionada()?.esPersonalizada) {
            <button type="button" (click)="abrirEditar()" class="inline-flex min-h-9 items-center justify-center rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              Editar
            </button>
          }
        </div>
      </div>

      <button
        type="button"
        [id]="selectId"
        role="combobox"
        aria-haspopup="listbox"
        [attr.aria-expanded]="opcionesAbiertas()"
        [attr.aria-controls]="opcionesId"
        (click)="opcionesAbiertas.update(abierta => !abierta)"
        class="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 transition-colors hover:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
        @if (categoriaSeleccionada(); as seleccionada) {
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-slate-600">
            <app-categoria-icono [icono]="seleccionada.icono" [tipo]="seleccionada.tipo" [clase]="'h-5 w-5'" />
          </span>
          <span class="min-w-0 flex-1 truncate">{{ seleccionada.nombre }}</span>
        } @else {
          <span class="min-w-0 flex-1 text-slate-500">Sin categoría</span>
        }
        <svg class="h-4 w-4 shrink-0 text-slate-500 transition-transform" [class.rotate-180]="opcionesAbiertas()" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
        </svg>
      </button>

      @if (opcionesAbiertas()) {
        <div [id]="opcionesId" role="listbox" aria-label="Categorías disponibles" class="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <button
            type="button"
            role="option"
            [attr.aria-selected]="selectedId === null"
            (click)="seleccionarCategoria(null)"
            class="flex min-h-10 w-full items-center rounded-lg px-2.5 text-left text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
            Sin categoría
          </button>
          @for (categoria of categoriasFiltradas(); track categoria.id) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="selectedId === categoria.id"
              (click)="seleccionarCategoria(categoria.id)"
              class="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-700">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-600">
                <app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo" [clase]="'h-4 w-4'" />
              </span>
              <span class="min-w-0 flex-1 truncate">{{ categoria.nombre }}</span>
              @if (selectedId === categoria.id) {
                <svg class="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414l2.793 2.793 6.543-6.543a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              }
            </button>
          }
        </div>
      }

      @if (editorAbierto()) {
        <section class="quick-category-editor box-border w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-4 shadow-sm" aria-label="Editar categoría">
          <div class="flex min-w-0 items-center justify-between gap-3 border-b border-emerald-100 pb-2">
            <h3 class="text-sm font-bold text-slate-800">
              {{ editando() ? 'Editar categoría' : 'Nueva categoría de ' + tipoEtiqueta }}
            </h3>
            <button type="button" (click)="cerrarEditor()" [disabled]="guardando()" class="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              Cancelar
            </button>
          </div>

          @if (error()) {
            <p role="alert" class="text-xs text-rose-700 font-medium">{{ error() }}</p>
          }

          <label class="block text-xs font-medium text-slate-700">
            Nombre
            <input
              [(ngModel)]="nombre"
              [ngModelOptions]="{ standalone: true }"
              maxlength="80"
              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Ej. Transporte" />
          </label>

          <fieldset class="min-w-0 space-y-2">
            <legend class="text-xs font-medium text-slate-700">Icono</legend>
            <div class="flex w-full min-w-0 flex-wrap gap-2">
              @for (opcion of iconosDisponibles; track opcion.codigo) {
                <button
                  type="button"
                  (click)="seleccionarIcono(opcion.codigo)"
                  [attr.aria-label]="'Icono ' + opcion.nombre"
                  [attr.aria-pressed]="icono === opcion.codigo"
                  [title]="opcion.nombre"
                  [class.quick-category-icon--selected]="icono === opcion.codigo"
                  class="quick-category-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white transition-all cursor-pointer shadow-sm">
                  <app-categoria-icono [icono]="opcion.codigo" [clase]="'h-4 w-4'" />
                </button>
              }
            </div>
            <label class="block text-xs font-medium text-slate-700">
              Emoji personalizado (opcional)
              <input
                [ngModel]="emojiPersonalizado"
                (ngModelChange)="seleccionarEmoji($event)"
                [ngModelOptions]="{ standalone: true }"
                type="text"
                maxlength="16"
                class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg dark:border-slate-600 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Escribe o pega un emoji, por ejemplo 🏠" />
            </label>
          </fieldset>
          <p class="text-xs text-slate-500 italic">Elige un icono predeterminado o usa un emoji de tu teclado.</p>

          <div class="flex justify-end border-t border-emerald-100 pt-3">
            <button
              type="button"
              (click)="guardar()"
              [disabled]="guardando()"
              class="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-all">
              {{ guardando() ? 'Guardando...' : 'Guardar categoría' }}
            </button>
          </div>
        </section>
      }
    </div>
  `
})
export class CategoriaSelectorComponent {
  @Input({ required: true }) categorias: Categoria[] = [];
  @Input({ required: true }) tipo!: TipoTransaccion;
  @Input() selectedId: number | null = null;
  @Output() readonly selectedIdChange = new EventEmitter<number | null>();
  @Output() readonly categoriasChange = new EventEmitter<Categoria[]>();

  readonly selectId = 'categoriaId';
  readonly opcionesId = `${this.selectId}-opciones`;
  readonly opcionesAbiertas = signal(false);
  readonly editorAbierto = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly editando = signal<Categoria | null>(null);
  readonly iconosDisponibles = ICONOS_CATEGORIA;
  readonly categoriasFiltradas = (): Categoria[] =>
    this.categorias.filter(categoria => categoria.tipo === this.tipo && categoria.activo);
  readonly categoriaSeleccionada = (): Categoria | undefined =>
    this.categoriasFiltradas().find(categoria => categoria.id === this.selectedId);

  seleccionarCategoria(categoriaId: number | null): void {
    this.selectedIdChange.emit(categoriaId);
    this.opcionesAbiertas.set(false);
  }

  nombre = '';
  icono = '';
  emojiPersonalizado = '';

  constructor(
    private readonly finanzasService: FinanzasService,
    private readonly toastService: ToastService
  ) {}

  get tipoEtiqueta(): string {
    return this.tipo === 'INGRESO' ? 'ingreso' : 'gasto';
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.nombre = '';
    this.icono = this.tipo === 'INGRESO' ? 'trending-up' : 'receipt';
    this.emojiPersonalizado = '';
    this.error.set(null);
    this.editorAbierto.set(true);
  }

  abrirEditar(): void {
    const categoria = this.categoriaSeleccionada() ?? null;
    if (!categoria?.esPersonalizada) return;
    this.editando.set(categoria);
    this.nombre = categoria.nombre;
    this.icono = normalizarIconoCategoria(categoria.icono, categoria.tipo);
    this.emojiPersonalizado = esEmojiCategoria(categoria.icono) ? categoria.icono ?? '' : '';
    this.error.set(null);
    this.editorAbierto.set(true);
  }

  cerrarEditor(): void {
    if (this.guardando()) return;
    this.editorAbierto.set(false);
  }

  guardar(): void {
    const nombre = this.nombre.trim();
    if (nombre.length < 2 || nombre.length > 80) {
      this.error.set('El nombre debe tener entre 2 y 80 caracteres.');
      return;
    }
    if (this.tipo !== 'GASTO' && this.tipo !== 'INGRESO') {
      this.error.set('Las categorías solo aplican a gastos e ingresos.');
      return;
    }
    if (this.emojiPersonalizado && !esEmojiCategoria(this.emojiPersonalizado)) {
      this.error.set('Escribe un emoji válido o elige un icono de la lista.');
      return;
    }

    const payload: CategoriaPayload = {
      nombre,
      tipo: this.tipo,
      icono: (this.emojiPersonalizado || this.icono).trim() || undefined
    };
    const actual = this.editando();
    this.guardando.set(true);
    this.error.set(null);

    const request = actual
      ? this.finanzasService.actualizarCategoria(actual.id, payload)
      : this.finanzasService.crearCategoria(payload);
    request.subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudo guardar la categoría.');
          this.guardando.set(false);
          return;
        }
        const categoriaGuardada = response.data;
        const categoriasActualizadas = actual
          ? this.categorias.map(categoria =>
              categoria.id === categoriaGuardada.id ? categoriaGuardada : categoria
            )
          : [...this.categorias, categoriaGuardada];
        this.guardando.set(false);
        this.categoriasChange.emit(categoriasActualizadas);
        this.selectedIdChange.emit(categoriaGuardada.id);
        this.editorAbierto.set(false);
        this.toastService.success(actual ? 'Categoría actualizada.' : 'Categoría creada.');
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err.error?.message || 'No se pudo guardar la categoría.');
      }
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
}
