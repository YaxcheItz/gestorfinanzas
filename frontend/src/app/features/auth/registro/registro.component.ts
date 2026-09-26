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
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-3 sm:p-4">
      <div class="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-5 sm:p-8 space-y-6">
        
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
          <div class="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-start space-x-2">
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
              required
              [(ngModel)]="nombre"
              placeholder="Juan Pérez"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
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
              required
              [(ngModel)]="email"
              placeholder="tu@correo.com"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña (mínimo 6 caracteres)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minlength="6"
              [(ngModel)]="password"
              placeholder="••••••••"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
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
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.nombre || !this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.registro({ nombre: this.nombre, email: this.email, password: this.password }).subscribe({
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
