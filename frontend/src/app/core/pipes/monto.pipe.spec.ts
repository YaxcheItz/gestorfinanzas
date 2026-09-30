import { TestBed } from '@angular/core/testing';
import { PrivacidadService } from '../services/privacidad.service';
import { MontoPipe } from './monto.pipe';

describe('MontoPipe', () => {
  let privacidad: PrivacidadService;
  let pipe: MontoPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PrivacidadService] });
    privacidad = TestBed.inject(PrivacidadService);
    pipe = TestBed.runInInjectionContext(() => new MontoPipe());
  });

  it('formatea el monto cuando la privacidad esta apagada', () => {
    privacidad.aplicar(1, false);

    const resultado = pipe.transform(1234.5, 'MXN', 'symbol', '1.2-2');

    expect(resultado).not.toBe('•••');
    expect(resultado).toContain('1,234.50');
  });

  it('tapa el monto cuando la privacidad esta encendida', () => {
    privacidad.aplicar(1, true);

    expect(pipe.transform(1234.5, 'MXN', 'symbol', '1.2-2')).toBe('•••');
  });

  it('tapa los montos sin decimales igual que los que si los tienen', () => {
    privacidad.aplicar(1, true);

    expect(pipe.transform(4200, 'MXN', 'symbol', '1.0-0')).toBe('•••');
    expect(pipe.transform(0, 'MXN', 'symbol', '1.2-2')).toBe('•••');
  });

  it('no inventa una mascara donde no hay cifra que tapar', () => {
    privacidad.aplicar(1, true);

    // Sin monto no hay nada que esconder: se mantiene el null de CurrencyPipe
    // en vez de imprimir los puntos donde la plantilla no iba a pintar nada.
    expect(pipe.transform(null, 'MXN', 'symbol', '1.2-2')).toBeNull();
    expect(pipe.transform(undefined, 'MXN', 'symbol', '1.2-2')).toBeNull();
  });

  it('tapa el cero porque si es un monto real', () => {
    privacidad.aplicar(1, true);

    expect(pipe.transform(0, 'MXN', 'symbol', '1.2-2')).toBe('•••');
  });

  it('cambia de un estado al otro sin recrear el pipe', () => {
    privacidad.aplicar(1, false);
    expect(pipe.transform(99, 'MXN', 'symbol', '1.2-2')).not.toBe('•••');

    privacidad.aplicar(1, true);
    expect(pipe.transform(99, 'MXN', 'symbol', '1.2-2')).toBe('•••');
  });
});
