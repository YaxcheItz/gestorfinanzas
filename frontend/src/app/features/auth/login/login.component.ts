import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-3 py-5 sm:min-h-[calc(100dvh-4rem)] sm:px-4 sm:py-6">
    <div class="w-full min-w-0 max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50 sm:p-8">
        
        <div class="text-center space-y-2">
          <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl mx-auto flex items-center justify-center font-bold text-xl mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Bienvenido de nuevo</h1>
          <p class="text-sm text-slate-500">Ingresa a tu gestor de finanzas personales</p>
        </div>

        @if (sessionExpiredWarning()) {
          <div class="break-words bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-amber-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>Tu sesión ha expirado. Ingresa nuevamente para continuar.</span>
          </div>
        }

        @if (errorMessage()) {
          <div role="alert" aria-live="assertive" class="break-words bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-rose-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="email" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              [(ngModel)]="email"
              placeholder="tu@correo.com"
              class="min-h-11 w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div class="relative">
            <input
              id="password"
              name="password"
              [type]="mostrarPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              required
              [(ngModel)]="password"
              placeholder="••••••••"
              class="min-h-11 w-full min-w-0 px-3.5 py-2.5 pr-14 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <button type="button" (click)="togglePasswordVisibility()" [attr.aria-pressed]="mostrarPassword()" [attr.aria-label]="mostrarPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" class="absolute right-1 top-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-300 dark:hover:bg-slate-700">
              <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="min-h-12 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            @if (loading()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Ingresando...</span>
            } @else {
              <span>Iniciar Sesión</span>
            }
          </button>
        </form>

        <div class="text-center -mt-2">
          <a routerLink="/recuperar-cuenta" class="rounded text-sm font-semibold text-emerald-700 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <div class="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          ¿No tienes una cuenta aún?
          <a routerLink="/registro" class="text-emerald-600 font-semibold hover:underline ml-1">
            Regístrate aquí
          </a>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  sessionExpiredWarning = signal<boolean>(false);
  mostrarPassword = signal(false);

  constructor() {
    // Detectar si viene desde un redirect por sesión expirada
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        this.sessionExpiredWarning.set(true);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.mostrarPassword.update(visible => !visible);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.sessionExpiredWarning.set(false);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          mensajeDeError(err, 'Error de conexión con el backend o credenciales incorrectas.')
        );
      }
    });
  }
}
