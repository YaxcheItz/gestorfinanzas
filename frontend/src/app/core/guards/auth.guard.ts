import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { accionCaptura } from '../utils/accion-captura';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const captura = route.routeConfig?.path === 'dashboard' ? accionCaptura(route.queryParams['accion']) : null;

  if (authService.isAuthenticated()) {
    if (authService.tokenCaducado()) {
      if (navigator.onLine === false) return true;
      const userId = authService.currentUser()?.id;
      return authService.renovarSesion(captura).pipe(
        map(() => authService.currentUser()?.id === userId),
        catchError(() => of(authService.isAuthenticated() && authService.currentUser()?.id === userId))
      );
    }
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: captura ? { captura } : {} });
};
