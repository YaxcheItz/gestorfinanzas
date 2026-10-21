import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { accionCaptura } from '../utils/accion-captura';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const captura = route.routeConfig?.path === 'dashboard' ? accionCaptura(route.queryParams['accion']) : null;

  if (authService.isAuthenticated()) {
    if (authService.tokenCaducado()) {
      authService.cerrarSesionLocal('expirada', captura);
      return false;
    }
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: captura ? { captura } : {} });
};
