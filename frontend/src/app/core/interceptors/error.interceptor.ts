import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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
 *
 * El cierre lo delega en `AuthService` en vez de borrar el almacenamiento con
 * literales: las claves viven en un solo sitio. Y se salta si ya no queda
 * sesión, porque al cargar una pantalla llegan varias peticiones en paralelo y
 * todas caen en 401 a la vez; sin esta guarda se acumulaban varios
 * `navigate` al mismo sitio, y ademas el componente que espera el dato recibe un
 * error de una sesion que ya se cerro.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const esAuthPublico = req.url.includes('/api/auth/');

      if (error.status === 401 && !esAuthPublico && authService.isAuthenticated()) {
        authService.cerrarSesionLocal('expirada');
      }

      return throwError(() => error);
    })
  );
};