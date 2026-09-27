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
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div
          [class]="authService.isAuthenticated()
            ? 'relative flex h-16 items-center justify-between gap-3 lg:gap-5'
            : 'flex flex-col items-center gap-2 py-2 sm:flex-row sm:justify-between sm:py-0 lg:min-h-20 lg:gap-6'">
          
          <!-- Logo & Brand -->
          <a routerLink="/dashboard" aria-label="Kaptal - ir al inicio"
             [class]="authService.isAuthenticated()
               ? 'flex min-w-0 items-center space-x-2 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 sm:space-x-3'
               : 'mx-auto flex min-w-0 items-center justify-center space-x-2 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 sm:mx-0 sm:justify-start sm:space-x-3'">
            <img src="kaptal.svg" alt="" class="h-10 w-10 shrink-0 rounded-xl shadow-md shadow-emerald-900/10 lg:h-12 lg:w-12">
            <div class="flex items-center">
              <span class="whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Kaptal</span>
            </div>
          </a>

          <!-- Navigation Links (if authenticated) -->
          @if (authService.isAuthenticated()) {
            <nav aria-label="Navegación de escritorio" class="hidden flex-1 justify-center space-x-1 lg:flex">
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
            </nav>

            <!-- Account actions stay at the right edge on mobile and desktop. -->
            <div class="z-10 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
              <a routerLink="/configuracion" aria-label="Perfil" title="Perfil"
                 class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="8" r="3.5" stroke-width="2" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 20a7 7 0 0114 0" />
                </svg>
              </a>
              <div class="hidden min-w-0 flex-col border-l border-slate-200 pl-3 lg:flex">
                <span class="text-[10px] font-medium leading-4 text-slate-500">Conectado como</span>
                <span class="max-w-36 truncate text-sm font-semibold leading-5 text-slate-800">{{ authService.currentUser()?.nombre }}</span>
              </div>
              <button type="button" (click)="authService.logout()" aria-label="Salir" title="Salir"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 lg:w-auto lg:gap-2 lg:px-3">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden text-xs font-semibold lg:inline">Salir</span>
              </button>
            </div>
          } @else {
            <div class="hidden w-full grid-cols-2 gap-2 sm:grid sm:w-auto sm:min-w-56 lg:flex lg:items-center lg:gap-3">
              <a routerLink="/login" 
                 class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:min-h-12 lg:border-slate-300 lg:px-5 lg:shadow-xs">
                Iniciar Sesión
              </a>
              <a routerLink="/registro" 
                 class="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 lg:min-h-12 lg:px-5">
                Crear Cuenta
              </a>
            </div>
          }

        </div>
        @if (authService.isAuthenticated()) {
          <nav aria-label="Navegación principal" class="mobile-bottom-nav lg:hidden">
            <a routerLink="/dashboard" routerLinkActive="mobile-bottom-nav__link--active" [routerLinkActiveOptions]="{ exact: true }"
               aria-label="Inicio" class="mobile-bottom-nav__link">
              <svg aria-hidden="true">
                <use href="navigation-icons.svg#home"></use>
              </svg>
              <span>Inicio</span>
            </a>
            <a routerLink="/transacciones" routerLinkActive="mobile-bottom-nav__link--active"
               aria-label="Movimientos" class="mobile-bottom-nav__link">
              <svg aria-hidden="true">
                <use href="navigation-icons.svg#movements"></use>
              </svg>
              <span>Movimientos</span>
            </a>
            <a routerLink="/presupuestos" routerLinkActive="mobile-bottom-nav__link--active"
               aria-label="Presupuestos" class="mobile-bottom-nav__link">
              <svg aria-hidden="true">
                <use href="navigation-icons.svg#budgets"></use>
              </svg>
              <span>Presupuestos</span>
            </a>
            <a routerLink="/cuentas" routerLinkActive="mobile-bottom-nav__link--active"
               aria-label="Cuentas" class="mobile-bottom-nav__link">
              <svg aria-hidden="true">
                <use href="navigation-icons.svg#accounts"></use>
              </svg>
              <span>Cuentas</span>
            </a>
          </nav>
        }
      </div>
    </header>
  `
})
export class NavbarComponent {
  public readonly authService = inject(AuthService);
}
