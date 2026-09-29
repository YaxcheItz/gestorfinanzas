import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="relative sticky top-0 z-30 border-b border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
      <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div [class]="authService.isAuthenticated()
          ? 'relative flex h-16 items-center justify-between gap-3 lg:gap-5'
          : 'flex flex-col items-center gap-2 py-2 sm:flex-row sm:justify-between sm:py-0 lg:min-h-20 lg:gap-6'">
          <a routerLink="/dashboard" aria-label="Kaptal - ir al inicio"
            [class]="authService.isAuthenticated()
              ? 'flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 sm:gap-3'
              : 'mx-auto flex min-w-0 items-center justify-center gap-2 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 sm:mx-0 sm:justify-start sm:gap-3'">
            <img src="kaptal.svg" alt="" class="h-10 w-10 shrink-0 rounded-xl shadow-md shadow-emerald-900/10 lg:h-12 lg:w-12">
            <span class="whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Kaptal</span>
          </a>

          @if (authService.isAuthenticated()) {
            <nav aria-label="Navegación de escritorio" class="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
              <a routerLink="/dashboard" routerLinkActive="bg-slate-100 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white" [routerLinkActiveOptions]="{ exact: true }" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">Panel General</a>
              <a routerLink="/transacciones" routerLinkActive="bg-slate-100 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">Transacciones</a>
              <a routerLink="/presupuestos" routerLinkActive="bg-slate-100 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">Presupuestos</a>
              <a routerLink="/cuentas" routerLinkActive="bg-slate-100 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">Cuentas</a>
              <div class="relative" data-nav-more>
                <button type="button" (click)="toggleMore()" [attr.aria-expanded]="moreOpen()" aria-controls="nav-more-menu-desktop" [class.bg-slate-100]="isMoreRoute()" [class.text-slate-900]="isMoreRoute()" class="inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                  Más <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.09 1.04l-4.25 4.5a.75.75 0 0 1-1.09 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
                </button>
                @if (moreOpen()) {
                  <div id="nav-more-menu-desktop" class="nav-more-menu absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <a routerLink="/libro-diario" routerLinkActive="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="block min-h-11 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Libro diario</a>
                    <a routerLink="/asistente" routerLinkActive="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="block min-h-11 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Asistente IA</a>
                  </div>
                }
              </div>
            </nav>

            <div class="z-10 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:ml-0">
              <a routerLink="/configuracion" routerLinkActive="text-emerald-700 dark:text-emerald-300" [ariaCurrentWhenActive]="'page'" aria-label="Perfil" title="Perfil" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="8" r="3.5" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 20a7 7 0 0114 0"/></svg>
              </a>
              <div class="hidden min-w-0 flex-col border-l border-slate-200 pl-3 xl:flex dark:border-slate-700">
                <span class="text-[10px] font-medium leading-4 text-slate-500">Conectado como</span>
                <span class="max-w-36 truncate text-sm font-semibold leading-5 text-slate-800">{{ authService.currentUser()?.nombre }}</span>
              </div>
              <button type="button" (click)="authService.logout()" aria-label="Salir" title="Salir" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 xl:w-auto xl:gap-2 xl:px-3 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950 dark:hover:text-rose-200">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span class="hidden text-xs font-semibold xl:inline">Salir</span>
              </button>
            </div>
          } @else {
            <div class="hidden w-full grid-cols-2 gap-2 sm:grid sm:w-auto sm:min-w-56 lg:flex lg:items-center lg:gap-3">
              <a routerLink="/login" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:min-h-12 lg:px-5 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Iniciar sesión</a>
              <a routerLink="/registro" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 lg:min-h-12 lg:px-5">Crear cuenta</a>
            </div>
          }
        </div>

        @if (authService.isAuthenticated()) {
          <nav aria-label="Navegación principal" class="mobile-bottom-nav xl:hidden">
            <a routerLink="/dashboard" routerLinkActive="mobile-bottom-nav__link--active" [routerLinkActiveOptions]="{ exact: true }" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" aria-label="Inicio" class="mobile-bottom-nav__link"><svg aria-hidden="true"><use href="navigation-icons.svg#home"></use></svg><span>Inicio</span></a>
            <a routerLink="/transacciones" routerLinkActive="mobile-bottom-nav__link--active" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" aria-label="Transacciones" class="mobile-bottom-nav__link"><svg aria-hidden="true"><use href="navigation-icons.svg#movements"></use></svg><span>Movimientos</span></a>
            <a routerLink="/presupuestos" routerLinkActive="mobile-bottom-nav__link--active" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" aria-label="Presupuestos" class="mobile-bottom-nav__link"><svg aria-hidden="true"><use href="navigation-icons.svg#budgets"></use></svg><span>Presupuestos</span></a>
            <a routerLink="/cuentas" routerLinkActive="mobile-bottom-nav__link--active" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" aria-label="Cuentas" class="mobile-bottom-nav__link"><svg aria-hidden="true"><use href="navigation-icons.svg#accounts"></use></svg><span>Cuentas</span></a>
            <button type="button" [class.mobile-bottom-nav__link--active]="isMoreRoute()" class="mobile-bottom-nav__link" data-nav-more (click)="toggleMore()" aria-label="Más destinos" aria-controls="nav-more-menu-mobile" [attr.aria-expanded]="moreOpen()"><svg aria-hidden="true"><use href="navigation-icons.svg#more"></use></svg><span>Más</span></button>
          </nav>
          @if (moreOpen()) {
            <nav id="nav-more-menu-mobile" aria-label="Más destinos" class="nav-more-menu fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl xl:hidden dark:border-slate-700 dark:bg-slate-900">
              <a routerLink="/libro-diario" routerLinkActive="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><use href="navigation-icons.svg#ledger"/></svg>Libro diario</a>
              <a routerLink="/asistente" routerLinkActive="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" [ariaCurrentWhenActive]="'page'" (click)="closeMore()" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><use href="navigation-icons.svg#assistant"/></svg>Asistente IA</a>
            </nav>
          }
        }
      </div>
    </header>
  `
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly moreOpen = signal(false);

  toggleMore(): void { this.moreOpen.update(open => !open); }
  closeMore(): void { this.moreOpen.set(false); }

  isMoreRoute(): boolean {
    return this.router.url.startsWith('/libro-diario') || this.router.url.startsWith('/asistente');
  }

  @HostListener('document:click', ['$event'])
  closeMoreOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (!target?.closest('[data-nav-more], .nav-more-menu')) this.closeMore();
  }

  @HostListener('document:keydown.escape')
  closeMoreOnEscape(): void { this.closeMore(); }
}
