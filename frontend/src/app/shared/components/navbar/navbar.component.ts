import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          
          <!-- Logo & Brand -->
          <a routerLink="/dashboard" aria-label="Kaptal - ir al inicio"
             class="flex min-w-0 items-center space-x-2 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 sm:space-x-3">
            <img src="kaptal.svg" alt="" class="h-10 w-10 shrink-0 rounded-xl shadow-md shadow-emerald-900/10">
            <div class="flex items-center">
              <span class="whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Kaptal</span>
              <span class="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">Personal</span>
            </div>
          </a>

          <!-- Navigation Links (if authenticated) -->
          @if (authService.isAuthenticated()) {
            <nav class="hidden lg:flex space-x-1">
              <a routerLink="/dashboard" routerLinkActive="bg-slate-100 text-slate-900 font-semibold" 
                 class="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                Panel General
              </a>
              <a routerLink="/transacciones" routerLinkActive="bg-slate-100 text-slate-900 font-semibold" 
                 class="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                Movimientos
              </a>
              <a routerLink="/presupuestos" routerLinkActive="bg-slate-100 text-slate-900 font-semibold" 
                 class="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                Presupuestos
              </a>
              <a routerLink="/cuentas" routerLinkActive="bg-slate-100 text-slate-900 font-semibold"
                 class="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                Cuentas
              </a>
              <a routerLink="/categorias" routerLinkActive="bg-slate-100 text-slate-900 font-semibold"
                 class="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                Categorías
              </a>
            </nav>

            <!-- User Menu & Logout -->
            <div class="flex shrink-0 items-center space-x-2 sm:space-x-3">
              <div class="hidden sm:flex flex-col text-right">
                <span class="text-xs font-medium text-slate-500">Conectado como</span>
                <span class="text-sm font-semibold text-slate-800">{{ authService.currentUser()?.nombre }}</span>
              </div>
              <button (click)="authService.logout()" 
                      class="inline-flex items-center px-2 sm:px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden sm:inline">Salir</span>
              </button>
              <button
                type="button"
                (click)="menuMovilAbierto.update(abierto => !abierto)"
                [attr.aria-expanded]="menuMovilAbierto()"
                aria-controls="navegacion-movil"
                [attr.aria-label]="menuMovilAbierto() ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'"
                class="inline-flex lg:hidden items-center justify-center w-10 h-10 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                @if (menuMovilAbierto()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                }
              </button>
            </div>
          } @else {
            <div class="flex items-center space-x-3">
              <a routerLink="/login" 
                 class="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                Iniciar Sesión
              </a>
              <a routerLink="/registro" 
                 class="text-sm font-medium bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-xs hover:bg-emerald-700 transition-colors">
                Crear Cuenta
              </a>
            </div>
          }

        </div>
        @if (authService.isAuthenticated() && menuMovilAbierto()) {
          <nav id="navegacion-movil" aria-label="Navegación principal" class="lg:hidden border-t border-slate-100 py-2">
            <a routerLink="/dashboard" routerLinkActive="bg-emerald-50 text-emerald-800 font-semibold" (click)="cerrarMenuMovil()" class="block rounded-lg px-3 py-2.5 text-sm text-slate-700">Panel General</a>
            <a routerLink="/transacciones" routerLinkActive="bg-emerald-50 text-emerald-800 font-semibold" (click)="cerrarMenuMovil()" class="block rounded-lg px-3 py-2.5 text-sm text-slate-700">Movimientos</a>
            <a routerLink="/presupuestos" routerLinkActive="bg-emerald-50 text-emerald-800 font-semibold" (click)="cerrarMenuMovil()" class="block rounded-lg px-3 py-2.5 text-sm text-slate-700">Presupuestos</a>
            <a routerLink="/cuentas" routerLinkActive="bg-emerald-50 text-emerald-800 font-semibold" (click)="cerrarMenuMovil()" class="block rounded-lg px-3 py-2.5 text-sm text-slate-700">Cuentas</a>
            <a routerLink="/categorias" routerLinkActive="bg-emerald-50 text-emerald-800 font-semibold" (click)="cerrarMenuMovil()" class="block rounded-lg px-3 py-2.5 text-sm text-slate-700">Categorías</a>
          </nav>
        }
      </div>
    </header>
  `
})
export class NavbarComponent {
  public readonly authService = inject(AuthService);
  readonly menuMovilAbierto = signal(false);

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }
}
