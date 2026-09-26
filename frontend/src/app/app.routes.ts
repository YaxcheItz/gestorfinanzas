import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegistroComponent } from './features/auth/registro/registro.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PresupuestosComponent } from './features/presupuestos/presupuestos.component';
import { TransaccionesComponent } from './features/transacciones/transacciones.component';
import { CuentasComponent } from './features/cuentas/cuentas.component';
import { CategoriasComponent } from './features/categorias/categorias.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'transacciones', component: TransaccionesComponent, canActivate: [authGuard] },
  { path: 'presupuestos', component: PresupuestosComponent, canActivate: [authGuard] },
  { path: 'cuentas', component: CuentasComponent, canActivate: [authGuard] },
  { path: 'categorias', component: CategoriasComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
