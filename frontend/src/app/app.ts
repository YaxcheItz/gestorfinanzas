import { Component, HostListener, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { effect } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from './core/services/auth.service';
import { PerfilService } from './core/services/perfil.service';
import { QuickCaptureComponent } from './shared/components/quick-capture/quick-capture.component';
import { RegistroRapidoComponent } from './shared/components/registro-rapido/registro-rapido.component';
import { ActualizacionPwaService } from './core/services/actualizacion-pwa.service';
import { CaptureLauncherService } from './core/services/capture-launcher.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NavbarComponent, QuickCaptureComponent, RegistroRapidoComponent, ToastContainerComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly document = inject(DOCUMENT);
  irAlContenido(event: Event): void {
    event.preventDefault();
    const contenido = this.document.getElementById('main-content');
    contenido?.focus({ preventScroll: true });
    contenido?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  readonly captureLauncher = inject(CaptureLauncherService);
  @HostListener('window:kaptal-abrir-registro-rapido', ['$event'])
  requestManual(event: Event): void {
    if (this.authService.isAuthenticated()) this.captureLauncher.request('manual', event);
  }
  @HostListener('window:kaptal-abrir-captura-chat', ['$event'])
  requestChat(event: Event): void {
    if (this.authService.isAuthenticated()) this.captureLauncher.request('chat', event);
  }
  readonly actualizacion=inject(ActualizacionPwaService);
  readonly authService = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private loadedUserId: number | null = null;

  constructor() {
    effect(() => {
      const usuario = this.authService.currentUser();
      if (!usuario) {
        this.captureLauncher.detach('manual');
        this.captureLauncher.detach('chat');
        this.loadedUserId = null;
        this.perfilService.limpiar();
        return;
      }
      if (usuario.id !== this.loadedUserId) {
        if (this.loadedUserId !== null) {
          this.captureLauncher.detach('manual');
          this.captureLauncher.detach('chat');
        }
        this.loadedUserId = usuario.id;
        this.perfilService.cargar(usuario.id);
      }
    });
  }
}
