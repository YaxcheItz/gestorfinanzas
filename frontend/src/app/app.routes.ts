import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(module => module.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro.component')
      .then(module => module.RegistroComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(module => module.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'transacciones',
    loadComponent: () => import('./features/transacciones/transacciones.component')
      .then(module => module.TransaccionesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'presupuestos',
    loadComponent: () => import('./features/presupuestos/presupuestos.component')
      .then(module => module.PresupuestosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cuentas',
    loadComponent: () => import('./features/cuentas/cuentas.component')
      .then(module => module.CuentasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'categorias',
    loadComponent: () => import('./features/categorias/categorias.component')
      .then(module => module.CategoriasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./features/configuracion/configuracion.component')
      .then(module => module.ConfiguracionComponent),
    canActivate: [authGuard]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
