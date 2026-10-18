import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ApiResponse } from '../core/models/auth.models';
import { getApiBaseUrl } from '../core/services/api-base-url';
import { GoogleSignInComponent } from './auth/google-sign-in/google-sign-in.component';

@Component({
  selector: 'app-vincular-canal',
  imports: [RouterLink, GoogleSignInComponent],
  template: `
    <section aria-labelledby="vincular-title">
      <span class="symbol" aria-hidden="true">↔</span>
      <h1 id="vincular-title">Conectar WhatsApp</h1>
      @if (!challenge) {
        <p role="alert">Abre esta página desde el comando de vinculación en tu computadora.</p>
      } @else if (!auth.isAuthenticated()) {
        <p>Continúa con tu cuenta de Kaptal. No necesitas una contraseña nueva.</p>
        <app-google-sign-in [busy]="busy()" (credentialReceived)="google($event)" />
        <p>Si utilizas correo y contraseña, <a routerLink="/login" target="_blank" rel="noopener">inicia sesión</a> y vuelve a cargar esta página.</p>
      } @else if (code() && approvedUser() === auth.currentUser()?.id) {
        <p>Copia este código y pégalo únicamente en la terminal que inició la vinculación.</p>
        <label for="codigo-canal">Código de un solo uso</label>
        <input id="codigo-canal" readonly [value]="code()" autocomplete="off" spellcheck="false" />
        <p>Vence en 5 minutos. Después puedes cerrar esta pestaña.</p>
        <p>No compartas el código por chat ni WhatsApp.</p>
      } @else {
        <p>Vas a conectar tu cuenta <strong>{{ auth.currentUser()?.email }}</strong> con el puente local de WhatsApp.</p>
        <p>El puente podrá consultar tu información financiera y registrar movimientos en tus cuentas. La sesión se guardará en esta computadora.</p>
        <p>Continúa solo si acabas de ejecutar el comando en una computadora tuya.</p>
        <p>Comprueba que la terminal muestra esta referencia: <strong>{{ challenge.slice(0, 8) }}</strong>.</p>
        <button type="button" (click)="approve()" [disabled]="busy()">{{ busy() ? 'Conectando…' : 'Autorizar conexión' }}</button>
        <a routerLink="/dashboard">Cancelar</a>
      }
      @if (error()) { <p role="alert">{{ error() }}</p> }
    </section>
  `,
  styles: `
    :host { display: block; padding: 32px 20px; }
    section { max-width: 440px; margin: 24px auto; }
    .symbol { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: #fff0ee; color: #b94740; font-size: 28px; }
    h1 { font-size: 30px; line-height: 1.2; margin: 24px 0 16px; }
    p { line-height: 1.6; margin: 16px 0; }
    strong { overflow-wrap: anywhere; }
    label { display: block; margin-bottom: 8px; }
    input { box-sizing: border-box; width: 100%; padding: 16px; font-size: 16px; border: 1px solid #aaa; border-radius: 16px; }
    button { min-height: 52px; width: 100%; border: 0; border-radius: 16px; background: #ff746b; color: #111; font-size: 16px; font-weight: 600; margin: 16px 0; cursor: pointer; }
    button:disabled { opacity: .6; cursor: wait; }
    a { display: inline-block; padding: 12px 0; }
    :focus-visible { outline: 2px solid #b94740; outline-offset: 4px; }
  `
})
export class VincularCanalComponent {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly challenge = new URLSearchParams(window.location.hash.slice(1)).get('challenge') ?? '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly code = signal('');
  readonly approvedUser = signal<number | null>(null);

  constructor() {
    if (!/^[A-Za-z0-9_-]{43}$/.test(this.challenge)) this.challenge = '';
  }

  google(credential: string): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.auth.loginWithGoogle(credential).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({ error: () => this.error.set('No pudimos iniciar sesión. Inténtalo de nuevo.') });
  }

  approve(): void {
    if (this.busy() || !this.challenge || !this.auth.isAuthenticated()) return;
    const user = this.auth.currentUser()?.id;
    this.busy.set(true); this.error.set('');
    this.http.post<ApiResponse<{ codigo: string }>>(`${getApiBaseUrl()}/canales/vinculacion/aprobar`, { challenge: this.challenge })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({
        next: result => {
          if (this.auth.currentUser()?.id !== user) return;
          this.approvedUser.set(user ?? null);
          this.code.set(result.data.codigo);
        },
        error: () => this.error.set('No pudimos autorizar la conexión. Revisa tu sesión e inténtalo de nuevo.')
      });
  }
}
