import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';

@Component({
  selector: 'app-recuperar-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-3 py-6 sm:min-h-[calc(100dvh-4rem)] sm:px-4">
      <section class="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
        <header class="space-y-2 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700" aria-hidden="true">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          </div>
          @if (token()) {
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Crea una nueva contraseña</h1>
            <p class="text-sm text-slate-500">El enlace es temporal y solo se puede usar una vez.</p>
          } @else {
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Recupera tu cuenta</h1>
            <p class="text-sm text-slate-500">Te enviaremos un enlace para cambiar tu contraseña.</p>
          }
        </header>

        @if (mensaje()) {
          <p role="status" aria-live="polite" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">{{ mensaje() }}</p>
        }
        @if (error()) {
          <p role="alert" aria-live="assertive" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-relaxed text-rose-800">{{ error() }}</p>
        }

        @if (!token()) {
          @if (!solicitudEnviada()) {
            <form (ngSubmit)="solicitar()" class="space-y-4">
              <div>
                <label for="recovery-email" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Correo electrónico</label>
                <input id="recovery-email" name="email" type="email" autocomplete="email" required maxlength="150"
                  [(ngModel)]="email" placeholder="tu@correo.com"
                  class="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button type="submit" [disabled]="cargando()"
                class="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {{ cargando() ? 'Enviando...' : 'Enviar enlace de recuperación' }}
              </button>
            </form>
          }
        } @else if (!passwordActualizada()) {
          <form (ngSubmit)="restablecer()" class="space-y-4">
            <div>
              <label for="new-password" class="mb-1.5 block text-xs font-semibold text-slate-700">Nueva contraseña</label>
              <input id="new-password" name="passwordNueva" type="password" autocomplete="new-password" required minlength="8" maxlength="20"
                [(ngModel)]="passwordNueva"
                class="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500" />
              <p class="mt-1.5 text-xs text-slate-500">Entre 8 y 20 caracteres. Puedes incluir símbolos.</p>
            </div>
            <div>
              <label for="confirm-password" class="mb-1.5 block text-xs font-semibold text-slate-700">Confirma la nueva contraseña</label>
              <input id="confirm-password" name="confirmarPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="20"
                [(ngModel)]="confirmarPassword"
                class="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button type="submit" [disabled]="cargando()"
              class="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {{ cargando() ? 'Actualizando...' : 'Cambiar contraseña' }}
            </button>
          </form>
        }

        <div class="border-t border-slate-100 pt-4 text-center text-sm">
          <a routerLink="/login" class="rounded font-semibold text-emerald-700 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600">Volver a iniciar sesión</a>
        </div>
      </section>
    </main>
  `
})
export class RecuperarCuentaComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly solicitudEnviada = signal(false);
  readonly passwordActualizada = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  email = '';
  passwordNueva = '';
  confirmarPassword = '';

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      this.token.set(token && /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : null);
      if (token && !this.token()) {
        this.error.set('El enlace de recuperación no es válido. Solicita uno nuevo.');
      }
    });
  }

  solicitar(): void {
    if (this.cargando()) return;
    this.error.set(null);
    this.mensaje.set(null);
    this.cargando.set(true);
    this.authService.solicitarRecuperacion({ email: this.email.trim() }).subscribe({
      next: response => {
        this.cargando.set(false);
        this.solicitudEnviada.set(true);
        this.mensaje.set(response.data === false
          ? 'La recuperación por correo todavía no está configurada en el servidor.'
          : response.message || 'Si existe una cuenta con ese correo, enviaremos un enlace para cambiar la contraseña.');
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo procesar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
      }
    });
  }

  restablecer(): void {
    const token = this.token();
    if (!token || this.cargando()) return;
    this.error.set(null);
    this.mensaje.set(null);
    if (this.passwordNueva.length < 8 || this.passwordNueva.length > 20) {
      this.error.set('La contraseña debe tener entre 8 y 20 caracteres.');
      return;
    }
    if (this.passwordNueva !== this.confirmarPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.cargando.set(true);
    this.authService.restablecerPassword({ token, passwordNueva: this.passwordNueva }).subscribe({
      next: response => {
        this.cargando.set(false);
        if (!response.success) {
          this.error.set(response.message || 'No se pudo cambiar la contraseña.');
          return;
        }
        this.passwordActualizada.set(true);
        this.mensaje.set(response.message || 'La contraseña se actualizó. Inicia sesión con tu nueva contraseña.');
      },
      error: error => {
        this.cargando.set(false);
        this.error.set(
          mensajeDeError(error, 'El enlace no es válido o ya expiró. Solicita uno nuevo.')
        );
      }
    });
  }
}
