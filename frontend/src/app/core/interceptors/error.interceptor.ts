import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor que captura respuestas 401 (token ausente/inválido) y
 * 403 (token expirado que Spring trata como acceso denegado).
 * Limpia la sesión corrupta del localStorage y redirige al login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        // Solo actuar si NO es una llamada a los endpoints públicos de auth
        if (!req.url.includes('/api/auth/')) {
          localStorage.removeItem('finanzas_token');
          localStorage.removeItem('finanzas_user');
          router.navigate(['/login'], {
            queryParams: { sessionExpired: 'true' }
          });
        }
      }
      return throwError(() => error);
    })
  );
};
