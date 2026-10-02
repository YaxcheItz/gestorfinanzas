import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, NgZone, Output, signal, ViewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

type GoogleButtonText = 'signin_with' | 'signup_with';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityApi {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select: false;
    ux_mode: 'popup';
  }): void;
  renderButton(parent: HTMLElement, options: {
    theme: 'outline';
    size: 'large';
    text: GoogleButtonText;
    shape: 'rectangular';
    width: number;
    locale: 'es';
  }): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

@Component({
  selector: 'app-google-sign-in',
  standalone: true,
  template: `
    <div [class.hidden]="!habilitado()" [class.pointer-events-none]="busy" [class.opacity-50]="busy" class="space-y-4">
        <div class="flex items-center gap-3 text-xs text-slate-400" aria-hidden="true">
          <span class="h-px flex-1 bg-slate-200"></span>
          <span>o continúa con</span>
          <span class="h-px flex-1 bg-slate-200"></span>
        </div>
        <div #buttonHost class="flex min-h-10 justify-center" aria-label="Acceso con Google"></div>
        <p class="text-center text-xs leading-relaxed text-slate-500">
          Si es tu primera vez, crearemos tu cuenta y sus datos iniciales automáticamente.
        </p>
    </div>
    @if (errorCarga()) {
      <p role="status" class="mt-3 text-center text-xs text-amber-700">{{ errorCarga() }}</p>
    }
  `
})
export class GoogleSignInComponent implements AfterViewInit {
  private static scriptPromise: Promise<void> | null = null;
  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);

  @Input() text: GoogleButtonText = 'signin_with';
  @Input() busy = false;
  @Output() readonly credentialReceived = new EventEmitter<string>();
  @ViewChild('buttonHost') private buttonHost?: ElementRef<HTMLElement>;

  readonly habilitado = signal(false);
  readonly errorCarga = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.authService.googleConfig().subscribe({
      next: response => {
        const clientId = response.success && response.data?.enabled
          ? response.data.clientId
          : null;
        if (!clientId) return;
        this.cargarScriptGoogle()
          .then(() => this.inicializarBoton(clientId))
          .catch(() => this.errorCarga.set('No se pudo cargar el acceso de Google. Inténtalo de nuevo.'));
      }
    });
  }

  private async cargarScriptGoogle(): Promise<void> {
    if (window.google?.accounts?.id) return;
    if (!GoogleSignInComponent.scriptPromise) {
      GoogleSignInComponent.scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'google-identity-services';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
          script.remove();
          reject(new Error('Google no disponible'));
        };
        document.head.appendChild(script);
      }).catch(error => {
        GoogleSignInComponent.scriptPromise = null;
        throw error;
      });
    }
    await GoogleSignInComponent.scriptPromise;
  }

  private inicializarBoton(clientId: string): void {
    const host = this.buttonHost?.nativeElement;
    const google = window.google?.accounts?.id;
    if (!host || !google) return;

    google.initialize({
      client_id: clientId,
      callback: response => this.zone.run(() => {
        if (response.credential) this.credentialReceived.emit(response.credential);
      }),
      auto_select: false,
      ux_mode: 'popup'
    });
    google.renderButton(host, {
      theme: 'outline',
      size: 'large',
      text: this.text,
      shape: 'rectangular',
      width: Math.min(400, Math.max(220, window.innerWidth - 64)),
      locale: 'es'
    });
    this.habilitado.set(true);
  }
}
