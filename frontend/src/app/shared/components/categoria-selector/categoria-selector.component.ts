import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaPayload, TipoTransaccion } from '../../../core/models/finanzas.models';
import { CategoriaOrdenService } from '../../../core/services/categoria-orden.service';
import { CategoriaPreferidaService } from '../../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { ToastService } from '../../../core/services/toast.service';
import { CategoriaIconoComponent } from '../categoria-icono/categoria-icono.component';
import { esEmojiCategoria, normalizarIconoCategoria } from '../categoria-icono/categoria-iconos';

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
            {{ categoriaSeleccionada()?.nombre ?? 'Elige una categoría' }}
          </span>

          <svg class="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- El nombre visible del mosaico ya dice que es. Repetir "Categoria" en
             pantalla seria ruido, pero el lector de pantalla si lo necesita. -->
        <span [id]="labelId" class="sr-only">{{ etiqueta }}</span>
      } @else {
        <!-- Selector modal para mantener libre el formulario de movimiento. -->
        <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:p-6" (click)="cerrarMenu()">
        <section role="dialog" aria-modal="true" [attr.aria-label]="'Elegir ' + etiqueta.toLowerCase()" (click)="$event.stopPropagation()" class="flex max-h-[min(88dvh,44rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-zinc-950">
        <div class="flex items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <div class="min-w-0">
            <span [id]="labelId" class="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{{ etiqueta }}</span>
            <h2 class="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white">Elige una categoría</h2>
          </div>
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
            <button
                type="button"
                (click)="modoEdicion.update(valor => !valor)"
                [attr.aria-pressed]="modoEdicion()"
                class="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M13.586 3.586a2 2 0 012.828 2.828l-1.5 1.5-2.828-2.828 1.5-1.5zM10.5 6.5l3 3-7.1 7.1A2 2 0 015 17.9V16a1 1 0 01-1-1v-1.9a1 1 0 01.4-.8l7.1-7.1z" />
                </svg>
                {{ modoEdicion() ? 'Terminar' : 'Editar' }}
            </button>
            <button
              type="button"
              (click)="cerrarMenu()"
              class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              Listo
            </button>
          </div>
        </div>
        @if (error()) { <p role="alert" class="mx-4 mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{{ error() }}</p> }

        <div
          [id]="menuId"
          role="listbox"
          [attr.aria-labelledby]="labelId"
          class="grid grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-4 sm:gap-3 sm:p-5"
        >
        @for (categoria of categoriasFiltradas(); track categoria.id) {
<div role="option" [attr.aria-selected]="selectedId === categoria.id" class="categoria-mosaico group relative min-h-24 overflow-hidden rounded-xl border border-slate-200 bg-white text-center transition-colors dark:border-slate-700 dark:bg-slate-800" [class.categoria-mosaico--activo]="selectedId === categoria.id">
            <button type="button" [disabled]="modoEdicion()" (click)="seleccionarCategoria(categoria.id)" [attr.aria-label]="'Seleccionar ' + categoria.nombre" class="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-3 hover:bg-emerald-50/50 disabled:cursor-default dark:hover:bg-emerald-500/10">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700"><app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo" [clase]="'h-5 w-5'" /></span>
              <span class="line-clamp-2 w-full text-[11px] font-medium leading-tight text-slate-700 dark:text-slate-200">{{ categoria.nombre }}</span>
            </button>
            @if (modoEdicion() && categoria.esPersonalizada) {
              <button type="button" (click)="abrirEditar(categoria)" [attr.aria-label]="'Editar categoría ' + categoria.nombre" class="absolute left-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-emerald-950">
                <svg aria-hidden="true" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 012.828 2.828l-1.5 1.5-2.828-2.828 1.5-1.5zM10.5 6.5l3 3-7.1 7.1A2 2 0 015 17.9V16a1 1 0 01-1-1v-1.9a1 1 0 01.4-.8l7.1-7.1z"/></svg>
              </button>
              <button type="button" (click)="eliminarCategoria(categoria)" [attr.aria-label]="'Eliminar categoría ' + categoria.nombre" class="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950">
                <svg aria-hidden="true" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </button>
            }
          </div>
        }
        @if (modoEdicion()) {
          <button type="button" (click)="abrirCrear()" class="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/60 px-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-slate-800">+</span>Agregar categoría
          </button>
        }
      </div>

        @if (categoriasFiltradas().length === 0) {
          <p class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Aún no tienes categorías de {{ tipoEtiqueta }}. Usa «Nueva» para crear una.
          </p>
        }
        </section>
        </div>
        @if (error()) { <p role="alert" class="mx-4 mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{{ error() }}</p> }
      }

      @if (editorAbierto()) {
        <div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm" (click)="cerrarEditor()">
          <section role="dialog" aria-modal="true" class="quick-category-editor w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-zinc-950" [attr.aria-label]="editando() ? 'Editar categoría' : 'Nueva categoría'" (click)="$event.stopPropagation()">
            <header class="flex items-start justify-between gap-3">
              <div><h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ editando() ? 'Editar categoría' : 'Nueva categoría' }}</h3><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Cambia el nombre y el emoji de la categoría.</p></div>
              <button type="button" (click)="cerrarEditor()" aria-label="Cerrar" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
            </header>
            @if (error()) { <p role="alert" class="text-sm text-rose-600">{{ error() }}</p> }
            <div class="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40"><span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm dark:bg-slate-800"><app-categoria-icono [icono]="emojiPersonalizado || icono" [tipo]="tipo" [clase]="'h-6 w-6'" /></span><span class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ nombre.trim() || 'Nombre de categoría' }}</span></div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Nombre<input [(ngModel)]="nombre" [ngModelOptions]="{ standalone: true }" [attr.maxlength]="maxLongitudNombre()" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder="Ej. Transporte" /></label>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Icono o emoji<input [ngModel]="emojiPersonalizado" (ngModelChange)="seleccionarEmoji($event)" [ngModelOptions]="{ standalone: true }" type="text" maxlength="16" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xl text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder="Escribe o pega un emoji" /></label>
            <footer class="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><button type="button" (click)="cerrarEditor()" [disabled]="guardando()" class="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancelar</button><button type="button" (click)="guardar()" [disabled]="guardando()" class="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button></footer>
          </section>
        </div>
      }
    </div>`
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
  readonly modoEdicion = signal(false);
  readonly editorAbierto = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly editando = signal<Categoria | null>(null);
  readonly categoriasFiltradas = (): Categoria[] =>
    this.categoriaOrden.ordenar(this.categorias.filter(categoria => categoria.tipo === this.tipo && categoria.activo));
  readonly categoriaSeleccionada = (): Categoria | undefined =>
    this.categoriasFiltradas().find(categoria => categoria.id === this.selectedId);

  /** Lo que anuncia el mosaico colapsado: el nombre y que abre el menú. */
  get descripcionMosaico(): string {
    const nombre = this.categoriaSeleccionada()?.nombre ?? 'Elige una categoría';
    return `${this.etiqueta}: ${nombre}. Cambiar`;
  }

  constructor(
    private readonly finanzasService: FinanzasService,
    private readonly toastService: ToastService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly categoriaPreferida: CategoriaPreferidaService,
    private readonly categoriaOrden: CategoriaOrdenService
  ) {}

  abrirMenu(): void {
    this.modoEdicion.set(false);
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    if (this.guardando()) return;
    this.menuAbierto.set(false);
    this.modoEdicion.set(false);
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

  maxLongitudNombre(): number {
    const longitudOriginal = this.editando()?.nombre.length ?? 0;
    return Math.max(20, longitudOriginal);
  }

  abrirCrear(): void {
    this.menuAbierto.set(false);
    this.editando.set(null);
    this.nombre = '';
    this.icono = this.tipo === 'INGRESO' ? 'trending-up' : 'receipt';
    this.emojiPersonalizado = '';
    this.error.set(null);
    this.editorAbierto.set(true);
  }

  abrirEditar(categoria: Categoria | null = this.categoriaSeleccionada() ?? null): void {
    if (!categoria?.esPersonalizada) return;
    this.menuAbierto.set(false);
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

  eliminarCategoria(categoria: Categoria): void {
    this.editando.set(categoria);
    this.eliminar();
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
          const categoriasRestantes = this.categorias.filter(otra => otra.id !== categoria.id);
          this.categoriasChange.emit(categoriasRestantes);
          const categoriaSiguiente = categoriasRestantes.find(otra => otra.tipo === this.tipo) ?? null;
          this.selectedIdChange.emit(categoriaSiguiente?.id ?? null);
          if (categoriaSiguiente) this.categoriaPreferida.recordar(this.tipo, categoriaSiguiente.id);
          this.editorAbierto.set(false);
          this.menuAbierto.set(false);
          this.modoEdicion.set(false);
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
    const actual = this.editando();
    if (nombre.length < 2 || (nombre.length > 20 && nombre !== actual?.nombre)) {
      this.error.set('El nombre debe tener entre 2 y 20 caracteres. Puedes conservar el nombre original de una categoría anterior.');
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
      icono: this.emojiPersonalizado.trim() || actual?.icono || (this.tipo === 'INGRESO' ? 'trending-up' : 'receipt'),
      color: actual?.color ?? undefined
    };
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
        this.modoEdicion.set(false);
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

}
