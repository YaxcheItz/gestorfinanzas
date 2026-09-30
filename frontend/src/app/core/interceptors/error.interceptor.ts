import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor que detecta cuando la sesión quedó inservible y manda al login.
 *
 * Solo un 401 significa "tu token no sirvió". Un 403 significa "tu token es
 * válido pero tu rol no alcanza para esto", y un 5xx significa que falló el
 * servidor. En los tres casos la sesión sigue viva, así que borrar el token y
 * expulsar al usuario convierte un problema real en un síntoma falso: hace
 * parecer un error del servidor o un problema de permisos como si la sesión
 * hubiera caducado.
 *
 * La excepción son los endpoints públicos de auth: ahí un 401 sí es una
 * respuesta legítima del servidor y hay que dejar pasar el mensaje tal cual
 * para que el componente lo muestre.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const esAuthPublico = req.url.includes('/api/auth/');

      if (error.status === 401 && !esAuthPublico) {
        localStorage.removeItem('finanzas_token');
        localStorage.removeItem('finanzas_user');
        router.navigate(['/login'], {
          queryParams: { sessionExpired: 'true' }
        });
      }

      return throwError(() => error);
    })
  );
};
