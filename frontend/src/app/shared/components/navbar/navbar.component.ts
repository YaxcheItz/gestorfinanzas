import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span class="text-xl font-bold tracking-tight text-slate-900">Finanzas<span class="text-emerald-600">Pro</span></span>
              <span class="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">Personal</span>
            </div>
          </div>

          <!-- Navigation Links (if authenticated) -->
          @if (authService.isAuthenticated()) {
            <nav class="hidden md:flex space-x-1">
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
            </nav>

            <!-- User Menu & Logout -->
            <div class="flex items-center space-x-3">
              <div class="hidden sm:flex flex-col text-right">
                <span class="text-xs font-medium text-slate-500">Conectado como</span>
                <span class="text-sm font-semibold text-slate-800">{{ authService.currentUser()?.nombre }}</span>
              </div>
              <button (click)="authService.logout()" 
                      class="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
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
      </div>
    </header>
  `
})
export class NavbarComponent {
  public readonly authService = inject(AuthService);
}
