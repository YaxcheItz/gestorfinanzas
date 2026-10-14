import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RegistroComponent } from './registro.component';

describe('RegistroComponent envío', () => {
  let registro: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    registro = vi.fn();
    TestBed.configureTestingModule({imports:[RegistroComponent],providers:[
      {provide:AuthService,useValue:{isAuthenticated:()=>false,registro}},
      provideRouter([]),
    ]});
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  function preparado() {
    const component = TestBed.createComponent(RegistroComponent).componentInstance;
    component.nombre='Ana';component.email='ana@example.test';component.password='Password123';
    return component;
  }
  it('evita repetir el registro mientras espera respuesta', () => {
    registro.mockReturnValue(new Subject());
    const component=preparado();component.onSubmit();component.onSubmit();
    expect(registro).toHaveBeenCalledTimes(1);
  });
  it('permite corregir datos si el servidor rechaza crear la cuenta', () => {
    registro.mockReturnValue(of({success:false,data:null,message:'Revisa tus datos'}));
    const component=preparado();component.onSubmit();
    expect(component.errorMessage()).toBe('Revisa tus datos');
    expect(component.loading()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
