import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaPayload } from '../../core/models/finanzas.models';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoriaIconoComponent } from '../../shared/components/categoria-icono/categoria-icono.component';
import { esEmojiCategoria, ICONOS_CATEGORIA, normalizarIconoCategoria } from '../../shared/components/categoria-icono/categoria-iconos';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoriaIconoComponent],
  template: `
    <main class="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
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
            <article class="min-w-0 bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 sm:gap-4" [class.opacity-70]="!categoria.activo">
              <span class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo" clase="h-5 w-5" />
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="font-semibold text-slate-900 truncate">{{ categoria.nombre }}</h2>
                <p class="text-xs text-slate-500">{{ categoria.tipo === 'GASTO' ? 'Gasto' : 'Ingreso' }} · Personalizada</p>
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
        <section role="dialog" aria-modal="true" aria-labelledby="categoria-titulo" class="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1rem)] overflow-y-auto border border-slate-200 shadow-2xl">
          <header class="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 id="categoria-titulo" class="text-lg font-bold text-slate-900">{{ editando() ? 'Editar categoría' : 'Nueva categoría' }}</h2>
            <button type="button" (click)="cerrar()" class="p-2 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Cerrar">✕</button>
          </header>
          <form (ngSubmit)="guardar()" class="p-4 sm:p-6 space-y-4">
            @if (modalError()) {
              <p role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{{ modalError() }}</p>
            }
            <div>
              <label for="categoria-nombre" class="block text-xs font-semibold text-slate-700 mb-1.5">Nombre</label>
              <input id="categoria-nombre" name="nombre" required minlength="2" maxlength="80" [(ngModel)]="nombre" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500" placeholder="Ej. Transporte" />
            </div>
            <div>
              <label for="categoria-tipo" class="block text-xs font-semibold text-slate-700 mb-1.5">Tipo</label>
              <select id="categoria-tipo" name="tipo" [(ngModel)]="tipo" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                <option value="GASTO">Gasto</option>
                <option value="INGRESO">Ingreso</option>
              </select>
            </div>
            <fieldset>
              <legend class="mb-2 block text-xs font-semibold text-slate-700">Icono</legend>
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
              <p class="mt-1.5 text-xs text-slate-500">Los iconos tienen colores propios y un fondo uniforme; también puedes usar un emoji.</p>
            </fieldset>
            <footer class="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button type="button" (click)="cerrar()" class="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer">Cancelar</button>
              <button type="submit" [disabled]="guardando()" class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl cursor-pointer">
                {{ guardando() ? 'Guardando...' : 'Guardar' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    }
  `
})
export class CategoriasComponent implements OnInit {
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);

  readonly categorias = signal<Categoria[]>([]);
  readonly iconosDisponibles = ICONOS_CATEGORIA;
  readonly categoriasVisibles = () => this.categorias().filter(c => c.activo !== this.mostrarInactivas());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mostrarInactivas = signal(false);
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly modalError = signal<string | null>(null);
  readonly editando = signal<Categoria | null>(null);

  nombre = '';
  tipo: 'INGRESO' | 'GASTO' = 'GASTO';
  icono = '';
  emojiPersonalizado = '';

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
          this.categorias.set(response.data);
        }
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'No se pudieron cargar las categorías.');
        this.loading.set(false);
      }
    });
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.nombre = '';
    this.tipo = 'GASTO';
    this.icono = 'receipt';
    this.emojiPersonalizado = '';
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(categoria: Categoria): void {
    this.editando.set(categoria);
    this.nombre = categoria.nombre;
    this.tipo = categoria.tipo === 'INGRESO' ? 'INGRESO' : 'GASTO';
    this.icono = normalizarIconoCategoria(categoria.icono, categoria.tipo);
    this.emojiPersonalizado = esEmojiCategoria(categoria.icono) ? categoria.icono ?? '' : '';
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  cerrar(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  guardar(): void {
    const nombre = this.nombre.trim();
    if (nombre.length < 2 || nombre.length > 80) {
      this.modalError.set('El nombre debe tener entre 2 y 80 caracteres.');
      return;
    }
    const payload: CategoriaPayload = {
      nombre,
      tipo: this.tipo,
      icono: (this.emojiPersonalizado || this.icono).trim() || undefined
    };
    this.guardando.set(true);
    const categoria = this.editando();
    const request = categoria
      ? this.finanzasService.actualizarCategoria(categoria.id, payload)
      : this.finanzasService.crearCategoria(payload);
    request.subscribe({
      next: response => {
        this.guardando.set(false);
        if (!response.success || !response.data) {
          this.modalError.set(response.message || 'No se pudo guardar la categoría.');
          return;
        }
        this.modalAbierto.set(false);
        this.toastService.success(categoria ? 'Categoría actualizada.' : 'Categoría creada.');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.modalError.set(err.error?.message || 'No se pudo guardar la categoría.');
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
      error: err => this.toastService.error(err.error?.message || 'No se pudo actualizar la categoría.')
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
