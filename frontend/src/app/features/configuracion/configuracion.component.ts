import { CommonModule, DOCUMENT } from '@angular/common';
import { fechaFinanciera } from '../../core/utils/fecha-financiera';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { GoogleSignInComponent } from '../auth/google-sign-in/google-sign-in.component';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PrivacidadService } from '../../core/services/privacidad.service';
import { ToastService } from '../../core/services/toast.service';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { RestauracionRespaldoPreview } from '../../core/models/auth.models';
import { nombreCuentaVisible } from '../../core/utils/cuenta-financiera';
import { mensajeDeError } from '../../core/utils/mensaje-error';
import {
  MONEDAS_DISPONIBLES,
  PlantillaRecurrente
} from '../../core/models/finanzas.models';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MontoPipe, GoogleSignInComponent],
  template: `
    <main class="finance-page mx-auto max-w-4xl space-y-5 px-3 py-5 sm:space-y-7 sm:px-6 sm:py-8">
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
        <a [routerLink]="[]" fragment="notifications" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Avisos</a>
        <a [routerLink]="[]" fragment="security" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Seguridad</a>
        <a [routerLink]="[]" fragment="backup" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Respaldo</a>
        <a [routerLink]="[]" fragment="categories" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Categorías</a>
        <a [routerLink]="[]" fragment="recurring" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Recurrentes</a>
      </nav>

      <section class="settings-management" aria-label="Herramientas financieras"><h2>Organiza tus finanzas</h2><nav><a routerLink="/cuentas">Cuentas y tarjetas <span>›</span></a><a routerLink="/categorias">Categorías <span>›</span></a><a [routerLink]="[]" fragment="recurring">Recurrentes <span>›</span></a><a routerLink="/libro-diario">Libro diario <span>›</span></a><a routerLink="/pareja">Gastos compartidos <span>›</span></a></nav></section>

      @if (perfilService.error()) {
        <div role="alert" class="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span class="min-w-0 break-words">{{ perfilService.error() }}</span>
          <button type="button" (click)="recargarPerfil()" class="min-h-10 shrink-0 self-start rounded-lg px-3 font-semibold underline sm:self-auto">Reintentar</button>
        </div>
      }

      <section id="appearance" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div class="mb-5">
          <h2 class="text-base font-bold text-slate-900">Apariencia y visualización</h2>
          <p class="mt-1 text-xs text-slate-500">Los temas claro y oscuro y la moneda se sincronizan; Automático sigue el sistema en este dispositivo.</p>
        </div>
        <form (ngSubmit)="guardarPerfil()" class="space-y-4">
          <fieldset>
            <legend class="mb-2 text-xs font-semibold text-slate-700">Tema</legend>
            <div class="grid grid-cols-3 gap-2">
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
                [class]="tema === 'OSCURO' ? 'theme-button--selected-dark' : 'border-slate-200 bg-white text-slate-700'"
                class="min-h-12 rounded-xl border px-3 text-sm font-semibold">
                <svg aria-hidden="true" class="mr-2 inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/></svg>Oscuro
              </button>
              <button
                type="button"
                (click)="tema = 'AUTO'"
                [attr.aria-pressed]="tema === 'AUTO'"
                [class]="tema === 'AUTO' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500' : 'border-slate-200 bg-white text-slate-700'"
                class="min-h-12 rounded-xl border px-2 text-sm font-semibold">
                Automático
              </button>
            </div>
            @if (tema === 'AUTO') {
              <p class="mt-2 text-xs text-slate-500">Automático sigue la apariencia del sistema en este dispositivo.</p>
            }
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
            <input id="ocultar-montos" type="checkbox" name="ocultarMontos" [ngModel]="privacidad.ocultarMontos()" (ngModelChange)="perfilService.alternarOcultarMontos()" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
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
            <span role="img" [attr.aria-label]="'Avatar de ' + nombre" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold uppercase text-emerald-800">
              {{ avatarIniciales() }}
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
              <input name="telefono" [(ngModel)]="telefono" (ngModelChange)="limpiarPinWhatsApp()" maxlength="25" placeholder="Ej. 5219515791240" class="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900" />
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
          <section class="wa-connect-card" aria-labelledby="wa-connect-title">
            <header class="wa-connect-card__header">
              <div class="wa-connect-card__title-row">
                <svg class="wa-connect-card__icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path fill="#25D366" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.81-.37-4.04-1.08l-.29-.17-3.12.82.83-3.04-.19-.3a8.18 8.18 0 0 1-1.25-4.47c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.32"/>
                </svg>
                <h3 id="wa-connect-title" class="wa-connect-card__title">Integración WhatsApp</h3>
              </div>
              @if (notificacionesWhatsapp && telefono.trim()) {
                <span class="wa-connect-card__badge" aria-label="Recordatorios de WhatsApp activos">
                  <span class="wa-connect-card__badge-dot"></span> Recordatorios activos
                </span>
              }
            </header>

            <p class="wa-connect-card__body">
              Conecta tu cuenta de WhatsApp para registrar movimientos por mensaje, consultar balances al instante y recibir recordatorios inteligentes de tus cortes y fechas de pago.
            </p>

            <button
              type="button"
              class="wa-connect-card__action-btn"
              (click)="generarPinWhatsApp()"
              [disabled]="generandoPinWhatsApp() || !puedeSolicitarPinWhatsApp"
              aria-describedby="whatsapp-pin-status">
              {{ generandoPinWhatsApp() ? 'Generando PIN...' : 'Obtener PIN' }}
            </button>
            <p id="whatsapp-pin-status" class="mt-2 text-xs text-slate-600" role="status">
              El PIN se genera en el servidor y vence a los 10 minutos. Envíalo al bot desde el número de WhatsApp guardado en tu perfil.
            </p>
            @if (!puedeSolicitarPinWhatsApp) {
              <p class="mt-2 text-xs text-amber-800">Guarda primero tu teléfono con código de país en el perfil para habilitar la vinculación.</p>
            }
            @if (errorPinWhatsApp()) {
              <p role="alert" class="mt-2 text-sm text-rose-700">{{ errorPinWhatsApp() }}</p>
            }
            @if (pinCodigo()) {
              <div class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p class="text-xs text-emerald-900">Tu PIN de vinculación (válido {{ pinVigenciaSegundos() / 60 }} minutos)</p>
                <p class="my-1 font-mono text-2xl font-bold tracking-[0.25em] text-emerald-950">{{ pinCodigo() }}</p>
                <a [href]="enlaceWhatsApp()" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800">
                  Abrir WhatsApp y enviar PIN
                </a>
              </div>
            }
            @if (puedeProbarWhatsApp) {
              <button type="button" class="wa-connect-card__test-btn mt-3" (click)="probarWhatsApp()" [disabled]="probandoWhatsApp()">
              {{ probandoWhatsApp() ? 'Enviando prueba…' : 'Enviar mensaje de prueba' }}
              </button>
            }
          </section>
        }
      </section>

      <section id="notifications" class="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <div class="mb-4">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Avisos en tu dispositivo</h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Recibe recordatorios de corte, pago estimado y movimientos programados aunque Kaptal no esté abierto.</p>
        </div>
        @if (!pushConfigurado()) {
          <p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
            El servidor todavía no tiene claves Web Push. El administrador debe configurarlas para activar esta opción.
          </p>
        } @else if (!swPush.isEnabled) {
          <p class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" role="status">
            Instala Kaptal desde un navegador compatible y usa una conexión segura para activar avisos.
          </p>
        } @else {
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-slate-600 dark:text-slate-300">
              {{ pushActivo() ? 'Los avisos de Kaptal están activados en este dispositivo.' : 'Los avisos están desactivados en este dispositivo.' }}
            </p>
            @if (pushActivo()) {
              <button type="button" (click)="desactivarPush()" [disabled]="guardandoPush()" class="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                {{ guardandoPush() ? 'Actualizando…' : 'Desactivar avisos' }}
              </button>
            } @else {
              <button type="button" (click)="activarPush()" [disabled]="guardandoPush()" class="min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {{ guardandoPush() ? 'Activando…' : 'Activar avisos' }}
              </button>
            }
          </div>
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
        <div class="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-slate-600">Sesión iniciada como {{ perfilService.perfil()?.email }}</p>
          <button type="button" (click)="authService.logout()" class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
            Cerrar sesión
          </button>
        </div>
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
          <div class="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              (click)="exportarCsv()"
              [disabled]="exportandoCsv()"
              class="min-h-11 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
              {{ exportandoCsv() ? 'Preparando CSV...' : 'Exportar CSV' }}
            </button>
            <button
              type="button"
              (click)="descargarRespaldo()"
              [disabled]="descargandoRespaldo()"
              class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {{ descargandoRespaldo() ? 'Preparando respaldo...' : 'Descargar respaldo' }}
            </button>
          </div>
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
                        {{ plantilla.cuotasTotales != null && (plantilla.cuotasPagadas ?? 0) >= plantilla.cuotasTotales ? 'Completada' : (plantilla.activa ? 'Activa' : 'En pausa') }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ plantilla.monto | monto:plantilla.moneda:'symbol':'1.2-2' }} · {{ frecuenciaTexto(plantilla.frecuencia) }} · {{ nombreCuentaVisible(plantilla.cuentaNombre) }}
                    </p>
                    <p class="mt-1 text-xs font-medium" [class.text-amber-700]="plantilla.activa && plantilla.siguienteFecha <= hoy" [class.text-slate-500]="!plantilla.activa || plantilla.siguienteFecha > hoy">
                      @if (msiCompletada(plantilla)) {
                        Plan de pagos completado
                      } @else {
                        {{ plantilla.siguienteFecha <= hoy && plantilla.activa ? 'Pendiente de confirmar' : 'Siguiente fecha' }}: {{ plantilla.siguienteFecha }}
                      }
                    </p>
                    @if (plantilla.cuotasTotales != null) {
                      <p class="mt-1 text-xs text-slate-500">MSI · {{ (plantilla.cuotasPagadas ?? 0) + 1 }} de {{ plantilla.cuotasTotales + 1 }} cuotas registradas</p>
                      <p class="mt-1 text-xs text-slate-500">Pendiente: {{ (plantilla.montoPendiente ?? plantilla.monto * (plantilla.cuotasTotales - (plantilla.cuotasPagadas ?? 0))) | monto:plantilla.moneda:'symbol':'1.2-2' }}. La última cuota ajusta los centavos.</p>
                    }
                    @if (plantilla.notas) {
                      <p class="mt-1 truncate text-xs text-slate-400">{{ plantilla.notas }}</p>
                    }
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-2">
                    @if (plantilla.activa && plantilla.siguienteFecha <= hoy) {
                      <button type="button" (click)="registrar(plantilla)" [disabled]="accionId() === plantilla.id" class="min-h-11 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                        Registrar ahora
                      </button>
                    }
                    <button type="button" (click)="cambiarEstado(plantilla)" [disabled]="accionId() === plantilla.id || msiCompletada(plantilla)" class="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {{ plantilla.activa ? 'Pausar' : 'Reanudar' }}
                    </button>
                    <button type="button" (click)="eliminar(plantilla)" [disabled]="accionId() === plantilla.id" class="min-h-11 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                      {{ msiCompletada(plantilla) ? 'Eliminar plan' : (plantilla.cuotasTotales != null ? 'Cancelar pendientes' : 'Eliminar') }}
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
          <h2 class="text-base font-bold text-rose-700">Eliminar mi cuenta</h2>
          <p class="mt-1 text-sm text-slate-600">
            Borra tu cuenta y todos sus datos financieros. Esta acción es permanente y no se puede deshacer.
          </p>
        </div>
        <ul class="mb-5 space-y-1.5 rounded-xl bg-rose-50 p-4 text-sm text-rose-900">
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Cuentas, movimientos, presupuestos y recurrencias</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Categorías personalizadas</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Libro contable e historial de auditoría</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>Tu usuario, correo y teléfono</span></li>
          <li class="flex gap-2"><span aria-hidden="true">·</span><span>La vinculación con tu pareja. El otro miembro conserva su historial compartido de consulta con tu cuenta identificada como «Cuenta eliminada».</span></li>
        </ul>
        <p class="mb-4 text-xs text-slate-600">
          Si quieres conservar tu información, descarga antes el
          <a [routerLink]="[]" fragment="backup" class="font-semibold text-emerald-700 underline">respaldo de tus datos</a>.
        </p>
        <button
          type="button"
          (click)="abrirConfirmacionBorrado()"
          class="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
          Eliminar mi cuenta y todos sus datos
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
            <h3 id="titulo-borrado" class="text-lg font-bold text-slate-900">¿Borrar tus datos y eliminar la cuenta definitivamente?</h3>
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
              <span>Entiendo que se eliminará mi cuenta y toda su información permanentemente.</span>
            </label>
                <label class="mt-4 block text-xs font-semibold text-slate-700">
                  Escribe ELIMINAR para confirmar
                  <input name="palabraBorrado" [(ngModel)]="palabraBorrado" required maxlength="7" autocomplete="off" class="mt-1.5 w-full rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-sm font-normal uppercase text-slate-900" />
                </label>
            @if (errorBorrado()) {
              <p role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{{ errorBorrado() }}</p>
            }
            @if (googleLinked()) {
              <app-google-sign-in
                class="mt-5 block"
                text="continue_with"
                [busy]="eliminandoCuenta() || !entiendoBorrado || palabraBorrado !== 'ELIMINAR'"
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
                [disabled]="eliminandoCuenta() || !entiendoBorrado || palabraBorrado !== 'ELIMINAR' || passwordBorrado.length < 8"
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
  readonly exportandoCsv = signal(false);
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
  get hoy(): string { return fechaFinanciera(); }
  readonly pushConfigurado = signal(false);
  readonly pushActivo = signal(false);
  readonly guardandoPush = signal(false);
  readonly probandoWhatsApp = signal(false);
  readonly generandoPinWhatsApp = signal(false);
  readonly pinCodigo = signal<string | null>(null);
  readonly pinVigenciaSegundos = signal(0);
  readonly enlaceWhatsApp = signal('');
  readonly errorPinWhatsApp = signal<string | null>(null);

  nombre = '';
  email = '';
  tema: 'CLARO' | 'OSCURO' | 'AUTO' = 'CLARO';
  monedaPredeterminada = 'MXN';
  telefono = '';
  notificacionesWhatsapp = false;
  readonly privacidad = inject(PrivacidadService);
  passwordActual = '';
  passwordNueva = '';
  passwordBorrado = '';
  palabraBorrado = '';
  entiendoBorrado = false;
  confirmarRestauracion = false;
  private datosRespaldoSeleccionado: unknown = null;
  private readonly perfilInicializado = new Set<number>();

  get puedeProbarWhatsApp(): boolean {
    const telefonoGuardado = this.perfilService.perfil()?.telefono?.trim();
    return !!telefonoGuardado && telefonoGuardado === this.telefono.trim();
  }

  get puedeSolicitarPinWhatsApp(): boolean {
    return this.puedeProbarWhatsApp;
  }

  avatarIniciales(): string {
    return this.nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase() || 'K';
  }

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  readonly perfilService = inject(PerfilService);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly swPush = inject(SwPush);

  constructor() {
    effect(() => {
      const perfil = this.perfilService.perfil();
      if (!perfil || this.perfilInicializado.has(perfil.id)) return;
      this.perfilInicializado.add(perfil.id);
      this.nombre = perfil.nombre;
      this.email = perfil.email;
      this.tema = this.perfilService.esTemaAutomatico(perfil.id) ? 'AUTO' : perfil.tema;
      this.monedaPredeterminada = perfil.monedaPredeterminada;
      this.telefono = perfil.telefono ?? '';
      this.notificacionesWhatsapp = perfil.notificacionesWhatsapp ?? false;
    });
  }

  ngOnInit(): void {
    this.cargarPlantillas();
    void this.cargarEstadoPush();
  }

  private async cargarEstadoPush(): Promise<void> {
    try {
      const response = await firstValueFrom(this.finanzasService.getConfiguracionPush());
      this.pushConfigurado.set(response.success && response.data?.configurado === true);
      if (!this.pushConfigurado() || !this.swPush.isEnabled) return;
      const subscription = await firstValueFrom(this.swPush.subscription);
      this.pushActivo.set(subscription !== null);
      if (subscription) {
        await firstValueFrom(this.finanzasService.guardarSuscripcionPush(subscription.toJSON()));
      }
    } catch {
      this.pushActivo.set(false);
    }
  }

  async activarPush(): Promise<void> {
    if (!this.pushConfigurado() || !this.swPush.isEnabled || this.guardandoPush()) return;
    this.guardandoPush.set(true);
    try {
      const response = await firstValueFrom(this.finanzasService.getConfiguracionPush());
      const publicKey = response.data?.clavePublica;
      if (!response.success || !publicKey) throw new Error('El servidor no entregó la clave pública Web Push.');
      const subscription = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
      const saved = await firstValueFrom(this.finanzasService.guardarSuscripcionPush(subscription.toJSON()));
      if (!saved.success) throw new Error(saved.message || 'No se pudo guardar el dispositivo.');
      this.pushActivo.set(true);
      this.toastService.success('Avisos activados en este dispositivo.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudieron activar los avisos.';
      this.toastService.error(message);
    } finally {
      this.guardandoPush.set(false);
    }
  }

  async desactivarPush(): Promise<void> {
    if (!this.swPush.isEnabled || this.guardandoPush()) return;
    this.guardandoPush.set(true);
    try {
      const subscription = await firstValueFrom(this.swPush.subscription);
      if (subscription) {
        await firstValueFrom(this.finanzasService.eliminarSuscripcionPush(subscription.toJSON()));
        await this.swPush.unsubscribe();
      }
      this.pushActivo.set(false);
      this.toastService.success('Avisos desactivados en este dispositivo.');
    } catch {
      this.toastService.error('No se pudieron desactivar los avisos. Inténtalo otra vez.');
    } finally {
      this.guardandoPush.set(false);
    }
  }

  recargarPerfil(): void {
    const usuarioId = this.authService.currentUser()?.id;
    if (usuarioId) this.perfilService.cargar(usuarioId);
  }

  guardarPerfil(): void {
    this.guardandoPerfil.set(true);
    const usuarioId = this.perfilService.perfil()?.id;
    if (usuarioId) this.perfilService.configurarTema(usuarioId, this.tema);
    this.perfilService.actualizar({
      nombre: this.nombre.trim(),
      email: this.email.trim(),
      tema: this.tema === 'AUTO' ? this.perfilService.temaSistema() : this.tema,
      monedaPredeterminada: this.monedaPredeterminada,
      telefono: this.telefono.trim() || null,
      notificacionesWhatsapp: this.notificacionesWhatsapp,
      ocultarMontos: this.privacidad.ocultarMontos()
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

  probarWhatsApp(): void {
    if (!this.telefono.trim() || this.probandoWhatsApp()) return;
    this.probandoWhatsApp.set(true);
    this.finanzasService.enviarPruebaWhatsApp().subscribe({
      next: response => {
        this.probandoWhatsApp.set(false);
        if (response.success) this.toastService.success('Mensaje de prueba enviado a tu número.');
        else this.toastService.error(response.message || 'No se pudo enviar el mensaje.');
      },
      error: error => {
        this.probandoWhatsApp.set(false);
        this.toastService.error(error?.error?.message || 'No se pudo enviar el mensaje de prueba.');
      }
    });
  }

  generarPinWhatsApp(): void {
    if (!this.puedeSolicitarPinWhatsApp || this.generandoPinWhatsApp()) return;
    this.generandoPinWhatsApp.set(true);
    this.errorPinWhatsApp.set(null);
    this.finanzasService.obtenerPinVinculacionWhatsApp().subscribe({
      next: response => {
        this.generandoPinWhatsApp.set(false);
        if (!response.success || !response.data?.pin || !response.data.numeroBot) {
          this.errorPinWhatsApp.set(response.message || 'No se pudo generar el PIN.');
          return;
        }
        this.pinCodigo.set(response.data.pin);
        this.pinVigenciaSegundos.set(response.data.vigenciaSegundos);
        this.enlaceWhatsApp.set(
          `https://wa.me/${response.data.numeroBot}?text=${encodeURIComponent(`VINCULAR ${response.data.pin}`)}`
        );
      },
      error: error => {
        this.generandoPinWhatsApp.set(false);
        this.errorPinWhatsApp.set(error?.error?.message || 'No se pudo generar el PIN de WhatsApp.');
      }
    });
  }

  limpiarPinWhatsApp(): void {
    this.pinCodigo.set(null);
    this.pinVigenciaSegundos.set(0);
    this.enlaceWhatsApp.set('');
    this.errorPinWhatsApp.set(null);
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
    this.palabraBorrado = '';
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
    this.palabraBorrado = '';
    this.entiendoBorrado = false;
    this.errorBorrado.set(null);
  }

  eliminarCuenta(): void {
    if (!this.entiendoBorrado || this.palabraBorrado !== 'ELIMINAR' || this.passwordBorrado.length < 8 || this.googleLinked()) return;
    this.confirmarEliminacion({ password: this.passwordBorrado });
  }

  eliminarCuentaConGoogle(googleCredential: string): void {
    if (!this.entiendoBorrado || this.palabraBorrado !== 'ELIMINAR' || this.eliminandoCuenta() || !this.googleLinked()) return;
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

  async exportarCsv(): Promise<void> {
    if (this.exportandoCsv()) return;
    this.exportandoCsv.set(true);
    try {
      const response = await firstValueFrom(this.finanzasService.exportarTransaccionesCsv());
      if (!response.body || response.body.size === 0) throw new Error('El servidor devolvió un CSV vacío.');
      const nombre = `kaptal-movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
      const archivo = new File([response.body], nombre, { type: 'text/csv;charset=utf-8' });
      const navegador = this.document.defaultView?.navigator;
      if (navegador?.share && navegador.canShare?.({ files: [archivo] })) {
        await navegador.share({ files: [archivo], title: 'Movimientos de Kaptal' });
        this.toastService.success('CSV compartido.');
      } else {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        enlace.hidden = true;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.toastService.success('CSV descargado.');
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.toastService.error(mensajeDeError(error, 'No se pudieron exportar los movimientos.'));
    } finally {
      this.exportandoCsv.set(false);
    }
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
      title: plantilla.cuotasTotales != null && !this.msiCompletada(plantilla) ? 'Cancelar cuotas pendientes' : 'Eliminar movimiento recurrente',
      message: plantilla.cuotasTotales != null && !this.msiCompletada(plantilla) ? 'Se cancelarán las cuotas futuras y se liberará su crédito retenido. Los pagos registrados se conservarán. Pausar conserva la retención.' : 'Se eliminará la plantilla. Los movimientos que ya registraste se conservarán.',
      confirmText: plantilla.cuotasTotales != null && !this.msiCompletada(plantilla) ? 'Cancelar cuotas pendientes' : 'Eliminar plantilla',
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

  msiCompletada(plantilla: PlantillaRecurrente): boolean {
    return plantilla.cuotasTotales != null && (plantilla.cuotasPagadas ?? 0) >= plantilla.cuotasTotales;
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
