import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse, AuthResponse, LoginPayload, RegistroPayload, Usuario } from '../models/auth.models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  private readonly tokenKey = 'finanzas_token';
  private readonly userKey = 'finanzas_user';

  // Signals para estado reactivo moderno
  private readonly _currentUser = signal<Usuario | null>(this.obtenerUsuarioAlmacenado());
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => !!this._currentUser());

  registro(payload: RegistroPayload): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/registro`, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.guardarSesion(res.data);
        }
      })
    );
  }

  login(payload: LoginPayload): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.guardarSesion(res.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private guardarSesion(auth: AuthResponse): void {
    localStorage.setItem(this.tokenKey, auth.token);
    const usuario: Usuario = { id: auth.id, nombre: auth.nombre, email: auth.email };
    localStorage.setItem(this.userKey, JSON.stringify(usuario));
    this._currentUser.set(usuario);
  }

  private obtenerUsuarioAlmacenado(): Usuario | null {
    const data = localStorage.getItem(this.userKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as Usuario;
    } catch {
      return null;
    }
  }
}
