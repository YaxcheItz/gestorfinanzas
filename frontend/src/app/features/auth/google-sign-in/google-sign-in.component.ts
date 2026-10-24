import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, NgZone, OnDestroy, Output, signal, ViewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Capacitor } from '@capacitor/core';
import { NATIVE_GOOGLE_SIGN_IN } from '../../../core/native-google-sign-in';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

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

let googleClientIdInicializado: string | null = null;
let callbackGoogleActual: ((credential: string) => void) | null = null;

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
        @if (native) {
          <button type="button" class="google-native-button" (click)="iniciarNativo()"
            [disabled]="busy || solicitando()" [attr.aria-busy]="solicitando()">
            <img src="google-g-logo.png" width="20" height="20" alt="" aria-hidden="true" />
            {{ solicitando() ? 'Abriendo Google…' : 'Continuar con Google' }}
          </button>
        } @else {
          <div #buttonHost class="flex min-h-10 justify-center" aria-label="Acceso con Google"></div>
        }
        <p class="text-center text-xs leading-relaxed text-slate-500">
          Si es tu primera vez, crearemos tu cuenta y sus datos iniciales automáticamente.
        </p>
    </div>
    @if (errorCarga()) {
      <p role="status" class="mt-3 text-center text-xs text-amber-700">{{ errorCarga() }}</p>
    }
  `,
  styles: `.google-native-button{display:flex;align-items:center;justify-content:center;gap:12px;min-height:48px;width:100%;border:1px solid #747775;border-radius:20px;background:#fff;color:#1f1f1f;font:500 14px Arial,sans-serif;padding:10px 16px;cursor:pointer}.google-native-button:disabled{opacity:.6;cursor:wait}.google-native-button:focus-visible{outline:3px solid #4285f4;outline-offset:3px}`
})
export class GoogleSignInComponent implements AfterViewInit, OnDestroy {
  private static scriptPromise: Promise<void> | null = null;
  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);
  readonly native = inject(NATIVE_GOOGLE_SIGN_IN);
  readonly solicitando = signal(false);
  private nativeClientId: string | null = null;
  private destroyed = false;

  @Input() text: GoogleButtonText = 'signin_with';
  @Input() busy = false;
  @Output() readonly credentialReceived = new EventEmitter<string>();
  @ViewChild('buttonHost') private buttonHost?: ElementRef<HTMLElement>;

  readonly habilitado = signal(false);
  readonly errorCarga = signal<string | null>(null);
  private callbackDeEstaInstancia: ((credential: string) => void) | null = null;

  ngAfterViewInit(): void {
    if (Capacitor.isNativePlatform() && !this.native) {
      this.errorCarga.set('El acceso con Google está disponible en la web para este dispositivo.');
      return;
    }
    this.authService.googleConfig().subscribe({
      next: response => {
        const clientId = response.success && response.data?.enabled
          ? response.data.clientId
          : null;
        if (!clientId) {
          if (this.native) this.errorCarga.set('El acceso con Google no está disponible. Inténtalo más tarde.');
          return;
        }
        if (this.native) {
          this.nativeClientId = clientId;
          this.habilitado.set(true);
          return;
        }
        this.cargarScriptGoogle()
          .then(() => this.inicializarBoton(clientId))
          .catch(() => this.errorCarga.set('No se pudo cargar el acceso de Google. Inténtalo de nuevo.'));
      },
      error: () => this.errorCarga.set('No se pudo cargar el acceso de Google. Comprueba la conexión.'),
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (callbackGoogleActual === this.callbackDeEstaInstancia) callbackGoogleActual = null;
  }

  async iniciarNativo(): Promise<void> {
    if (!this.native || !this.nativeClientId || this.busy || this.solicitando() || this.destroyed) return;
    this.solicitando.set(true);
    this.errorCarga.set(null);
    try {
      const result = await this.native.signIn({ clientId: this.nativeClientId });
      if (this.destroyed) return;
      if (typeof result?.credential !== 'string' || !result.credential || result.credential.length > 8192) {
        this.errorCarga.set('Google no devolvió una credencial válida. Inténtalo de nuevo.');
        return;
      }
      this.credentialReceived.emit(result.credential);
    } catch (error) {
      if (!this.destroyed && (error as { code?: string })?.code !== 'CANCELLED') {
        this.errorCarga.set('No se pudo completar el acceso con Google. Comprueba la conexión o usa la web.');
      }
    } finally { this.solicitando.set(false); }
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

    this.callbackDeEstaInstancia = credential => this.zone.run(() => this.credentialReceived.emit(credential));
    callbackGoogleActual = this.callbackDeEstaInstancia;
    if (googleClientIdInicializado === null) {
      google.initialize({
        client_id: clientId,
        callback: response => {
          if (response.credential) callbackGoogleActual?.(response.credential);
        },
        auto_select: false,
        ux_mode: 'popup'
      });
      googleClientIdInicializado = clientId;
    } else if (googleClientIdInicializado !== clientId) {
      this.errorCarga.set('El cliente de Google cambió. Recarga la página para continuar.');
      callbackGoogleActual = null;
      return;
    }
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
