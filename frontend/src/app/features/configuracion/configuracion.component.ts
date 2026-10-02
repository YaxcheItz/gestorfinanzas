import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GoogleSignInComponent } from '../auth/google-sign-in/google-sign-in.component';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { RestauracionRespaldoPreview } from '../../core/models/auth.models';
import { nombreCuentaVisible } from '../../core/utils/cuenta-financiera';
import {
  MONEDAS_DISPONIBLES,
  PlantillaRecurrente
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MontoPipe, GoogleSignInComponent],
  template: `
    <main class="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:space-y-7 sm:px-6 sm:py-8">
      <header class="flex min-w-0 items-center gap-3 sm:gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:h-14 sm:w-14">
          <svg aria-hidden="true" class="h-6 w-6 sm:h-7 sm:w-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:text-xs">Preferencias de cuenta</p>
          <h1 class="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Configuración</h1>
          <p class="mt-1 text-xs text-slate-500 sm:text-sm">Personaliza Kaptal. Tus preferencias se guardan en tu cuenta.</p>
        </div>
      </header>

      <nav aria-label="Secciones de configuración" class="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        <a [routerLink]="[]" fragment="appearance" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Apariencia</a>
        <a [routerLink]="[]" fragment="profile" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Perfil</a>
        <a [routerLink]="[]" fragment="security" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Seguridad</a>
        <a [routerLink]="[]" fragment="backup" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Respaldo</a>
        <a [routerLink]="[]" fragment="categories" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Categorías</a>
        <a [routerLink]="[]" fragment="recurring" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Recurrentes</a>
      </nav>

      @if (perfilService.error()) {
        <div role="alert" class="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span class="min-w-0 break-words">{{ perfilService.error() }}</span>
          <button type="button" (click)="recargarPerfil()" class="min-h-10 shrink-0 self-start rounded-lg px-3 font-semibold underline sm:self-auto">Reintentar</button>
        </div>
      }

      <section id="appearance" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="mb-5">
          <h2 class="text-base font-bold text-slate-900">Apariencia y visualización</h2>
          <p class="mt-1 text-xs text-slate-500">Estas preferencias se sincronizan al iniciar sesión en otro dispositivo.</p>
        </div>
        <form (ngSubmit)="guardarPerfil()" class="space-y-4">
          <fieldset>
            <legend class="mb-2 text-xs font-semibold text-slate-700">Tema</legend>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="tema = 'CLARO'"
                [attr.aria-pressed]="tema === 'CLARO'"
                [class]="tema === 'CLARO' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500' : 'border-slate-200 bg-white text-slate-700'"
                class="min-h-12 rounded-xl border px-3 text-sm font-semibold">
                <svg aria-hidden="true" class="mr-2 inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>Claro
              </button>
              <button
                type="button"
                (click)="tema = 'OSCURO'"
                [attr.aria-pressed]="tema === 'OSCURO'"
                [class]="tema === 'OSCURO' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500' : 'border-slate-200 bg-white text-slate-700'"
                class="min-h-12 rounded-xl border px-3 text-sm font-semibold">
                <svg aria-hidden="true" class="mr-2 inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/></svg>Oscuro
              </button>
            </div>
          </fieldset>

          <label class="block text-xs font-semibold text-slate-700">
            Moneda predeterminada del dashboard
            <select
              name="monedaPredeterminada"
              [(ngModel)]="monedaPredeterminada"
              class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900">
              @for (moneda of monedas; track moneda.codigo) {
                <option [value]="moneda.codigo">{{ moneda.codigo }} · {{ moneda.nombre }}</option>
              }
            </select>
          </label>

          <div class="flex items-center gap-3">
            <input id="ocultar-montos" type="checkbox" name="ocultarMontos" [(ngModel)]="ocultarMontos" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <label for="ocultar-montos" class="cursor-pointer text-xs font-semibold text-slate-700">
              Ocultar montos en toda la aplicaci&oacute;n
              <span class="mt-0.5 block font-normal text-slate-500">
                Sustituye las cifras por puntos suspensivos. &Uacute;til para mostrar la pantalla en p&uacute;blico. Los porcentajes de las gr&aacute;ficas siguen visibles.
              </span>
            </label>
          </div>

          <div class="flex justify-end border-t border-slate-100 pt-4">
            <button type="submit" [disabled]="guardandoPerfil() || !perfilService.perfil()" class="min-h-11 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {{ guardandoPerfil() ? 'Guardando...' : 'Guardar preferencias' }}
            </button>
          </div>
        </form>
      </section>

      <section id="profile" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="mb-5">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <svg aria-hidden="true" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
            </span>
            <div class="min-w-0">
              <h2 class="text-base font-bold text-slate-900">Perfil</h2>
              <p class="mt-1 text-xs text-slate-500">Actualiza el nombre y correo asociados a tu cuenta.</p>
            </div>
          </div>
        </div>
        @if (perfilService.cargando()) {
          <p role="status" class="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Cargando los datos del perfil...</p>
        } @else if (!perfilService.perfil()) {
          <p class="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Los datos del perfil no están disponibles. Comprueba la conexión con el servidor e inténtalo de nuevo.</p>
        } @else {
          <form (ngSubmit)="guardarPerfil()" class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <label class="block min-w-0 text-xs font-semibold text-slate-700">
              Nombre
              <input name="nombre" [(ngModel)]="nombre" required maxlength="100" autocomplete="name" class="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <label class="block min-w-0 text-xs font-semibold text-slate-700">
              Correo electrónico
              <input name="email" [(ngModel)]="email" required type="email" maxlength="150" autocomplete="email" class="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
                        <label class="block min-w-0 text-xs font-semibold text-slate-700">
              Tel&eacute;fono WhatsApp (Recordatorios)
              <input name="telefono" [(ngModel)]="telefono" maxlength="25" placeholder="Ej. 5219515791240" class="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
            </label>
            <div class="flex items-center min-h-11 md:mt-6 gap-3">
              <input id="notif-wa" type="checkbox" name="notificacionesWhatsapp" [(ngModel)]="notificacionesWhatsapp" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <label for="notif-wa" class="text-xs font-semibold text-slate-700 cursor-pointer">
                Recibir recordatorios por WhatsApp (D&iacute;a de corte, fecha de pago y cuotas MSI)
              </label>
            </div>
            <div class="flex md:col-span-2 md:justify-end">
              <button type="submit" [disabled]="guardandoPerfil() || !perfilService.perfil()" class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 md:w-auto">
                {{ guardandoPerfil() ? 'Guardando...' : 'Guardar perfil' }}
              </button>
            </div>
          </form>
        }
      </section>

      <section id="security" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="mb-5">
          <h2 class="text-base font-bold text-slate-900">Seguridad</h2>
          <p class="mt-1 text-xs text-slate-500">Usa entre 8 y 20 caracteres. Puedes incluir símbolos.</p>
        </div>
        <form (ngSubmit)="cambiarPassword()" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block text-xs font-semibold text-slate-700">
            Contraseña actual
            <input name="passwordActual" [(ngModel)]="passwordActual" required type="password" autocomplete="current-password" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
          </label>
          <label class="block text-xs font-semibold text-slate-700">
            Nueva contraseña
            <input name="passwordNueva" [(ngModel)]="passwordNueva" required minlength="8" maxlength="20" type="password" autocomplete="new-password" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
          </label>
          <div class="flex justify-end sm:col-span-2">
            <button type="submit" [disabled]="guardandoPassword()" class="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {{ guardandoPassword() ? 'Actualizando...' : 'Cambiar contraseña' }}
            </button>
          </div>
        </form>
      </section>

      <section id="backup" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h2 class="text-base font-bold text-slate-900">Respaldo de tus datos</h2>
            <p class="mt-1 text-sm text-slate-600">
              Descarga un archivo JSON con tu perfil, cuentas, categorías personalizadas, presupuestos,
              recurrencias y movimientos. No incluye tu contraseña.
            </p>
            <p class="mt-2 text-xs text-amber-800">
              El archivo contiene información financiera privada; guárdalo en un lugar seguro.
            </p>
          </div>
          <button
            type="button"
            (click)="descargarRespaldo()"
            [disabled]="descargandoRespaldo()"
            class="min-h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {{ descargandoRespaldo() ? 'Preparando respaldo...' : 'Descargar respaldo' }}
          </button>
        </div>
        <div class="mt-5 border-t border-slate-200 pt-5">
          <h3 class="text-sm font-bold text-slate-900">Restaurar desde un respaldo</h3>
          <p class="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Primero revisaremos el archivo. Para evitar duplicados o cambios en tus saldos, solo se restaura en una cuenta sin datos financieros.
            Tu correo, contraseña y preferencias actuales se conservarán.
          </p>
          <label for="backup-file" class="mt-4 block text-xs font-semibold text-slate-700">Archivo JSON de Kaptal (máximo 15 MB)</label>
          <input id="backup-file" type="file" accept=".json,application/json" (change)="seleccionarArchivoRespaldo($event)"
            [disabled]="validandoRespaldo() || restaurandoRespaldo()"
            class="mt-1.5 block min-h-11 w-full max-w-xl rounded-xl border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:min-h-11 file:border-0 file:bg-slate-100 file:px-3 file:font-semibold file:text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600" />
          @if (errorRespaldo()) {
            <p role="alert" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{{ errorRespaldo() }}</p>
          }
          @if (validandoRespaldo()) {
            <p role="status" class="mt-3 text-sm text-slate-600">Validando archivo...</p>
          }
          @if (previewRespaldo(); as preview) {
            <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
              <h4 class="text-sm font-bold text-slate-900">Vista previa del respaldo</h4>
              <p class="mt-1 text-xs text-slate-600">Generado: {{ preview.generadoEn | date:'medium' }} · Versión {{ preview.version }}</p>
              <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div><dt class="text-xs text-slate-500">Cuentas</dt><dd class="font-semibold text-slate-900">{{ preview.cuentas }}</dd></div>
                <div><dt class="text-xs text-slate-500">Categorías</dt><dd class="font-semibold text-slate-900">{{ preview.categorias }}</dd></div>
                <div><dt class="text-xs text-slate-500">Movimientos</dt><dd class="font-semibold text-slate-900">{{ preview.transacciones }}</dd></div>
                <div><dt class="text-xs text-slate-500">Presupuestos</dt><dd class="font-semibold text-slate-900">{{ preview.presupuestos }}</dd></div>
                <div><dt class="text-xs text-slate-500">Recurrentes</dt><dd class="font-semibold text-slate-900">{{ preview.recurrencias }}</dd></div>
                <div><dt class="text-xs text-slate-500">Registro de cambios</dt><dd class="font-semibold text-slate-900">{{ preview.eventosHistorial }}</dd></div>
                <div><dt class="text-xs text-slate-500">Asientos contables</dt><dd class="font-semibold text-slate-900">{{ preview.asientosContables }}</dd></div>
              </dl>
              <ul class="mt-3 space-y-1 text-xs leading-relaxed text-amber-800">
                @for (advertencia of preview.advertencias; track advertencia) { <li>{{ advertencia }}</li> }
              </ul>
              @if (preview.puedeRestaurar) {
                <label class="mt-4 flex cursor-pointer items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <input type="checkbox" [(ngModel)]="confirmarRestauracion" name="confirmarRestauracion"
                    class="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" />
                  <span>Confirmo restaurar estos datos en esta cuenta vacía. Entiendo que la operación solo se puede hacer una vez.</span>
                </label>
                <button type="button" (click)="restaurarRespaldo()"
                  [disabled]="!confirmarRestauracion || restaurandoRespaldo()"
                  class="mt-4 min-h-11 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {{ restaurandoRespaldo() ? 'Restaurando...' : 'Restaurar mis datos' }}
                </button>
              } @else {
                <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                  No se puede restaurar en esta cuenta porque ya contiene datos financieros.
                </p>
              }
            </div>
          }
        </div>
      </section>

      <section id="categories" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Categorías</h2>
            <p class="mt-1 text-xs text-slate-500">Administra, archiva y restaura tus categorías personalizadas.</p>
          </div>
          <a routerLink="/categorias" class="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Administrar categorías
          </a>
        </div>
      </section>

      <section id="recurring" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">Movimientos recurrentes</h2>
            <p class="mt-1 text-xs text-slate-500">Kaptal no crea cargos automáticamente. Confirma cada movimiento cuando llegue su fecha.</p>
          </div>
          <button type="button" (click)="cargarPlantillas()" aria-label="Actualizar movimientos recurrentes" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Actualizar</button>
        </div>

        @if (errorPlantillas()) {
          <div role="alert" class="flex justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <span>{{ errorPlantillas() }}</span>
            <button type="button" (click)="cargarPlantillas()" class="font-semibold underline">Reintentar</button>
          </div>
        } @else if (cargandoPlantillas()) {
          <p class="py-6 text-center text-sm text-slate-400">Cargando plantillas...</p>
        } @else if (plantillas().length === 0) {
          <p class="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aún no hay movimientos recurrentes. Puedes crear uno al registrar un gasto o ingreso.</p>
        } @else {
          <div class="space-y-3">
            @for (plantilla of plantillas(); track plantilla.id) {
              <article class="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-semibold text-slate-900">{{ plantilla.categoriaNombre || (plantilla.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto') }}</h3>
                      <span [class]="plantilla.activa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'" class="rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {{ plantilla.activa ? 'Activa' : 'En pausa' }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ plantilla.monto | monto:plantilla.moneda:'symbol':'1.2-2' }} · {{ frecuenciaTexto(plantilla.frecuencia) }} · {{ nombreCuentaVisible(plantilla.cuentaNombre) }}
                    </p>
                    <p class="mt-1 text-xs font-medium" [class.text-amber-700]="plantilla.activa && plantilla.siguienteFecha <= hoy" [class.text-slate-500]="!plantilla.activa || plantilla.siguienteFecha > hoy">
                      {{ plantilla.siguienteFecha <= hoy && plantilla.activa ? 'Pendiente de confirmar' : 'Siguiente fecha' }}: {{ plantilla.siguienteFecha }}
                    </p>
                    @if (plantilla.notas) {
                      <p class="mt-1 truncate text-xs text-slate-400">{{ plantilla.notas }}</p>
                    }
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-2">
                    @if (plantilla.activa && plantilla.siguienteFecha <= hoy) {
                      <button type="button" (click)="registrar(plantilla)" [disabled]="accionId() === plantilla.id" class="min-h-10 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                        Registrar ahora
                      </button>
                    }
                    <button type="button" (click)="cambiarEstado(plantilla)" [disabled]="accionId() === plantilla.id" class="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {{ plantilla.activa ? 'Pausar' : 'Reanudar' }}
                    </button>
                    <button type="button" (click)="eliminar(plantilla)" [disabled]="accionId() === plantilla.id" class="min-h-10 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </section>

      <section id="danger" class="scroll-mt-24 rounded-2xl border border-rose-200 bg-white p-4 shadow-xs sm:p-6 dark:border-rose-900">
        <div class="mb-5">
          <h2 class="text-base font-bold text-rose-700">Eliminar cuenta</h2>
          <p class="mt-1 text-sm text-slate-600">
            Borra tu cuenta y todo lo que contiene. Esta acción es permanente y no se puede deshacer.
          </p>
        </div>
        <ul class="mb-5 space-y-1.5 rounded-xl bg-rose-50 p-4 text-sm text-rose-900">
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Cuentas, movimientos, presupuestos y recurrencias</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Categorías personalizadas</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Libro contable e historial de auditoría</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Tu usuario, correo y teléfono</span></li>
        </ul>
        <p class="mb-4 text-xs text-slate-600">
          Si quieres conservar tu información, descarga antes el
          <a [routerLink]="[]" fragment="backup" class="font-semibold text-emerald-700 underline">respaldo de tus datos</a>.
        </p>
        <button
          type="button"
          (click)="abrirConfirmacionBorrado()"
          class="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
          Eliminar mi cuenta
        </button>
      </section>

      @if (modalBorradoAbierto()) {
        <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 sm:items-center" (click)="cerrarConfirmacionBorrado()">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-borrado"
            (click)="$event.stopPropagation()"
            class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h3 id="titulo-borrado" class="text-lg font-bold text-slate-900">¿Eliminar tu cuenta definitivamente?</h3>
            <p class="mt-2 text-sm text-slate-600">
              Se borrarán tus cuentas, movimientos, libro contable y toda tu información personal.
              No hay forma de recuperarlos.
            </p>
            @if (googleLinked()) {
              <p class="mt-5 text-sm text-slate-600">Confirma que eres tú con la misma cuenta de Google. La verificación debe hacerse justo antes de eliminar.</p>
            } @else {
              <label class="mt-5 block text-xs font-semibold text-slate-700">
                Escribe tu contraseña para confirmar
                <input
                  name="passwordBorrado"
                  [(ngModel)]="passwordBorrado"
                  type="password"
                  autocomplete="current-password"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
              </label>
            }
            <label class="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input
                name="entiendoBorrado"
                [(ngModel)]="entiendoBorrado"
                type="checkbox"
                class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
              <span>Entiendo que esta acción es permanente y elimina también el libro contable.</span>
            </label>
            @if (errorBorrado()) {
              <p role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{{ errorBorrado() }}</p>
            }
            @if (googleLinked()) {
              <app-google-sign-in
                class="mt-5 block"
                text="continue_with"
                [busy]="eliminandoCuenta() || !entiendoBorrado"
                (credentialReceived)="eliminarCuentaConGoogle($event)" />
            }
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                (click)="cerrarConfirmacionBorrado()"
                [disabled]="eliminandoCuenta()"
                class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancelar
              </button>
              @if (!googleLinked()) {
              <button
                type="button"
                (click)="eliminarCuenta()"
                [disabled]="eliminandoCuenta() || !entiendoBorrado || passwordBorrado.length < 8"
                class="min-h-11 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                {{ eliminandoCuenta() ? 'Eliminando...' : 'Sí, eliminar mi cuenta' }}
              </button>
              }
            </div>
          </div>
        </div>
      }
    </main>
  `
})
export class ConfiguracionComponent implements OnInit {
  readonly nombreCuentaVisible = nombreCuentaVisible;
  readonly monedas = MONEDAS_DISPONIBLES;
  readonly guardandoPerfil = signal(false);
  readonly guardandoPassword = signal(false);
  readonly descargandoRespaldo = signal(false);
  readonly validandoRespaldo = signal(false);
  readonly restaurandoRespaldo = signal(false);
  readonly errorRespaldo = signal<string | null>(null);
  readonly previewRespaldo = signal<RestauracionRespaldoPreview | null>(null);
  readonly plantillas = signal<PlantillaRecurrente[]>([]);
  readonly cargandoPlantillas = signal(true);
  readonly errorPlantillas = signal<string | null>(null);
  readonly accionId = signal<number | null>(null);
  readonly modalBorradoAbierto = signal(false);
  readonly eliminandoCuenta = signal(false);
  readonly errorBorrado = signal<string | null>(null);
  readonly hoy = new Date().toISOString().slice(0, 10);

