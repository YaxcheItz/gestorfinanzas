import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cuenta, CuentaPayload, MONEDAS_DISPONIBLES, TipoCuenta } from '../../core/models/finanzas.models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { mensajeDeError } from '../../core/utils/mensaje-error';
import { ToastService } from '../../core/services/toast.service';
import { creditoDisponibleCuenta, deudaActualCuenta } from '../../core/utils/cuenta-financiera';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FocusTrapDirective],
  template: `
    <main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Mis cuentas</h1>
          <p class="text-sm text-slate-500 mt-1">Administra tus cuentas y saldos financieros.</p>
        </div>
        <button
          type="button"
          (click)="abrirCrear()"
          class="min-h-11 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm cursor-pointer">
          + Agregar cuenta
        </button>
      </header>

      <div class="inline-flex p-1 bg-slate-100 rounded-xl" role="group" aria-label="Filtrar cuentas">
        <button
          type="button"
          (click)="filtroEstado.set('ACTIVAS')"
          [class]="filtroEstado() === 'ACTIVAS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'"
          class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer">
          Activas
        </button>
        <button
          type="button"
          (click)="filtroEstado.set('INACTIVAS')"
          [class]="filtroEstado() === 'INACTIVAS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'"
          class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer">
          Inactivas
        </button>
      </div>

      @if (error()) {
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between gap-3">
          <span>{{ error() }}</span>
          <button type="button" (click)="cargarCuentas()" class="font-semibold underline cursor-pointer">Reintentar</button>
        </div>
      }

      @if (loading()) {
        <div class="p-12 text-center text-sm text-slate-400">Cargando cuentas...</div>
      } @else if (cuentasVisibles().length === 0) {
        <section class="bg-white p-10 rounded-2xl border border-slate-200 text-center">
          @if (filtroEstado() === 'ACTIVAS') {
            <h2 class="text-lg font-semibold text-slate-800">Aún no tienes cuentas activas</h2>
            <p class="text-sm text-slate-500 mt-2">Agrega una cuenta para registrar movimientos y consultar tu balance.</p>
            <button
              type="button"
              (click)="abrirCrear()"
              class="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold cursor-pointer">
              Crear mi primera cuenta
            </button>
          } @else {
            <p class="text-sm text-slate-500">No hay cuentas inactivas.</p>
          }
        </section>
      } @else {
        <section [attr.aria-label]="filtroEstado() === 'ACTIVAS' ? 'Cuentas activas' : 'Cuentas inactivas'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
          @for (cuenta of cuentasVisibles(); track cuenta.id) {
            <article class="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-colors duration-150 hover:border-emerald-300 hover:shadow-md sm:p-6" [class.opacity-75]="!cuenta.activo">
              <a [routerLink]="['/transacciones']" [queryParams]="{ cuentaId: cuenta.id }" [attr.aria-label]="'Ver transacciones de ' + cuenta.nombre" class="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                <span class="sr-only">Ver todas las transacciones de {{ cuenta.nombre }}</span>
              </a>
              <div class="flex min-h-11 items-start justify-between gap-4">
                <div class="min-w-0">
                  <span class="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold uppercase tracking-wide">
                    {{ tipoCuentaLabel(cuenta.tipo) }}
                  </span>
                  <h2 class="mt-3 truncate text-lg font-bold text-slate-900">{{ cuenta.nombre }}</h2>
                  @if (institucionDe(cuenta.institucionFinanciera); as institucion) {
                    <p class="mt-1 text-xs font-medium text-slate-500">{{ institucion.nombre }}</p>
                  }
                  @if (cuenta.descripcion) {
                    <p class="mt-1 break-words text-sm text-slate-500">{{ cuenta.descripcion }}</p>
                  }
                </div>
                @if (institucionDe(cuenta.institucionFinanciera); as institucion) {
                  <span [style.background-color]="institucion.color" class="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2 text-xs font-extrabold tracking-tight text-white shadow-xs" [attr.aria-label]="'Identificador de ' + institucion.nombre">
                    {{ institucion.siglas }}
                  </span>
                } @else {
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </span>
                }
              </div>

              @if (cuenta.tipo === 'CREDITO') {
                <div class="mt-4 sm:mt-6 grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Deuda actual</p>
                    <p class="mt-1 text-lg font-bold text-slate-900">
                      {{ deudaActualCuenta(cuenta) | currency:cuenta.moneda:'symbol':'1.2-2' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Disponible</p>
                    @if (cuenta.limiteCredito != null) {
                      <p class="mt-1 text-lg font-bold text-emerald-700">
                        {{ creditoDisponibleCuenta(cuenta) ?? 0 | currency:cuenta.moneda:'symbol':'1.2-2' }}
                      </p>
                    } @else {
                      <p class="mt-1 text-xs font-semibold text-amber-700">Configura el límite</p>
                    }
                  </div>
                </div>
                @if (cuenta.limiteCredito != null) {
                  <p class="mt-2 text-xs text-slate-500">
                    Límite {{ cuenta.limiteCredito | currency:cuenta.moneda:'symbol':'1.2-2' }}
                    @if (cuenta.diaCorte != null && cuenta.diaPago != null) {
                      &bull; Corte día {{ cuenta.diaCorte }} &bull; Pago día {{ cuenta.diaPago }}
                    }
                  </p>
                }
              } @else {
                <p class="mt-4 sm:mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo actual</p>
                <p class="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                  {{ cuenta.saldoActual | currency:cuenta.moneda:'symbol':'1.2-2' }}
                </p>
              }
              @if (cuenta.cashbackPorcentaje && cuenta.cashbackPorcentaje > 0) {
                <p class="cashback-badge mt-2 flex w-fit max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold leading-relaxed text-emerald-700">
                  <span>Cashback {{ cuenta.cashbackPorcentaje }}%</span>
                  @if (cuenta.cashbackLimiteMensual) {
                    <span>&bull; hasta {{ cuenta.cashbackLimiteMensual | currency:cuenta.moneda:'symbol':'1.0-2' }}/mes</span>
                  }
                </p>
              }

              <p class="pointer-events-none relative mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Ver transacciones <span aria-hidden="true">&rarr;</span>
              </p>

              <div class="relative z-20 pointer-events-none mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 sm:mt-5 sm:pt-4">
                <button
                  type="button"
                  (click)="abrirEditar(cuenta)"
                  class="pointer-events-auto min-h-10 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer">
                  Editar
                </button>
                @if (cuenta.activo) {
                  <button
                    type="button"
                    (click)="desactivar(cuenta)"
                    class="pointer-events-auto min-h-10 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-600 cursor-pointer">
                    Desactivar
                  </button>
                } @else {
                  <button
                    type="button"
                    (click)="reactivar(cuenta)"
                    class="pointer-events-auto min-h-10 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer">
                    Reactivar
                  </button>
                }
                <button
                  type="button"
                  (click)="eliminarDefinitivamente(cuenta)"
                  class="pointer-events-auto min-h-10 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-600 cursor-pointer">
                  Eliminar
                </button>
              </div>
            </article>
          }
        </section>
      }
    </main>

    @if (modalAbierto()) {
      <div class="fixed inset-0 z-40 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4">
        <section
          appFocusTrap
          (focusTrapEscape)="cerrarModal()"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cuenta-modal-titulo"
          class="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1rem)] overflow-y-auto border border-slate-200 shadow-2xl">
          <header class="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 id="cuenta-modal-titulo" class="text-lg font-bold text-slate-900">
                {{ cuentaEditando() ? 'Editar cuenta' : 'Agregar cuenta' }}
              </h2>
              <p class="text-xs text-slate-500 mt-1">
                {{ cuentaEditando() ? 'El saldo cambia al registrar movimientos.' : 'El saldo inicial es opcional.' }}
              </p>
            </div>
            <button type="button" (click)="cerrarModal()" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <form (ngSubmit)="guardar()" class="p-4 sm:p-6 space-y-4">
            @if (modalError()) {
              <p role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{{ modalError() }}</p>
            }

            @if (cuentaEditando()) {
              <div>
                <p class="block text-xs font-semibold text-slate-700 mb-1.5">Banco o institución</p>
                <div class="flex items-center gap-2">
                  <span class="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl px-1 text-[10px] font-extrabold tracking-tight text-white"
                        [style.background-color]="institucionSeleccionada()?.color ?? '#64748b'"
                        aria-hidden="true">
                    {{ institucionSeleccionada()?.siglas ?? (institucionFinanciera ? 'OTRA' : '-') }}
                  </span>
                  <p class="text-sm text-slate-700">
                    {{ institucionSeleccionada()?.nombre ?? (institucionFinanciera || 'Efectivo / Otra institución') }}
                  </p>
                </div>
                <p class="mt-1.5 text-xs text-slate-500">La institución no se puede cambiar después de crear la cuenta.</p>
              </div>
            } @else {
              <div>
                <label for="cuenta-institucion" class="block text-xs font-semibold text-slate-700 mb-1.5">Banco o institución (opcional)</label>
                <div class="flex items-center gap-2">
                  <span class="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl px-1 text-[10px] font-extrabold tracking-tight text-white"
                        [style.background-color]="institucionSeleccionada()?.color ?? '#64748b'"
                        aria-hidden="true">
                    {{ institucionSeleccionada()?.siglas ?? 'OTRA' }}
                  </span>
                  <select
                    id="cuenta-institucion"
                    name="institucionFinanciera"
                    [(ngModel)]="institucionFinanciera"
                    (ngModelChange)="seleccionarInstitucion($event)"
                    class="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                    <option value="">Efectivo / Otra institución</option>
                    @for (institucion of instituciones; track institucion.id) {
                      <option [value]="institucion.id">{{ institucion.nombre }}</option>
                    }
                  </select>
                </div>
                @if (institucionSeleccionada(); as institucion) {
                  <p class="mt-1.5 text-xs text-slate-500">Identificador {{ institucion.siglas }} incluido en la tarjeta de cuenta.</p>
                }
              </div>
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
              <p class="mt-1 text-[11px] text-slate-500">El nombre debe ser único; puedes registrar varias cuentas del mismo banco con nombres distintos.</p>
            </div>

            @if (cuentaEditando()) {
              <div>
                <p class="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de cuenta</p>
                <p class="text-sm text-slate-700">{{ tipoCuentaLabel(tipo) }}</p>
                <p class="mt-1 text-xs text-slate-500">El tipo no se puede cambiar después de crear la cuenta.</p>
              </div>
            } @else {
              <div>
                <label for="cuenta-tipo" class="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de cuenta</label>
                <select
                  id="cuenta-tipo"
                  name="tipo"
                  required
                  [(ngModel)]="tipo"
                  (ngModelChange)="tipoCuentaCambio($event)"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                  @for (opcion of tiposCuentaDisponibles(); track opcion.valor) {
                    <option [ngValue]="opcion.valor">{{ opcion.etiqueta }}</option>
                  }
                </select>
              </div>
            }

            <p class="text-xs leading-relaxed text-slate-500">
              El tipo clasifica la cuenta; los gastos se restan del saldo registrado y el cashback se suma como ingreso estimado.
            </p>

            @if (tipo === 'CREDITO') {
              <section class="credit-card-settings rounded-xl border border-sky-200 bg-sky-50 p-3.5 space-y-3">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">Datos de la tarjeta</h3>
                  <p class="mt-1 text-xs leading-relaxed text-slate-600">
                    Las compras generan deuda y reducen el crédito disponible. Los pagos o transferencias a esta cuenta reducen la deuda.
                    Se bloquearán compras y transferencias salientes mayores al crédito disponible.
                  </p>
                </div>
                <div>
                  <label for="cuenta-limite-credito" class="block text-xs font-semibold text-slate-700 mb-1.5">Límite de crédito <span class="text-rose-600">*</span></label>
                  <input
                    id="cuenta-limite-credito"
                    name="limiteCredito"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    [(ngModel)]="limiteCredito"
                    class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej. 25000" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="cuenta-dia-corte" class="block text-xs font-semibold text-slate-700 mb-1.5">Día de corte <span class="text-rose-600">*</span></label>
                    <input
                      id="cuenta-dia-corte"
                      name="diaCorte"
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      required
                      [(ngModel)]="diaCorte"
                      class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      placeholder="1-31" />
                  </div>
                  <div>
                    <label for="cuenta-dia-pago" class="block text-xs font-semibold text-slate-700 mb-1.5">Día de pago <span class="text-rose-600">*</span></label>
                    <input
                      id="cuenta-dia-pago"
                      name="diaPago"
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      required
                      [(ngModel)]="diaPago"
                      class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      placeholder="1-31" />
                  </div>
                </div>
                <p class="text-[11px] leading-relaxed text-slate-600">
                  Las fechas se guardan para programar tus recordatorios automáticos de pago y corte.
                </p>
              </section>
            }

            @if (tipo === 'CREDITO') {
              <section class="cashback-benefit-panel rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 space-y-3">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">Beneficio de cashback</h3>
                  <p class="mt-1 text-xs leading-relaxed text-slate-600">
                    Kaptal estimará el cashback en cada gasto de esta tarjeta y lo registrará como ingreso automático.
                    Es un cálculo de seguimiento, no una confirmación del banco.
                  </p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="cuenta-cashback-porcentaje" class="block text-xs font-semibold text-slate-700 mb-1.5">Cashback (%) <span class="text-rose-600">*</span></label>
                    <input
                      id="cuenta-cashback-porcentaje"
                      name="cashbackPorcentaje"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      [(ngModel)]="cashbackPorcentaje"
                      class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900"
                      placeholder="Ej. 2" />
                  </div>
                  <div>
                    <label for="cuenta-cashback-limite" class="block text-xs font-semibold text-slate-700 mb-1.5">Límite mensual (opcional)</label>
                    <input
                      id="cuenta-cashback-limite"
                      name="cashbackLimiteMensual"
                      type="number"
                      min="0.01"
                      step="0.01"
                      [(ngModel)]="cashbackLimiteMensual"
                      class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900"
                      placeholder="Sin límite" />
                  </div>
                </div>
                <p class="text-[11px] text-slate-600 dark:text-slate-300">Se aplica a los gastos registrados con esta tarjeta; el límite se reinicia cada mes.</p>
              </section>
            }

            @if (!cuentaEditando()) {
              <div>
                <label for="cuenta-saldo" class="block text-xs font-semibold text-slate-700 mb-1.5">
                  {{ tipo === 'CREDITO' ? 'Deuda actual' : 'Saldo inicial' }}
                </label>
                <input
                  id="cuenta-saldo"
                  name="saldoInicial"
                  type="number"
                  min="0"
                  step="0.01"
                  [(ngModel)]="saldoInicial"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  [placeholder]="tipo === 'CREDITO' ? 'Ej. 5000.00' : '0.00'" />
                @if (tipo === 'CREDITO') {
                  <p class="mt-1 text-[11px] text-slate-500">Ingresa la deuda en positivo; se registrará como saldo negativo de la tarjeta.</p>
                }
              </div>
            }

            <div>
              <label for="cuenta-moneda" class="block text-xs font-semibold text-slate-700 mb-1.5">Moneda</label>
              <select
                id="cuenta-moneda"
                name="moneda"
                required
                [(ngModel)]="moneda"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white">
                @for (opcion of monedasDisponibles; track opcion.codigo) {
                  <option [ngValue]="opcion.codigo">{{ opcion.codigo }} - {{ opcion.nombre }}</option>
                }
              </select>
              @if (cuentaEditando() && cuentaEditando()!.moneda !== moneda) {
                <p class="mt-1 text-xs text-amber-700">No se puede cambiar la moneda de una cuenta con saldo o movimientos.</p>
              }
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

            <footer class="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-100">
              <button type="button" (click)="cerrarModal()" class="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="guardando()"
                class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl cursor-pointer">
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

  readonly tiposCuenta: { valor: TipoCuenta; etiqueta: string }[] = [ { valor: 'EFECTIVO', etiqueta: 'Efectivo' }, { valor: 'CREDITO', etiqueta: 'Tarjeta de Crdito' }, { valor: 'AHORRO', etiqueta: 'Cuenta de Ahorro' }, { valor: 'INVERSION', etiqueta: 'Inversin' } ];

  readonly tiposCuentaDisponibles = computed(() => { const tiene = this.cuentas().some(c => c.tipo === 'EFECTIVO'); if (this.cuentaEditando() != null) return this.tiposCuenta; return this.tiposCuenta.filter(t => t.valor !== 'EFECTIVO' || !tiene); });
  readonly instituciones = [
    { id: 'bbva', nombre: 'BBVA México', siglas: 'BBVA', color: '#004481' },
    { id: 'banorte', nombre: 'Banorte', siglas: 'B', color: '#EB0029' },
    { id: 'santander', nombre: 'Santander', siglas: 'S', color: '#EC0000' },
    { id: 'citibanamex', nombre: 'Citibanamex', siglas: 'CITI', color: '#056DAE' },
    { id: 'hsbc', nombre: 'HSBC México', siglas: 'HSBC', color: '#DB0011' },
    { id: 'scotiabank', nombre: 'Scotiabank', siglas: 'S', color: '#E31837' },
    { id: 'inbursa', nombre: 'Inbursa', siglas: 'INB', color: '#006341' },
    { id: 'banco-azteca', nombre: 'Banco Azteca', siglas: 'AZTECA', color: '#008A3B' },
    { id: 'nu', nombre: 'Nu México', siglas: 'nu', color: '#820AD1' },
    { id: 'mercado-pago', nombre: 'Mercado Pago', siglas: 'MP', color: '#009EE3' },
    { id: 'klar', nombre: 'Klar', siglas: 'klar', color: '#6C36B0' },
    { id: 'hey-banco', nombre: 'Hey Banco', siglas: 'HEY', color: '#00A9A5' },
    { id: 'revolut', nombre: 'Revolut', siglas: 'R', color: '#191C1F' },
    { id: 'sears', nombre: 'Sears', siglas: 'SEARS', color: '#003B71' },
    { id: 'american-express', nombre: 'American Express', siglas: 'AMEX', color: '#006FCF' }
  ] as const;
  readonly monedasDisponibles = MONEDAS_DISPONIBLES;

  readonly cuentas = signal<Cuenta[]>([]);
  readonly filtroEstado = signal<'ACTIVAS' | 'INACTIVAS'>('ACTIVAS');
  readonly cuentasVisibles = computed(() => this.cuentas()
    .filter(cuenta => this.filtroEstado() === 'ACTIVAS' ? cuenta.activo : !cuenta.activo));
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly modalError = signal<string | null>(null);
  readonly cuentaEditando = signal<Cuenta | null>(null);

  nombre = '';
  tipo: TipoCuenta = 'EFECTIVO';
  institucionFinanciera = '';
  cashbackPorcentaje: number | null = 0;
  cashbackLimiteMensual: number | null = null;
  limiteCredito: number | null = null;
  diaCorte: number | null = null;
  diaPago: number | null = null;
  saldoInicial: number | null = null;
  moneda = 'MXN';
  descripcion = '';

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.loading.set(true);
    this.error.set(null);
    this.finanzasService.getCuentas(true).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudieron cargar las cuentas.');
        } else {
          this.cuentas.set(response.data);
        }
        this.loading.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err, 'No se pudieron cargar las cuentas.'));
        this.loading.set(false);
      }
    });
  }

  abrirCrear(): void {
    this.cuentaEditando.set(null);
    this.nombre = '';
    this.tipo = this.tiposCuentaDisponibles().length > 0 ? this.tiposCuentaDisponibles()[0].valor : 'DEBITO';
    this.institucionFinanciera = '';
    this.cashbackPorcentaje = 0;
    this.cashbackLimiteMensual = null;
    this.limiteCredito = null;
    this.diaCorte = null;
    this.diaPago = null;
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
    this.institucionFinanciera = cuenta.institucionFinanciera ?? '';
    this.cashbackPorcentaje = cuenta.tipo === 'CREDITO' ? cuenta.cashbackPorcentaje ?? 0 : null;
    this.cashbackLimiteMensual = cuenta.cashbackLimiteMensual ?? null;
    this.limiteCredito = cuenta.limiteCredito ?? null;
    this.diaCorte = cuenta.diaCorte ?? null;
    this.diaPago = cuenta.diaPago ?? null;
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
    if (this.tipo === 'CREDITO' && (this.cashbackPorcentaje == null
        || !Number.isFinite(this.cashbackPorcentaje) || this.cashbackPorcentaje < 0 || this.cashbackPorcentaje > 100)) {
      this.modalError.set('El porcentaje de cashback debe estar entre 0 y 100.');
      return;
    }
    if (this.tipo === 'CREDITO' && this.cashbackLimiteMensual != null
        && (!Number.isFinite(this.cashbackLimiteMensual) || this.cashbackLimiteMensual <= 0)) {
      this.modalError.set('El límite mensual debe ser mayor a 0.');
      return;
    }
    if (this.tipo === 'CREDITO' && this.cashbackLimiteMensual != null && (!this.cashbackPorcentaje || this.cashbackPorcentaje <= 0)) {
      this.modalError.set('Indica un porcentaje de cashback mayor a 0 para configurar un límite.');
      return;
    }
    if (this.tipo === 'CREDITO' && (this.limiteCredito == null
        || !Number.isFinite(this.limiteCredito) || this.limiteCredito <= 0)) {
      this.modalError.set('Indica un límite de crédito mayor a 0.');
      return;
    }
    if (this.tipo === 'CREDITO' && (this.diaCorte == null || !this.diaValido(this.diaCorte))) {
      this.modalError.set('Indica el día de corte entre 1 y 31.');
      return;
    }
    if (this.tipo === 'CREDITO' && (this.diaPago == null || !this.diaValido(this.diaPago))) {
      this.modalError.set('Indica el día de pago entre 1 y 31.');
      return;
    }
    if (this.tipo === 'CREDITO' && this.limiteCredito != null) {
      const cuentaBase = this.cuentaEditando();
      const deudaActual = cuentaBase?.tipo === 'CREDITO'
        ? deudaActualCuenta(cuentaBase)
        : !cuentaBase ? this.saldoInicial ?? 0 : 0;
      if (this.limiteCredito < deudaActual) {
        this.modalError.set('El límite de crédito no puede ser menor que la deuda actual.');
        return;
      }
    }

    const porcentajeCashback = this.tipo === 'CREDITO' ? this.cashbackPorcentaje ?? 0 : null;

    const payload: CuentaPayload = {
      nombre,
      tipo: this.tipo,
      ...(this.institucionFinanciera ? { institucionFinanciera: this.institucionFinanciera } : {}),
      ...(porcentajeCashback != null ? { cashbackPorcentaje: porcentajeCashback } : {}),
      ...(this.tipo === 'CREDITO' && this.cashbackLimiteMensual != null ? { cashbackLimiteMensual: this.cashbackLimiteMensual } : {}),
      ...(this.tipo === 'CREDITO' && this.limiteCredito != null ? { limiteCredito: this.limiteCredito } : {}),
      ...(this.tipo === 'CREDITO' && this.diaCorte != null ? { diaCorte: this.diaCorte } : {}),
      ...(this.tipo === 'CREDITO' && this.diaPago != null ? { diaPago: this.diaPago } : {}),
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
        this.modalError.set(mensajeDeError(err, 'No se pudo guardar la cuenta.'));
      }
    });
  }

  async desactivar(cuenta: Cuenta): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      title: 'Desactivar cuenta',
      message: `Se ocultará "${cuenta.nombre}" de las cuentas activas y no podrás registrar nuevos movimientos en ella. Su saldo actual (${cuenta.saldoActual} ${cuenta.moneda}) dejará de incluirse en el balance total. El historial se conservará y podrás reactivarla desde "Inactivas". ¿Deseas continuar?`,
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
      error: err => this.toastService.error(mensajeDeError(err, 'No se pudo desactivar la cuenta.'))
    });
  }

  async eliminarDefinitivamente(cuenta: Cuenta): Promise<void> {
    if (cuenta.saldoActual !== 0) {
      this.toastService.error('No puedes eliminar esta cuenta mientras tenga saldo o deuda. Transfiere el dinero o liquida la tarjeta primero.');
      return;
    }

    const confirmado = await this.confirmDialog.confirm({
      title: 'Eliminar cuenta definitivamente',
      message: `Solo se puede eliminar si el saldo y la deuda son exactamente $0.00. Los movimientos se conservarán en el historial con el nombre "${cuenta.nombre}"; las plantillas recurrentes asociadas se eliminarán. ¿Deseas continuar?`,
      confirmText: 'Eliminar definitivamente',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmado) return;

    this.finanzasService.eliminarCuenta(cuenta.id).subscribe({
      next: response => {
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo eliminar la cuenta.');
          return;
        }
        this.toastService.success('Cuenta eliminada. Su historial de movimientos se conservó.');
        this.cargarCuentas();
      },
      error: err => this.toastService.error(mensajeDeError(err, 'No se pudo eliminar la cuenta.'))
    });
  }

  reactivar(cuenta: Cuenta): void {
    this.finanzasService.reactivarCuenta(cuenta.id).subscribe({
      next: response => {
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo reactivar la cuenta.');
          return;
        }
        this.toastService.success('Cuenta reactivada correctamente.');
        this.cargarCuentas();
      },
      error: err => this.toastService.error(mensajeDeError(err, 'No se pudo reactivar la cuenta.'))
    });
  }

  tipoCuentaLabel(tipo: TipoCuenta): string {
    if (tipo === 'DEBITO') return 'Inversión';
    return this.tiposCuenta.find(opcion => opcion.valor === tipo)?.etiqueta ?? tipo;
  }

  tipoCuentaCambio(tipo: TipoCuenta): void {
    this.tipo = tipo;
    if (tipo === 'CREDITO' && this.cashbackPorcentaje == null) {
      this.cashbackPorcentaje = 0;
    }
  }

  readonly deudaActualCuenta = deudaActualCuenta;
  readonly creditoDisponibleCuenta = creditoDisponibleCuenta;

  private diaValido(dia: number | null): boolean {
    return dia != null && Number.isInteger(dia) && dia >= 1 && dia <= 31;
  }

  institucionDe(id: string | null | undefined) {
    return this.instituciones.find(institucion => institucion.id === id);
  }

  institucionSeleccionada() {
    return this.institucionDe(this.institucionFinanciera);
  }

  seleccionarInstitucion(id: string): void {
    this.institucionFinanciera = id;
    const institucion = this.institucionSeleccionada();
    if (institucion && !this.nombre.trim()) this.nombre = institucion.nombre;
  }
}


