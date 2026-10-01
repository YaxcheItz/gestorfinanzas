import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaPayload, TipoTransaccion } from '../../../core/models/finanzas.models';
import { CategoriaPreferidaService } from '../../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
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
<div class="relative space-y-2.5">
      <!-- Colapsado: solo el mosaico de lo que ya quedo elegido.
           Casi todos los movimientos caen en la misma categoria, y una rejilla de
           veinte iconos tapa el resto del formulario sin aportar a la decision. -->
      @if (!menuAbierto()) {
        <button
          type="button"
          [id]="selectId"
          aria-haspopup="listbox"
          [attr.aria-expanded]="false"
          [attr.aria-label]="descripcionMosaico"
          (click)="abrirMenu()"
          class="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
            @if (categoriaSeleccionada(); as seleccionada) {
              <app-categoria-icono [icono]="seleccionada.icono" [tipo]="seleccionada.tipo" [clase]="'h-5 w-5'" />
            } @else {
              <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M3 4a2 2 0 012-2h10a2 2 0 012 2v2h1a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h1V4zm2 0h10V4H5v0z" clip-rule="evenodd" />
              </svg>
            }
          </span>

          <span class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ categoriaSeleccionada()?.nombre ?? 'Sin categoría' }}
          </span>

          <svg class="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- El nombre visible del mosaico ya dice que es. Repetir "Categoria" en
             pantalla seria ruido, pero el lector de pantalla si lo necesita. -->
        <span [id]="labelId" class="sr-only">{{ etiqueta }}</span>
      } @else {
        <!-- Abierto: aqui se elige, se crean y se editan. -->
        <div class="flex items-center justify-between gap-2">
          <span [id]="labelId" class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ etiqueta }}
          </span>
          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              (click)="abrirCrear()"
              class="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
              </svg>
              Nueva
            </button>
            @if (categoriaSeleccionada()?.esPersonalizada) {
              <button
                type="button"
                (click)="abrirEditar()"
                class="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M13.586 3.586a2 2 0 012.828 2.828l-1.5 1.5-2.828-2.828 1.5-1.5zM10.5 6.5l3 3-7.1 7.1A2 2 0 015 17.9V16a1 1 0 01-1-1v-1.9a1 1 0 01.4-.8l7.1-7.1z" />
                </svg>
                Editar
              </button>
            }
            <button
              type="button"
              (click)="cerrarMenu()"
              class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              Listo
            </button>
          </div>
        </div>

        <div
          [id]="menuId"
          role="listbox"
          [attr.aria-labelledby]="labelId"
          class="grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
        <button
          type="button"
          role="option"
          [attr.aria-selected]="selectedId === null"
          (click)="seleccionarCategoria(null)"
          class="categoria-mosaico flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-transparent px-1.5 py-2 text-center transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          [class.categoria-mosaico--activo]="selectedId === null">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M3 4a2 2 0 012-2h10a2 2 0 012 2v2h1a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h1V4zm2 0h10V4H5v0z" clip-rule="evenodd" />
            </svg>
          </span>
          <span class="line-clamp-2 w-full text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">Sin categoría</span>
        </button>

        @for (categoria of categoriasFiltradas(); track categoria.id) {
<button
              type="button"
              role="option"
              [attr.aria-selected]="selectedId === categoria.id"
              (click)="seleccionarCategoria(categoria.id)"
            class="categoria-mosaico group relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10"
            [class.categoria-mosaico--activo]="selectedId === categoria.id">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-white dark:bg-slate-700 dark:group-hover:bg-slate-600">
              <app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo" [clase]="'h-5 w-5'" />
            </span>
            <span class="line-clamp-2 w-full text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">{{ categoria.nombre }}</span>
            @if (selectedId === categoria.id) {
              <span class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
                <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414l2.793 2.793 6.543-6.543a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            }
          </button>
        }
      </div>

      @if (categoriasFiltradas().length === 0) {
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Todavía no hay categorías de {{ tipoEtiqueta }}. Crea la primera con el botón «Nueva».
          </p>
        }
      }

      @if (editorAbierto()) {
        <section class="quick-category-editor box-border w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-4 shadow-sm" aria-label="Editar categoría">
          <div class="flex min-w-0 items-center justify-between gap-3 border-b border-emerald-100 pb-2">
            <h3 class="text-sm font-bold text-slate-800">
              {{ editando() ? 'Editar categoría' : 'Nueva categoría de ' + tipoEtiqueta }}
            </h3>
            <div class="flex min-w-0 shrink-0 items-center gap-2">
              <!-- Solo al editar: no tiene sentido borrar lo que se esta creando. -->
              @if (editando(); as enEdicion) {
                <button
                  type="button"
                  (click)="eliminar()"
                  [disabled]="guardando()"
                  [attr.aria-label]="'Eliminar categoría ' + enEdicion.nombre"
                  class="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-500/10">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8.25 1.75A1.75 1.75 0 0010 3.5v7.75a1.75 1.75 0 01-3.5 0V3.5c0-.966.784-1.75 1.75-1.75zm3.5 1.75a1.75 1.75 0 113.5 0v7.75a1.75 1.75 0 01-3.5 0V3.5zM2.5 6a1 1 0 012 0v7.25c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V6a1 1 0 112 0v7.25A3.75 3.75 0 015.75 17h-1.5A3.75 3.75 0 01.5 13.25V6z" clip-rule="evenodd" />
                  </svg>
                  Eliminar
                </button>
              }
              <button type="button" (click)="cerrarEditor()" [disabled]="guardando()" class="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                Cancelar
              </button>
            </div>
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
  /** Encabezado del grupo. El texto vive aqui para que el host no lo repita. */
  @Input() etiqueta = 'Categoría';
  @Output() readonly selectedIdChange = new EventEmitter<number | null>();
  @Output() readonly categoriasChange = new EventEmitter<Categoria[]>();

  readonly selectId = 'categoriaId';
  readonly menuId = `${this.selectId}-opciones`;
  readonly labelId = `${this.selectId}-label`;
  readonly menuAbierto = signal(false);
  readonly editorAbierto = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly editando = signal<Categoria | null>(null);
  readonly iconosDisponibles = ICONOS_CATEGORIA;
  readonly categoriasFiltradas = (): Categoria[] =>
    this.categorias.filter(categoria => categoria.tipo === this.tipo && categoria.activo);
  readonly categoriaSeleccionada = (): Categoria | undefined =>
    this.categoriasFiltradas().find(categoria => categoria.id === this.selectedId);

  /** Lo que anuncia el mosaico colapsado: el nombre y que abre el menú. */
  get descripcionMosaico(): string {
    const nombre = this.categoriaSeleccionada()?.nombre ?? 'Sin categoría';
    return `${this.etiqueta}: ${nombre}. Cambiar`;
  }

  constructor(
    private readonly finanzasService: FinanzasService,
    private readonly toastService: ToastService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly categoriaPreferida: CategoriaPreferidaService
  ) {}

  abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    if (this.guardando()) return;
    this.menuAbierto.set(false);
  }

  seleccionarCategoria(categoriaId: number | null): void {
    this.selectedIdChange.emit(categoriaId);
    // Elegir es la señal de que esa categoria es la de siempre: se guarda para
    // que la siguiente vez abra el formulario con ella ya puesta.
    if (categoriaId !== null) this.categoriaPreferida.recordar(this.tipo, categoriaId);
    this.menuAbierto.set(false);
  }

  nombre = '';
  icono = '';
  emojiPersonalizado = '';
  /** Corta la confirmacion si el usuario la acepta dos veces seguidas. */
  private eliminando = false;

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

  /**
   * Elimina la categoria que se esta editando. El movimiento no se borra: el
   * backend la marca como inactiva, asi que los gastos historicos conservan su
   * categoria y solo deja de ofrecerse al registrar.
   */
  eliminar(): void {
    const categoria = this.editando();
    if (!categoria || this.guardando() || this.eliminando) return;

    this.confirmDialog.confirm({
      title: 'Eliminar categoría',
      message: `Se dejará de ofrecer «${categoria.nombre}» al registrar movimientos. Los movimientos que ya la usan la conservan.`,
      confirmText: 'Eliminar',
      type: 'danger'
    }).then(confirmado => {
      if (!confirmado) return;
      this.eliminando = true;
      this.guardando.set(true);
      this.error.set(null);
      this.finanzasService.cambiarEstadoCategoria(categoria.id, false).subscribe({
        next: response => {
          this.guardando.set(false);
          this.eliminando = false;
          if (!response.success) {
            this.error.set(response.message || 'No se pudo eliminar la categoría.');
            return;
          }
          // Si era la preferida de este tipo, se olvida: al reabrir el formulario
          // tiene que caer en otra categoria y no en la que ya no existe.
          this.categoriaPreferida.olvidar(this.tipo, categoria.id);
          this.categoriasChange.emit(
            this.categorias.filter(otra => otra.id !== categoria.id)
          );
          this.selectedIdChange.emit(null);
          this.editorAbierto.set(false);
          this.menuAbierto.set(false);
          this.toastService.success('Categoría eliminada.');
        },
        error: err => {
          this.guardando.set(false);
          this.eliminando = false;
          this.error.set(err.error?.message || 'No se pudo eliminar la categoría.');
        }
      });
    });
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
        this.categoriaPreferida.recordar(this.tipo, categoriaGuardada.id);
        this.editorAbierto.set(false);
        this.menuAbierto.set(false);
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