  nombre = '';
  email = '';
  tema: 'CLARO' | 'OSCURO' = 'CLARO';
  monedaPredeterminada = 'MXN';
  telefono = '';
  notificacionesWhatsapp = false;
  ocultarMontos = false;
  passwordActual = '';
  passwordNueva = '';
  passwordBorrado = '';
  entiendoBorrado = false;
  confirmarRestauracion = false;
  private datosRespaldoSeleccionado: unknown = null;
  private readonly perfilInicializado = new Set<number>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly perfilService = inject(PerfilService);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  constructor() {
    effect(() => {
      const perfil = this.perfilService.perfil();
      if (!perfil || this.perfilInicializado.has(perfil.id)) return;
      this.perfilInicializado.add(perfil.id);
      this.nombre = perfil.nombre;
      this.email = perfil.email;
      this.tema = perfil.tema;
      this.monedaPredeterminada = perfil.monedaPredeterminada;
      this.telefono = perfil.telefono ?? '';
      this.notificacionesWhatsapp = perfil.notificacionesWhatsapp ?? false;
      this.ocultarMontos = perfil.ocultarMontos ?? false;
    });
  }

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  recargarPerfil(): void {
    const usuarioId = this.authService.currentUser()?.id;
    if (usuarioId) this.perfilService.cargar(usuarioId);
  }

