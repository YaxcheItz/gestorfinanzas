import { PeriodoInicioService } from '../../../core/services/periodo-inicio.service';
import { ListasService } from '../../../core/services/listas.service';
import { ToastService } from '../../../core/services/toast.service';
import { ListasSheetComponent } from '../listas-sheet/listas-sheet.component';
import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PrivacyToggleComponent } from '../privacy-toggle/privacy-toggle.component';

@Component({
  selector: 'app-navbar', standalone: true,
  imports: [RouterLink, ListasSheetComponent, PrivacyToggleComponent],
  template: `
    <header class="workspace-tools">
      <div class="workspace-context">
        @if (!esInicio()) { <a routerLink="/dashboard" class="glass-icon" aria-label="Inicio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></a> }
        <button type="button" class="workspace-selector" (click)="listas.abierta.set(true)" aria-label="Cambiar lista" aria-haspopup="dialog" [attr.aria-expanded]="listas.abierta()"><span aria-hidden="true">{{ listas.contexto.activa()?.emoji }}</span><span class="workspace-selector__name">{{ listas.contexto.activa()?.nombre || 'Mis movimientos' }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg></button>
      </div>
      <nav class="workspace-shortcuts" aria-label="Accesos principales">
        @if (esInicio()) {
          <app-privacy-toggle/>
          <button type="button" class="utility-button time-dropdown-btn" (click)="periodo()" [disabled]="!periodoInicio.disponible()" [attr.aria-label]="'Seleccionar periodo. Actual: ' + periodoInicio.etiqueta()" aria-haspopup="dialog" [attr.aria-expanded]="periodoInicio.abierto()"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg></button>
        }
        <a routerLink="/configuracion" class="glass-icon" aria-label="Configuración"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 3-1 3-3 1-3 3v4l3 3 3 1 1 3h4l1-3 3-1 3-3v-4l-3-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/></svg></a>
      </nav>
    </header>
    <div class="capture-dock" [class.capture-dock--inline]="!capturaFlotante()" aria-label="Acciones de movimientos">
      <div class="capture-dock__left">
      <button type="button" class="capture-dock__search glass-icon" (click)="buscar()" aria-label="Buscar movimientos" title="Buscar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></button>
      <button type="button" class="capture-dock__manual" (click)="anadir()" aria-label="Añadir movimiento" title="Registro manual"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5M4 16l12-12 4 4L8 20H4z"/></svg></button>
      </div>
      <button type="button" class="capture-dock__voice" (click)="voz()" aria-label="Registrar por voz o texto" title="Hablar o escribir"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg></button>
    </div>
    @defer (when listas.abierta()) {<app-listas-sheet/>}
`
})
export class NavbarComponent {
  readonly listas = inject(ListasService);
  readonly periodoInicio = inject(PeriodoInicioService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  periodo(): void { this.document.defaultView?.dispatchEvent(new Event('kaptal-seleccionar-periodo')); }
  esInicio(): boolean { return this.router.url.split(/[?#]/)[0] === '/dashboard'; }
  capturaFlotante(): boolean { return ['/dashboard', '/transacciones'].includes(this.router.url.split(/[?#]/)[0]); }
  voz(): void { if (!this.listas.contexto.puedeEscribir()) { this.toast.error('Elige una lista activa con permiso de editor para registrar.'); return; } this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat', {detail:{voz:true}})); }
  anadir(): void { if (!this.listas.contexto.puedeEscribir()) { this.toast.error('Elige una lista activa con permiso de editor para registrar.'); return; } this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')); }
  buscar(): void {
    if (this.esInicio()) {
      this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-buscar-inicio'));
      return;
    }
    void this.router.navigate(['/transacciones'], {
      queryParams: {
        ...(this.listas.contexto.activaId() == null ? {} : { listaId: this.listas.contexto.activaId() }),
        buscar: 'true'
      }
    });
  }
}
