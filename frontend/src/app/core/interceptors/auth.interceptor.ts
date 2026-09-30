import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * Mantiene viva la sesion sin molestar al usuario.
 *
 * El access token dura 15 minutos a proposito, asi que tarde o temprano llega expirado. Cuando
 * eso pasa, un 401 no significa "tu sesion murio": solo que hay que cambiar el token. Antes de
 * echarlo al login, este interceptor pide uno nuevo con la cookie de refresh (que el navegador
 * manda sola, sin que el JavaScript la pueda leer) y reintenta la peticion original. El usuario
 * solo ve la pantalla si la cookie tampoco sirve, que es el unico caso en que de verdad se acabo
 * la sesion.
 *
 * Varias peticiones pueden caducar a la vez (un dashboard carga varias en paralelo). Si cada
 * una pidiera su propio refresh, la rotacion haria que las demas revocaran al primero y todas
 * fallarian. Por eso se comparte una sola peticion en vuelo.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq).pipe(
      catchError((error) => {
        const esPeticionDeAuth = req.url.includes('/api/auth/');
        if (error.status !== 401 || esPeticionDeAuth) {
          return throwError(() => error);
        }
        return authService.renovarSesion().pipe(
          switchMap(() => next(req.clone({
            setHeaders: {
              Authorization: `Bearer ${authService.getToken()}`
            }
          }))),
          catchError((errorRefresh) => {
            // La cookie tampoco sirvio: aqui si se acabo la sesion.
            if (errorRefresh.status === 401) {
              authService.cerrarSesionLocal();
            }
            return throwError(() => error);
          })
        );
      })
    );
  }

  return next(req);
};
