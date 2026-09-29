import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-3 py-5 sm:min-h-[calc(100dvh-4rem)] sm:px-4 sm:py-6">
      <div class="w-full min-w-0 max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50 sm:p-8">
        
        <div class="text-center space-y-2">
          <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl mx-auto flex items-center justify-center font-bold text-xl mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Crea tu cuenta</h1>
          <p class="text-sm text-slate-500">Comienza a organizar tus finanzas personales hoy</p>
        </div>

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
            <label for="nombre" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre Completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              autocomplete="name"
              required
              minlength="2"
              maxlength="100"
              [(ngModel)]="nombre"
              placeholder="Juan Pérez"
              class="min-h-11 w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

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
              maxlength="150"
              [attr.aria-invalid]="email.length > 0 && !emailCumpleRequisitos()"
              [attr.aria-describedby]="email.length > 0 && !emailCumpleRequisitos() ? 'email-ayuda email-error' : 'email-ayuda'"
              [(ngModel)]="email"
              placeholder="tu@correo.com"
              class="min-h-11 w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <p id="email-ayuda" class="mt-1.5 text-xs leading-relaxed text-slate-500">Usa un formato como nombre@dominio.com.</p>
            @if (email.length > 0 && !emailCumpleRequisitos()) {
              <p id="email-error" role="alert" class="mt-1 text-xs font-medium text-rose-700">
                Escribe un correo válido con @ y un dominio, por ejemplo nombre@dominio.com.
              </p>
            }
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
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="20"
              [attr.aria-invalid]="password.length > 0 && !passwordCumpleRequisitos()"
              [attr.aria-describedby]="password.length > 0 && !passwordCumpleRequisitos() ? 'password-ayuda password-error' : 'password-ayuda'"
              [(ngModel)]="password"
              placeholder="••••••••"
              class="min-h-11 w-full min-w-0 px-3.5 py-2.5 pr-14 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <button type="button" (click)="togglePasswordVisibility()" [attr.aria-pressed]="mostrarPassword()" [attr.aria-label]="mostrarPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" class="absolute right-1 top-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-300 dark:hover:bg-slate-700">
              <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            </div>
            <p id="password-ayuda" class="mt-1.5 text-xs leading-relaxed text-slate-500">
              Usa entre 8 y 20 caracteres. Puedes incluir símbolos.
            </p>
            @if (password.length > 0 && !passwordCumpleRequisitos()) {
              <p id="password-error" role="alert" class="mt-1 text-xs font-medium text-rose-700">
                La contraseña debe tener entre 8 y 20 caracteres.
              </p>
            }
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="min-h-12 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            @if (loading()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Registrando...</span>
            } @else {
              <span>Crear mi Cuenta</span>
            }
          </button>
        </form>

        <div class="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          ¿Ya tienes una cuenta?
          <a routerLink="/login" class="text-emerald-600 font-semibold hover:underline ml-1">
            Inicia sesión aquí
          </a>
        </div>

      </div>
    </div>
  `
})
export class RegistroComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  nombre = '';
  email = '';
  password = '';
  mostrarPassword = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  togglePasswordVisibility(): void {
    this.mostrarPassword.update(visible => !visible);
  }

  passwordCumpleRequisitos(): boolean {
    return this.password.length >= 8 && this.password.length <= 20;
  }

  emailCumpleRequisitos(): boolean {
    const email = this.email.trim();
    return email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  onSubmit(): void {
    if (!this.nombre.trim() || !this.email.trim() || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    if (this.nombre.trim().length < 2 || this.nombre.trim().length > 100) {
      this.errorMessage.set('El nombre debe tener entre 2 y 100 caracteres.');
      document.getElementById('nombre')?.focus();
      return;
    }

    if (!this.emailCumpleRequisitos()) {
      this.errorMessage.set('Escribe un correo válido con @ y un dominio, por ejemplo nombre@dominio.com.');
      document.getElementById('email')?.focus();
      return;
    }

    if (!this.passwordCumpleRequisitos()) {
      this.errorMessage.set('La contraseña debe tener entre 8 y 20 caracteres.');
      document.getElementById('password')?.focus();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.registro({ nombre: this.nombre.trim(), email: this.email.trim(), password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Error al registrar la cuenta. Revisa los datos ingresados.';
        this.errorMessage.set(msg);
      }
    });
  }
}
