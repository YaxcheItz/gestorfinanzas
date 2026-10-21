import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent envío', () => {
  let login: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    login = vi.fn(); navigate = vi.fn();
    TestBed.configureTestingModule({ imports: [LoginComponent], providers: [
      { provide: AuthService, useValue: { isAuthenticated: () => false, login } },
      { provide: Router, useValue: { navigate } },
      { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
    ] });
  });
  it('un segundo envío no abre otra sesión mientras espera respuesta', () => {
    const response = new Subject(); login.mockReturnValue(response);
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.email = '  ana@example.test  '; component.password = 'password123';
    component.onSubmit(); component.onSubmit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({ email: 'ana@example.test', password: 'password123' });
    expect(navigate).not.toHaveBeenCalled();
  });
  it('una respuesta fallida mantiene el acceso y muestra el error', () => {
    login.mockReturnValue(of({ success: false, data: null, message: 'Revisa tus datos' }));
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.email = 'ana@example.test'; component.password = 'password123';
    component.onSubmit();
    expect(component.errorMessage()).toBe('Revisa tus datos');
    expect(component.loading()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  for (const metodo of ['password','google']) {
    for (const captura of ['nuevo-gasto','nuevo-ingreso','dictar','https://otro.example']) {
      it(`continúa ${captura} después del acceso ${metodo} sin admitir destinos externos`, () => {
        TestBed.overrideProvider(ActivatedRoute,{useValue:{queryParams:of({captura})}});
        const respuesta=vi.fn(()=>of({success:true,data:{id:1}}));
        TestBed.overrideProvider(AuthService,{useValue:{isAuthenticated:()=>false,login:respuesta,loginWithGoogle:respuesta}});
        const component=TestBed.createComponent(LoginComponent).componentInstance;
        component.email='ana@example.test';component.password='Password123';
        if(metodo==='google')component.iniciarConGoogle('credencial-sintetica');else component.onSubmit();
        expect(navigate).toHaveBeenCalledWith(['/dashboard'], captura.startsWith('https')
          ? {replaceUrl:true} : {replaceUrl:true,queryParams:{accion:captura}});
      });
    }
  }
});
