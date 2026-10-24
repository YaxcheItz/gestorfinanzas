import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GuiaInicialService } from '../../../core/services/guia-inicial.service';
import { GuiaInicialComponent } from './guia-inicial.component';

describe('GuiaInicialComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [GuiaInicialComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: {
        currentUser: signal({ id: 7, nombre: 'Prueba', email: 'guia@example.test' }),
      } }],
    });
  });

  it('ofrece rutas reales y explica que voz y avisos son opcionales', async () => {
    const fixture = TestBed.createComponent(GuiaInicialComponent);
    await fixture.whenStable();
    const links = [...fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>];
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/cuentas', '/transacciones', '/presupuestos', '/avisos']);
    expect(fixture.nativeElement.textContent).toContain('micrófono');
    expect(fixture.nativeElement.textContent).toContain('consentimiento');
  });

  it('omite sin bloquear el inicio y devuelve el foco al contenido', async () => {
    const main = document.createElement('main'); main.id = 'main-content'; main.tabIndex = -1;
    document.body.append(main);
    const fixture = TestBed.createComponent(GuiaInicialComponent);
    await fixture.whenStable();
    try {
      fixture.nativeElement.querySelector('button').click();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('section')).toBeNull();
      expect(document.activeElement).toBe(main);
      TestBed.inject(GuiaInicialService).mostrar();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('section')).not.toBeNull();
    } finally { main.remove(); }
  });
});
