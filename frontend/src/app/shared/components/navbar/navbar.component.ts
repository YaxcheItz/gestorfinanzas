import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PrivacyToggleComponent } from '../privacy-toggle/privacy-toggle.component';
@Component({
  selector: 'app-navbar', standalone: true,
  imports: [RouterLink, RouterLinkActive, PrivacyToggleComponent],
  template: `
    @if (!router.url.startsWith('/dashboard')) {
      <div class="workspace-tools"><a routerLink="/dashboard" class="workspace-logo"><img src="kaptal.svg" alt=""><span>Kaptal</span></a><div><app-privacy-toggle/><a routerLink="/configuracion" class="utility-button" aria-label="Configuración"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="navigation-icons.svg#settings"/></svg></a></div></div>
    }
    <nav class="mobile-bottom-nav stable-bottom-nav" aria-label="Navegación principal">
      <a routerLink="/dashboard" routerLinkActive="mobile-bottom-nav__link--active" [routerLinkActiveOptions]="{exact:true}" ariaCurrentWhenActive="page" class="mobile-bottom-nav__link" aria-label="Inicio"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="navigation-icons.svg#home"/></svg><span>Inicio</span></a>
      <a routerLink="/transacciones" routerLinkActive="mobile-bottom-nav__link--active" ariaCurrentWhenActive="page" class="mobile-bottom-nav__link" aria-label="Movimientos"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="navigation-icons.svg#movements"/></svg><span>Actividad</span></a>
      <button type="button" class="mobile-bottom-nav__link nav-add" (click)="anadir()" aria-label="Añadir movimiento"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Añadir</span></button>
      <a routerLink="/presupuestos" routerLinkActive="mobile-bottom-nav__link--active" ariaCurrentWhenActive="page" class="mobile-bottom-nav__link" aria-label="Presupuestos"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="navigation-icons.svg#budgets"/></svg><span>Planes</span></a>
      <button type="button" (click)="reportes()" class="mobile-bottom-nav__link" aria-label="Reportes"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="navigation-icons.svg#assistant"/></svg><span>Reportes</span></button>
    </nav>`
})
export class NavbarComponent {
  readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  reportes(): void { this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat', {detail:{content:'Reporte de este mes'}})); }
  anadir(): void { this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')); }
}