  guardarPerfil(): void {
    this.guardandoPerfil.set(true);
    this.perfilService.actualizar({
      nombre: this.nombre.trim(),
      email: this.email.trim(),
      tema: this.tema,
      monedaPredeterminada: this.monedaPredeterminada,
      telefono: this.telefono.trim() || null,
      notificacionesWhatsapp: this.notificacionesWhatsapp,
      ocultarMontos: this.ocultarMontos
    }).subscribe({
      next: response => {
        this.guardandoPerfil.set(false);
        if (!response.success || !response.data) {
          this.toastService.error(response.message || 'No se pudo actualizar el perfil.');
          return;
        }
        this.authService.actualizarUsuario({
          id: response.data.id,
          nombre: response.data.nombre,
          email: response.data.email
        });
        this.perfilInicializado.add(response.data.id);
        this.toastService.success('Configuración guardada.');
      },
      error: err => {
        this.guardandoPerfil.set(false);
        this.toastService.error(err.error?.message || 'No se pudo actualizar el perfil.');
      }
    });
  }

  cambiarPassword(): void {
    if (this.passwordNueva.length < 8 || this.passwordNueva.length > 20) {
      this.toastService.error('La nueva contraseña debe tener entre 8 y 20 caracteres.');
      return;
    }
    this.guardandoPassword.set(true);
    this.perfilService.cambiarPassword({
      passwordActual: this.passwordActual,
      passwordNueva: this.passwordNueva
    }).subscribe({
      next: response => {
        this.guardandoPassword.set(false);
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo cambiar la contraseña.');
          return;
        }
        this.passwordActual = '';
        this.passwordNueva = '';
        this.toastService.success('Contraseña actualizada. Vuelve a iniciar sesión para continuar.');
        this.authService.logout();
      },
      error: err => {
        this.guardandoPassword.set(false);
        this.toastService.error(err.error?.message || 'No se pudo cambiar la contraseña.');
      }
    });
  }

  abrirConfirmacionBorrado(): void {
    this.passwordBorrado = '';
    this.entiendoBorrado = false;
    this.errorBorrado.set(null);
    this.modalBorradoAbierto.set(true);
  }

  googleLinked(): boolean {
    return this.authService.currentUser()?.googleLinked === true;
  }

  cerrarConfirmacionBorrado(): void {
    if (this.eliminandoCuenta()) return;
    this.modalBorradoAbierto.set(false);
    this.passwordBorrado = '';
    this.entiendoBorrado = false;
    this.errorBorrado.set(null);
  }

  eliminarCuenta(): void {
    if (!this.entiendoBorrado || this.passwordBorrado.length < 8 || this.googleLinked()) return;
    this.confirmarEliminacion({ password: this.passwordBorrado });
  }

  eliminarCuentaConGoogle(googleCredential: string): void {
    if (!this.entiendoBorrado || this.eliminandoCuenta() || !this.googleLinked()) return;
    this.confirmarEliminacion({ googleCredential });
  }

  private confirmarEliminacion(payload: { password?: string; googleCredential?: string }): void {
    this.eliminandoCuenta.set(true);
    this.errorBorrado.set(null);
    this.perfilService.eliminarCuenta(payload).subscribe({
      next: response => {
        this.eliminandoCuenta.set(false);
        if (!response.success) {
          this.errorBorrado.set(response.message || 'No se pudo eliminar la cuenta.');
          return;
        }
        this.modalBorradoAbierto.set(false);
        this.toastService.success('Tu cuenta fue eliminada.');
        // El usuario ya no existe, asi que el token guardado no sirve: se cierra la sesion.
        this.perfilService.limpiar();
        this.authService.logout();
      },
      error: err => {
        this.eliminandoCuenta.set(false);
        this.errorBorrado.set(err.error?.message || 'No se pudo eliminar la cuenta.');
      }
    });
  }

  descargarRespaldo(): void {
    if (this.descargandoRespaldo()) return;
    this.descargandoRespaldo.set(true);
    this.finanzasService.descargarRespaldo().subscribe({
      next: response => {
        this.descargandoRespaldo.set(false);
        if (!response.body) {
          this.toastService.error('El servidor devolvió un respaldo vacío.');
          return;
        }
        const url = URL.createObjectURL(response.body);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `kaptal-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
        enlace.hidden = true;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.toastService.success('Respaldo descargado. Guárdalo en un lugar seguro.');
      },
      error: err => {
        this.descargandoRespaldo.set(false);
        this.toastService.error(err.error?.message || 'No se pudo descargar el respaldo.');
      }
    });
  }

  async seleccionarArchivoRespaldo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    this.previewRespaldo.set(null);
    this.errorRespaldo.set(null);
    this.datosRespaldoSeleccionado = null;
    this.confirmarRestauracion = false;
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.json') || archivo.type && archivo.type !== 'application/json') {
      this.errorRespaldo.set('Selecciona un archivo JSON de Kaptal.');
      input.value = '';
      return;
    }
    if (archivo.size === 0 || archivo.size > 15 * 1024 * 1024) {
      this.errorRespaldo.set('El archivo debe tener contenido y no superar 15 MB.');
      input.value = '';
      return;
    }

    let contenido: unknown;
    try {
      contenido = JSON.parse(await archivo.text());
      if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) {
        throw new Error('Formato JSON no válido.');
      }
    } catch {
      this.errorRespaldo.set('No se pudo leer el archivo. Selecciona un respaldo JSON válido de Kaptal.');
      input.value = '';
      return;
    }

    this.datosRespaldoSeleccionado = contenido;
    this.validandoRespaldo.set(true);
    this.finanzasService.previsualizarRespaldo(contenido).subscribe({
      next: response => {
        this.validandoRespaldo.set(false);
        if (!response.success || !response.data) {
          this.datosRespaldoSeleccionado = null;
          this.errorRespaldo.set(response.message || 'No se pudo validar el respaldo.');
          input.value = '';
          return;
        }
        this.previewRespaldo.set(response.data);
      },
      error: error => {
        this.validandoRespaldo.set(false);
        this.datosRespaldoSeleccionado = null;
        this.errorRespaldo.set(error.error?.message || 'No se pudo validar el respaldo.');
        input.value = '';
      }
    });
  }

  restaurarRespaldo(): void {
    if (!this.confirmarRestauracion || !this.previewRespaldo()?.puedeRestaurar
        || !this.datosRespaldoSeleccionado || this.restaurandoRespaldo()) return;
    this.restaurandoRespaldo.set(true);
    this.errorRespaldo.set(null);
    this.finanzasService.restaurarRespaldo(this.datosRespaldoSeleccionado).subscribe({
      next: response => {
        this.restaurandoRespaldo.set(false);
        if (!response.success) {
          this.errorRespaldo.set(response.message || 'No se pudo restaurar el respaldo.');
          return;
        }
        this.datosRespaldoSeleccionado = null;
        this.previewRespaldo.set(null);
        this.confirmarRestauracion = false;
        this.toastService.success('Respaldo restaurado. Se conservaron tu cuenta y contraseña actuales.');
        this.router.navigateByUrl('/dashboard');
      },
      error: error => {
        this.restaurandoRespaldo.set(false);
        this.errorRespaldo.set(error.error?.message || 'No se pudo restaurar el respaldo.');
      }
    });
  }

  cargarPlantillas(): void {
    this.cargandoPlantillas.set(true);
    this.errorPlantillas.set(null);
    this.finanzasService.getPlantillasRecurrentes().subscribe({
      next: response => {
        this.cargandoPlantillas.set(false);
        if (!response.success || !response.data) {
          this.errorPlantillas.set(response.message || 'No se pudieron cargar los movimientos recurrentes.');
          return;
        }
        this.plantillas.set(response.data);
      },
      error: err => {
        this.cargandoPlantillas.set(false);
        this.errorPlantillas.set(err.error?.message || 'No se pudieron cargar los movimientos recurrentes.');
      }
    });
  }

  registrar(plantilla: PlantillaRecurrente): void {
    this.accionId.set(plantilla.id);
    this.finanzasService.registrarMovimientoRecurrente(plantilla.id).subscribe({
      next: response => {
        this.accionId.set(null);
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo registrar el movimiento.');
          return;
        }
        this.toastService.success('Movimiento recurrente registrado y próxima fecha actualizada.');
        this.cargarPlantillas();
      },
      error: err => {
        this.accionId.set(null);
        this.toastService.error(err.error?.message || 'No se pudo registrar el movimiento.');
      }
    });
  }

  cambiarEstado(plantilla: PlantillaRecurrente): void {
    this.accionId.set(plantilla.id);
    this.finanzasService.cambiarEstadoPlantillaRecurrente(plantilla.id, !plantilla.activa).subscribe({
      next: response => {
        this.accionId.set(null);
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo actualizar la plantilla.');
          return;
        }
        this.plantillas.update(items => items.map(item => item.id === plantilla.id ? response.data : item));
        this.toastService.success(response.data.activa ? 'Movimiento recurrente reanudado.' : 'Movimiento recurrente pausado.');
      },
      error: err => {
        this.accionId.set(null);
        this.toastService.error(err.error?.message || 'No se pudo actualizar la plantilla.');
      }
    });
  }

  eliminar(plantilla: PlantillaRecurrente): void {
    this.confirmDialog.confirm({
      title: 'Eliminar movimiento recurrente',
      message: 'Se eliminará la plantilla. Los movimientos que ya registraste se conservarán.',
      confirmText: 'Eliminar plantilla',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.accionId.set(plantilla.id);
      this.finanzasService.eliminarPlantillaRecurrente(plantilla.id).subscribe({
        next: response => {
          this.accionId.set(null);
          if (!response.success) {
            this.toastService.error(response.message || 'No se pudo eliminar la plantilla.');
            return;
          }
          this.plantillas.update(items => items.filter(item => item.id !== plantilla.id));
          this.toastService.success('Plantilla recurrente eliminada.');
        },
        error: err => {
          this.accionId.set(null);
          this.toastService.error(err.error?.message || 'No se pudo eliminar la plantilla.');
        }
      });
    });
  }

  frecuenciaTexto(frecuencia: PlantillaRecurrente['frecuencia']): string {
    switch (frecuencia) {
      case 'SEMANAL': return 'Cada semana';
      case 'QUINCENAL': return 'Cada dos semanas';
      case 'MENSUAL': return 'Cada mes';
      case 'ANUAL': return 'Cada año';
    }
  }
}
