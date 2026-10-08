import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { GoogleSignInComponent } from '../google-sign-in/google-sign-in.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoogleSignInComponent],
  template: `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-card__intro">
          <div class="login-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1>Bienvenido de nuevo</h1>
          <p>Ingresa a tu gestor de finanzas personales</p>
        </div>

        @if (sessionExpiredWarning()) {
          <div class="login-alert login-alert--warn" role="status">
            <span>Tu sesión ha expirado. Ingresa nuevamente para continuar.</span>
          </div>
        }

        @if (errorMessage()) {
          <div class="login-alert login-alert--error" role="alert" aria-live="assertive">
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="login-form">
          <label class="login-field">
            <span>Correo electrónico</span>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              required
              [(ngModel)]="email"
              placeholder="tu@correo.com"
            />
          </label>

          <label class="login-field">
            <span>Contraseña</span>
            <div class="login-field__password">
              <input
                id="password"
                name="password"
                [type]="mostrarPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                required
                [(ngModel)]="password"
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                [attr.aria-pressed]="mostrarPassword()"
                [attr.aria-label]="mostrarPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </label>

          <button type="submit" class="login-submit" [disabled]="loading()">
            @if (loading()) {
              <span class="login-submit__spinner" aria-hidden="true"></span>
              <span>Ingresando...</span>
            } @else {
              <span>Iniciar sesión</span>
            }
          </button>
        </form>

        <app-google-sign-in (credentialReceived)="iniciarConGoogle($event)" [busy]="loading()" />

        <a routerLink="/recuperar-cuenta" class="login-link">¿Olvidaste tu contraseña?</a>

        <p class="login-footer">
          ¿No tienes una cuenta aún?
          <a routerLink="/registro">Regístrate aquí</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .login-screen {
      display: flex;
      min-height: calc(100dvh - 5.5rem);
      align-items: center;
      justify-content: center;
      padding: 1rem max(0.75rem, env(safe-area-inset-right)) 1.5rem max(0.75rem, env(safe-area-inset-left));
    }
    .login-card {
      width: min(100%, 26rem);
      border: 1px solid #e5e7eb;
      border-radius: 1.25rem;
      padding: 1.25rem;
      background: #ffffff;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }
    .login-card__intro { text-align: center; }
    .login-card__icon {
      display: grid;
      width: 3rem;
      height: 3rem;
      margin: 0 auto 0.75rem;
      place-items: center;
      border-radius: 0.85rem;
      background: #f3f4f6;
      color: #111827;
    }
    .login-card__icon svg { width: 1.35rem; height: 1.35rem; }
    .login-card__intro h1 {
      margin: 0;
      color: #111827;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .login-card__intro p {
      margin: 0.35rem 0 0;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .login-alert {
      margin-top: 1rem;
      border-radius: 0.85rem;
      padding: 0.75rem 0.9rem;
      font-size: 0.875rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .login-alert--warn { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; }
    .login-alert--error { border: 1px solid #fecaca; background: #fff1f2; color: #be123c; }
    .login-form { display: grid; gap: 0.85rem; margin-top: 1.15rem; }
    .login-field { display: grid; gap: 0.4rem; }
    .login-field > span {
      color: #374151;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .login-field input {
      width: 100%;
      min-height: 2.85rem;
      border: 1px solid #d1d5db;
      border-radius: 0.85rem;
      padding: 0.7rem 0.9rem;
      background: #f9fafb;
      color: #111827;
      font-size: 16px;
      -webkit-appearance: none;
      appearance: none;
    }
    .login-field input:focus {
      outline: none;
      border-color: #111827;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.12);
    }
    .login-field__password { position: relative; }
    .login-field__password input { padding-right: 3rem; }
    .login-field__password button {
      position: absolute;
      top: 50%;
      right: 0.25rem;
      display: grid;
      width: 2.5rem;
      height: 2.5rem;
      place-items: center;
      border: 0;
      border-radius: 0.65rem;
      background: transparent;
      color: #4b5563;
      transform: translateY(-50%);
    }
    .login-field__password svg { width: 1.15rem; height: 1.15rem; }
    .login-submit {
      display: inline-flex;
      min-height: 3rem;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.2rem;
      border: 0;
      border-radius: 0.85rem;
      background: #111827 !important;
      color: #ffffff !important;
      font-size: 0.95rem;
      font-weight: 700;
      touch-action: manipulation;
    }
    .login-submit:disabled { opacity: 0.55; }
    .login-submit__spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: login-spin 0.7s linear infinite;
    }
    .login-link {
      display: block;
      margin-top: 0.85rem;
      color: #111827;
      font-size: 0.875rem;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
    }
    .login-footer {
      margin: 1rem 0 0;
      padding-top: 0.85rem;
      border-top: 1px solid #f3f4f6;
      color: #6b7280;
      font-size: 0.75rem;
      text-align: center;
    }
    .login-footer a {
      margin-left: 0.25rem;
      color: #111827;
      font-weight: 700;
      text-decoration: none;
    }
    @keyframes login-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .login-submit__spinner { animation: none; }
    }
    :host-context(html.dark) .login-card {
      border-color: #27272a;
      background: #121212;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    }
    :host-context(html.dark) .login-card__icon { background: #1f1f1f; color: #f4f4f5; }
    :host-context(html.dark) .login-card__intro h1 { color: #f9fafb; }
    :host-context(html.dark) .login-card__intro p,
    :host-context(html.dark) .login-footer { color: #9ca3af; }
    :host-context(html.dark) .login-field > span { color: #d1d5db; }
    :host-context(html.dark) .login-field input {
      border-color: #3f3f46;
      background: #1a1a1a;
      color: #f9fafb;
    }
    :host-context(html.dark) .login-field input:focus {
      border-color: #e5e7eb;
      background: #111113;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
    }
    :host-context(html.dark) .login-field__password button { color: #d1d5db; }
    :host-context(html.dark) .login-submit {
      background: #f4f4f5 !important;
      color: #111827 !important;
    }
    :host-context(html.dark) .login-link,
    :host-context(html.dark) .login-footer a { color: #f4f4f5; }
    :host-context(html.dark) .login-footer { border-top-color: #27272a; }
    :host-context(html.dark) .login-alert--warn { border-color: #78350f; background: #1c1917; color: #fbbf24; }
    :host-context(html.dark) .login-alert--error { border-color: #7f1d1d; background: #1c1917; color: #fca5a5; }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  sessionExpiredWarning = signal<boolean>(false);
  mostrarPassword = signal(false);

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        this.sessionExpiredWarning.set(true);
      }
    });

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  togglePasswordVisibility(): void {
    this.mostrarPassword.update(visible => !visible);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.sessionExpiredWarning.set(false);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          mensajeDeError(err, 'Error de conexión con el backend o credenciales incorrectas.')
        );
      }
    });
  }

  iniciarConGoogle(credential: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.loginWithGoogle(credential).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(mensajeDeError(error, 'No se pudo iniciar sesión con Google.'));
      }
    });
  }
}
