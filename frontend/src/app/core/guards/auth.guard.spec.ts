import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard y accesos rápidos', () => {
  const auth={isAuthenticated:vi.fn(()=>false),tokenCaducado:vi.fn(()=>false),cerrarSesionLocal:vi.fn()};
  beforeEach(()=>{
    auth.isAuthenticated.mockReturnValue(false);auth.tokenCaducado.mockReturnValue(false);auth.cerrarSesionLocal.mockClear();
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:auth}]});
  });
  function comprobar(path:string,accion:unknown) {
    return TestBed.runInInjectionContext(()=>authGuard({routeConfig:{path},queryParams:{accion}} as unknown as ActivatedRouteSnapshot,{} as RouterStateSnapshot));
  }
  it('conserva solo la acción conocida de dashboard al pedir login',()=>{
    const router=TestBed.inject(Router);
    expect(router.serializeUrl(comprobar('dashboard','dictar') as UrlTree)).toBe('/login?captura=dictar');
    expect(router.serializeUrl(comprobar('dashboard','//otro.example') as UrlTree)).toBe('/login');
    expect(router.serializeUrl(comprobar('cuentas','dictar') as UrlTree)).toBe('/login');
  });
  it('una sesión vencida se limpia y conserva la intención para volver a autenticarse',()=>{
    auth.isAuthenticated.mockReturnValue(true);auth.tokenCaducado.mockReturnValue(true);
    expect(comprobar('dashboard','nuevo-ingreso')).toBe(false);
    expect(auth.cerrarSesionLocal).toHaveBeenCalledWith('expirada','nuevo-ingreso');
  });
  it('una sesión vigente permite continuar sin redirigir',()=>{
    auth.isAuthenticated.mockReturnValue(true);
    expect(comprobar('dashboard','nuevo-gasto')).toBe(true);
    expect(auth.cerrarSesionLocal).not.toHaveBeenCalled();
  });
});
