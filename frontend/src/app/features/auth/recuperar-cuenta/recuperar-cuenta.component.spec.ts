import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RecuperarCuentaComponent } from './recuperar-cuenta.component';

describe('RecuperarCuentaComponent disponibilidad', () => {
  it('mantiene el formulario cuando el servicio de correo no está disponible', () => {
    TestBed.configureTestingModule({ imports: [RecuperarCuentaComponent], providers: [
      { provide: AuthService, useValue: { solicitarRecuperacion: () => of({success:true,data:false}) } },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(new URLSearchParams()) } },
    ] });
    const component = TestBed.createComponent(RecuperarCuentaComponent).componentInstance;
    component.email = 'ana@example.test'; component.solicitar();
    expect(component.solicitudEnviada()).toBe(false);
    expect(component.mensaje()).toBeNull();
    expect(component.error()).toContain('no está disponible');
    expect(component.cargando()).toBe(false);
  });
});
