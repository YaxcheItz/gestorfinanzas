import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cuenta, CuentaPayload, TipoCuenta } from '../../core/models/finanzas.models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Mis cuentas</h1>
          <p class="text-sm text-slate-500 mt-1">Administra tus cuentas y saldos financieros.</p>
        </div>
        <button
          type="button"
          (click)="abrirCrear()"
          class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm cursor-pointer">
          + Agregar cuenta
        </button>
      </header>

      @if (error()) {
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between gap-3">
          <span>{{ error() }}</span>
          <button type="button" (click)="cargarCuentas()" class="font-semibold underline cursor-pointer">Reintentar</button>
        </div>
      }

      @if (loading()) {
        <div class="p-12 text-center text-sm text-slate-400">Cargando cuentas...</div>
      } @else if (cuentas().length === 0) {
        <section class="bg-white p-10 rounded-2xl border border-slate-200 text-center">
          <h2 class="text-lg font-semibold text-slate-800">Aún no tienes cuentas activas</h2>
          <p class="text-sm text-slate-500 mt-2">Agrega una cuenta para registrar movimientos y consultar tu balance.</p>
          <button
            type="button"
            (click)="abrirCrear()"
            class="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold cursor-pointer">
            Crear mi primera cuenta
          </button>
        </section>
      } @else {
        <section aria-label="Cuentas activas" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (cuenta of cuentas(); track cuenta.id) {
            <article class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <span class="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold uppercase tracking-wide">
                    {{ tipoCuentaLabel(cuenta.tipo) }}
                  </span>
                  <h2 class="mt-3 text-lg font-bold text-slate-900 truncate">{{ cuenta.nombre }}</h2>
                  @if (cuenta.descripcion) {
                    <p class="mt-1 text-sm text-slate-500 break-words">{{ cuenta.descripcion }}</p>
                  }
                </div>
                <span class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </span>
              </div>

              <p class="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo actual</p>
              <p class="mt-1 text-2xl font-bold text-slate-900">
                {{ cuenta.saldoActual | currency:cuenta.moneda:'symbol':'1.2-2' }}
              </p>

              <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="abrirEditar(cuenta)"
                  class="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
                  Editar
                </button>
                <button
                  type="button"
                  (click)="desactivar(cuenta)"
                  class="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer">
                  Desactivar
                </button>
              </div>
            </article>
          }
        </section>
      }
    </main>

    @if (modalAbierto()) {
      <div class="fixed inset-0 z-40 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="cuenta-modal-titulo"
          class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
          <header class="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 id="cuenta-modal-titulo" class="text-lg font-bold text-slate-900">
                {{ cuentaEditando() ? 'Editar cuenta' : 'Agregar cuenta' }}
              </h2>
              <p class="text-xs text-slate-500 mt-1">
                {{ cuentaEditando() ? 'El saldo cambia al registrar movimientos.' : 'El saldo inicial es opcional.' }}
              </p>
            </div>
            <button type="button" (click)="cerrarModal()" class="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer" aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <form (ngSubmit)="guardar()" class="p-6 space-y-4">
            @if (modalError()) {
              <p role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{{ modalError() }}</p>
            }

            <div>
              <label for="cuenta-nombre" class="block text-xs font-semibold text-slate-700 mb-1.5">Nombre</label>
              <input
                id="cuenta-nombre"
                name="nombre"
                type="text"
                required
                minlength="2"
                maxlength="100"
                [(ngModel)]="nombre"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                placeholder="Ej. Cuenta principal" />
            </div>

            <div>
              <label for="cuenta-tipo" class="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de cuenta</label>
              <select
                id="cuenta-tipo"
                name="tipo"
                required
                [(ngModel)]="tipo"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                @for (opcion of tiposCuenta; track opcion.valor) {
                  <option [ngValue]="opcion.valor">{{ opcion.etiqueta }}</option>
                }
              </select>
            </div>

            @if (!cuentaEditando()) {
              <div>
                <label for="cuenta-saldo" class="block text-xs font-semibold text-slate-700 mb-1.5">Saldo inicial</label>
                <input
                  id="cuenta-saldo"
                  name="saldoInicial"
                  type="number"
                  min="0"
                  step="0.01"
                  [(ngModel)]="saldoInicial"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  placeholder="0.00" />
              </div>
            }

            <div>
              <label for="cuenta-moneda" class="block text-xs font-semibold text-slate-700 mb-1.5">Moneda</label>
              <input
                id="cuenta-moneda"
                name="moneda"
                type="text"
                minlength="3"
                maxlength="10"
                [(ngModel)]="moneda"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                placeholder="MXN" />
            </div>

            <div>
              <label for="cuenta-descripcion" class="block text-xs font-semibold text-slate-700 mb-1.5">Descripción (opcional)</label>
              <textarea
                id="cuenta-descripcion"
                name="descripcion"
                rows="2"
                maxlength="255"
                [(ngModel)]="descripcion"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                placeholder="Agrega una nota sobre esta cuenta"></textarea>
            </div>

            <footer class="pt-3 flex justify-end gap-3 border-t border-slate-100">
              <button type="button" (click)="cerrarModal()" class="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="guardando()"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl cursor-pointer">
                {{ guardando() ? 'Guardando...' : cuentaEditando() ? 'Guardar cambios' : 'Crear cuenta' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    }
  `
})
export class CuentasComponent implements OnInit {
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly tiposCuenta: { valor: TipoCuenta; etiqueta: string }[] = [
    { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
    { valor: 'DEBITO', etiqueta: 'Débito' },
    { valor: 'CREDITO', etiqueta: 'Crédito' },
    { valor: 'AHORRO', etiqueta: 'Ahorro' },
    { valor: 'INVERSION', etiqueta: 'Inversión' }
  ];

  readonly cuentas = signal<Cuenta[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly modalError = signal<string | null>(null);
  readonly cuentaEditando = signal<Cuenta | null>(null);

  nombre = '';
  tipo: TipoCuenta = 'EFECTIVO';
  saldoInicial: number | null = null;
  moneda = 'MXN';
  descripcion = '';

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.loading.set(true);
    this.error.set(null);
    this.finanzasService.getCuentas().subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudieron cargar las cuentas.');
        } else {
          this.cuentas.set(response.data);
        }
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'No se pudieron cargar las cuentas.');
        this.loading.set(false);
      }
    });
  }

  abrirCrear(): void {
    this.cuentaEditando.set(null);
    this.nombre = '';
    this.tipo = 'EFECTIVO';
    this.saldoInicial = null;
    this.moneda = 'MXN';
    this.descripcion = '';
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  abrirEditar(cuenta: Cuenta): void {
    this.cuentaEditando.set(cuenta);
    this.nombre = cuenta.nombre;
    this.tipo = cuenta.tipo;
    this.saldoInicial = null;
    this.moneda = cuenta.moneda;
    this.descripcion = cuenta.descripcion ?? '';
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
    this.modalError.set(null);
  }

  guardar(): void {
    const nombre = this.nombre.trim();
    const codigoMoneda = this.moneda.trim().toUpperCase();

    if (nombre.length < 2 || nombre.length > 100) {
      this.modalError.set('El nombre debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (codigoMoneda.length < 3 || codigoMoneda.length > 10) {
      this.modalError.set('El código de moneda debe tener entre 3 y 10 caracteres.');
      return;
    }
    if (!this.cuentaEditando() && this.saldoInicial != null && (!Number.isFinite(this.saldoInicial) || this.saldoInicial < 0)) {
      this.modalError.set('El saldo inicial no puede ser negativo.');
      return;
    }

    const payload: CuentaPayload = {
      nombre,
      tipo: this.tipo,
      moneda: codigoMoneda,
      descripcion: this.descripcion.trim() || undefined
    };
    if (!this.cuentaEditando() && this.saldoInicial != null) {
      payload.saldoInicial = this.saldoInicial;
    }

    this.guardando.set(true);
    this.modalError.set(null);
    const cuentaActual = this.cuentaEditando();
    const request = cuentaActual
      ? this.finanzasService.actualizarCuenta(cuentaActual.id, payload)
      : this.finanzasService.crearCuenta(payload);

    request.subscribe({
      next: response => {
        this.guardando.set(false);
        if (!response.success || !response.data) {
          this.modalError.set(response.message || 'No se pudo guardar la cuenta.');
          return;
        }
        this.modalAbierto.set(false);
        this.cargarCuentas();
        this.toastService.success(cuentaActual ? 'Cuenta actualizada correctamente.' : 'Cuenta creada correctamente.');
      },
      error: err => {
        this.guardando.set(false);
        this.modalError.set(err.error?.message || 'No se pudo guardar la cuenta.');
      }
    });
  }

  async desactivar(cuenta: Cuenta): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      title: 'Desactivar cuenta',
      message: `Se ocultará "${cuenta.nombre}" de las cuentas activas y no podrás registrar nuevos movimientos en ella. Su saldo actual (${cuenta.saldoActual} ${cuenta.moneda}) dejará de incluirse en el balance total. El historial se conservará. ¿Deseas continuar?`,
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    if (!confirmado) return;

    this.finanzasService.desactivarCuenta(cuenta.id).subscribe({
      next: response => {
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo desactivar la cuenta.');
          return;
        }
        this.toastService.success('Cuenta desactivada correctamente.');
        this.cargarCuentas();
      },
      error: err => this.toastService.error(err.error?.message || 'No se pudo desactivar la cuenta.')
    });
  }

  tipoCuentaLabel(tipo: TipoCuenta): string {
    return this.tiposCuenta.find(opcion => opcion.valor === tipo)?.etiqueta ?? tipo;
  }
}
