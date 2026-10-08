import { Component, inject } from '@angular/core';
import { effect } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from './core/services/auth.service';
import { PerfilService } from './core/services/perfil.service';
import { QuickCaptureComponent } from './shared/components/quick-capture/quick-capture.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NavbarComponent, QuickCaptureComponent, ToastContainerComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly authService = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private loadedUserId: number | null = null;

  constructor() {
    effect(() => {
      const usuario = this.authService.currentUser();
      if (!usuario) {
        this.loadedUserId = null;
        this.perfilService.limpiar();
        return;
      }
      if (usuario.id !== this.loadedUserId) {
        this.loadedUserId = usuario.id;
        this.perfilService.cargar(usuario.id);
      }
    });
  }
}
