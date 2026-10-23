import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';

describe('authGuard y accesos rápidos', () => {
  const auth={isAuthenticated:vi.fn(()=>false),tokenCaducado:vi.fn(()=>false),cerrarSesionLocal:vi.fn(),currentUser:vi.fn(()=>({id:71})),renovarSesion:vi.fn(()=>of({}))};
  beforeEach(()=>{
    auth.isAuthenticated.mockReturnValue(false);auth.tokenCaducado.mockReturnValue(false);auth.cerrarSesionLocal.mockClear();
    auth.currentUser.mockReturnValue({id:71});auth.renovarSesion.mockReset();auth.renovarSesion.mockReturnValue(of({}));
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
  afterEach(()=>vi.restoreAllMocks());
  it('renueva el acceso vencido al navegar conservando la intención sin pedir login',async()=>{
    auth.isAuthenticated.mockReturnValue(true);auth.tokenCaducado.mockReturnValue(true);
    expect(await firstValueFrom(comprobar('dashboard','nuevo-ingreso') as Observable<boolean>)).toBe(true);
    expect(auth.renovarSesion).toHaveBeenCalledWith('nuevo-ingreso');expect(auth.cerrarSesionLocal).not.toHaveBeenCalled();
  });
  it('no bloquea la captura offline ni intenta renovar sin red',()=>{
    vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
    auth.isAuthenticated.mockReturnValue(true);auth.tokenCaducado.mockReturnValue(true);
    expect(comprobar('dashboard','nuevo-gasto')).toBe(true);expect(auth.renovarSesion).not.toHaveBeenCalled();
  });
  it('conserva la sesion ante fallo temporal pero impide navegar si otra cuenta la reemplazo',async()=>{
    auth.isAuthenticated.mockReturnValue(true);auth.tokenCaducado.mockReturnValue(true);
    auth.renovarSesion.mockReturnValue(throwError(()=>({status:503})));
    expect(await firstValueFrom(comprobar('cuentas',null) as Observable<boolean>)).toBe(true);
    auth.renovarSesion.mockImplementation(()=>{auth.currentUser.mockReturnValue({id:72});return of({});});
    expect(await firstValueFrom(comprobar('cuentas',null) as Observable<boolean>)).toBe(false);
  });
  it('una sesión vigente permite continuar sin redirigir',()=>{
    auth.isAuthenticated.mockReturnValue(true);
    expect(comprobar('dashboard','nuevo-gasto')).toBe(true);
    expect(auth.cerrarSesionLocal).not.toHaveBeenCalled();
  });
});
