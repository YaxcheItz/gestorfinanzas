import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar', standalone: true,
  imports: [RouterLink],
  template: `
    <header class="workspace-tools">
      <div class="workspace-context">
        @if (!esInicio()) { <a routerLink="/dashboard" class="glass-icon" aria-label="Inicio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></a> }
        <button type="button" class="workspace-selector" (click)="abrirMenu()" aria-label="Abrir herramientas de tu espacio personal" aria-haspopup="dialog" aria-controls="workspace-panel" [attr.aria-expanded]="menuAbierto()">Personal <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg></button>
      </div>
      <nav class="workspace-shortcuts" aria-label="Accesos principales">
        <a routerLink="/transacciones" class="glass-icon" aria-label="Movimientos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"/></svg></a>
        <a routerLink="/configuracion" class="glass-icon" aria-label="Configuración"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 3-1 3-3 1-3 3v4l3 3 3 1 1 3h4l1-3 3-1 3-3v-4l-3-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/></svg></a>
      </nav>
    </header>
    <div class="capture-dock" aria-label="Registrar un movimiento">
      <button type="button" class="capture-dock__manual" (click)="anadir()" aria-label="Añadir movimiento" title="Registro manual"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5M4 16l12-12 4 4L8 20H4z"/></svg></button>
      <button type="button" class="capture-dock__voice" (click)="voz()" aria-label="Registrar por voz o texto" title="Hablar o escribir"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg></button>
    </div>
    <dialog #menu id="workspace-panel" class="workspace-panel" aria-labelledby="workspace-panel-title" (click)="cerrarAlFondo($event)" (close)="alCerrarMenu()">
      <header><div><p class="sheet-caption">Kaptal</p><h2 id="workspace-panel-title">Tu espacio</h2></div><button type="button" (click)="cerrarMenu()" aria-label="Cerrar menú" autofocus>&times;</button></header>
      <nav aria-label="Herramientas de tu espacio">
        <div class="workspace-panel__primary">
          <a routerLink="/dashboard" (click)="cerrarMenu()">Inicio <span aria-hidden="true">&#8250;</span></a>
          <a routerLink="/cuentas" (click)="cerrarMenu()">Cuentas <span aria-hidden="true">&#8250;</span></a>
          <a routerLink="/presupuestos" (click)="cerrarMenu()">Presupuestos <span aria-hidden="true">&#8250;</span></a>
          <a routerLink="/pareja" (click)="cerrarMenu()">Compartido <span aria-hidden="true">&#8250;</span></a>
          <a routerLink="/reportes" (click)="cerrarMenu()">Reportes <span aria-hidden="true">&#8250;</span></a>
          <a routerLink="/asistente" (click)="cerrarMenu()">Asistente <span aria-hidden="true">&#8250;</span></a>
        </div>
        <details class="workspace-menu__tools"><summary>Organizar</summary><a routerLink="/categorias" (click)="cerrarMenu()">Categorías</a><a routerLink="/configuracion" fragment="recurring" (click)="cerrarMenu()">Recurrentes</a><a routerLink="/libro-diario" (click)="cerrarMenu()">Libro diario</a></details>
        <a routerLink="/configuracion" class="workspace-panel__settings" (click)="cerrarMenu()">Ajustes <span aria-hidden="true">&#8250;</span></a>
      </nav>
    </dialog>`
})
export class NavbarComponent {
  @ViewChild('menu') private menu?: ElementRef<HTMLDialogElement>;
  readonly menuAbierto = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  esInicio(): boolean { return this.router.url.split(/[?#]/)[0] === '/dashboard'; }
  abrirMenu(): void {
    const menu = this.menu?.nativeElement;
    if (!menu || menu.open) return;
    menu.showModal();
    this.menuAbierto.set(true);
  }
  cerrarMenu(): void { this.menu?.nativeElement.close(); }
  alCerrarMenu(): void {
    this.menuAbierto.set(false);
    this.menu?.nativeElement.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(group => group.open = false);
  }
  cerrarAlFondo(event: MouseEvent): void {
    const menu = this.menu?.nativeElement;
    if (event.target !== menu || !menu) return;
    const rect = menu.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.cerrarMenu();
  }
  voz(): void { this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat')); }
  anadir(): void { this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-registro-rapido')); }
}
