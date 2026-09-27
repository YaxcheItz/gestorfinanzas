import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Categoria, CategoriaPayload, TipoTransaccion } from '../../../core/models/finanzas.models';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-categoria-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <label [for]="selectId" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Categoría
        </label>
        <div class="flex shrink-0 items-center gap-2">
          <button type="button" (click)="abrirCrear()" class="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
            + Nueva
          </button>
          @if (categoriaSeleccionada()?.esPersonalizada) {
            <button type="button" (click)="abrirEditar()" class="text-xs font-semibold text-slate-500 hover:text-slate-800">
              Editar
            </button>
          }
        </div>
      </div>
      <select
        [id]="selectId"
        [ngModel]="selectedId"
        (ngModelChange)="selectedIdChange.emit($event)"
        [ngModelOptions]="{ standalone: true }"
        class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer">
        <option [ngValue]="null">Sin categoría</option>
        @for (categoria of categoriasFiltradas(); track categoria.id) {
          <option [ngValue]="categoria.id">{{ categoria.nombre }}</option>
        }
      </select>

      @if (editorAbierto()) {
        <section class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-3" aria-label="Editar categoría">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-slate-800">
              {{ editando() ? 'Editar categoría' : 'Nueva categoría de ' + tipoEtiqueta }}
            </h3>
            <button type="button" (click)="cerrarEditor()" [disabled]="guardando()" class="text-xs text-slate-500 hover:text-slate-800">
              Cancelar
            </button>
          </div>

          @if (error()) {
            <p role="alert" class="text-xs text-rose-700">{{ error() }}</p>
          }

          <label class="block text-xs font-medium text-slate-700">
            Nombre
            <input
              [(ngModel)]="nombre"
              [ngModelOptions]="{ standalone: true }"
              maxlength="80"
              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Ej. Transporte" />
          </label>

          <div class="grid grid-cols-[1fr_auto] items-end gap-3">
            <label class="block min-w-0 text-xs font-medium text-slate-700">
              Icono o emoji
              <input
                [(ngModel)]="icono"
                [ngModelOptions]="{ standalone: true }"
                maxlength="50"
                class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="🚌" />
            </label>
            <label class="block text-xs font-medium text-slate-700">
              Color
              <input
                [(ngModel)]="color"
                [ngModelOptions]="{ standalone: true }"
                type="color"
                class="mt-1 h-9 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
            </label>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              (click)="guardar()"
              [disabled]="guardando()"
              class="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
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
  readonly editorAbierto = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly editando = signal<Categoria | null>(null);
  readonly categoriasFiltradas = (): Categoria[] =>
    this.categorias.filter(categoria => categoria.tipo === this.tipo && categoria.activo);
  readonly categoriaSeleccionada = (): Categoria | undefined =>
    this.categoriasFiltradas().find(categoria => categoria.id === this.selectedId);

  nombre = '';
  icono = '';
  color = '#10b981';

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
    this.icono = '';
    this.color = '#10b981';
    this.error.set(null);
    this.editorAbierto.set(true);
  }

  abrirEditar(): void {
    const categoria = this.categoriaSeleccionada() ?? null;
    if (!categoria?.esPersonalizada) return;
    this.editando.set(categoria);
    this.nombre = categoria.nombre;
    this.icono = categoria.icono ?? '';
    this.color = categoria.color ?? '#10b981';
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

    const payload: CategoriaPayload = {
      nombre,
      tipo: this.tipo,
      icono: this.icono.trim() || undefined,
      color: this.color
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
}
