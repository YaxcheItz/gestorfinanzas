import { TestBed } from '@angular/core/testing';
import { PrivacidadService } from './privacidad.service';

describe('PrivacidadService', () => {
  afterEach(() => vi.restoreAllMocks());
  let privacidad: PrivacidadService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [PrivacidadService] });
    privacidad = TestBed.inject(PrivacidadService);
  });

  it('empieza con los montos a la vista', () => {
    expect(privacidad.ocultarMontos()).toBe(false);
  });

  it('recupera la preferencia desde la cache antes de la respuesta del servidor', () => {
    localStorage.setItem('kaptal_ocultar_montos_7', 'true');

    privacidad.aplicarDesdeCache(7);

    expect(privacidad.ocultarMontos()).toBe(true);
  });

  it('no aplica una cache de otro usuario', () => {
    privacidad.aplicar(7, true);
    privacidad.limpiar();

    privacidad.aplicarDesdeCache(9);

    expect(privacidad.ocultarMontos()).toBe(false);
  });

  it('guarda la preferencia en la cache al aplicarla', () => {
    privacidad.aplicar(7, true);

    expect(localStorage.getItem('kaptal_ocultar_montos_7')).toBe('true');
  });

  it('ignora valores de cache que no sean booleanos', () => {
    localStorage.setItem('kaptal_ocultar_montos_7', 'si');

    privacidad.aplicarDesdeCache(7);

    expect(privacidad.ocultarMontos()).toBe(false);
  });

  it('deja los montos a la vista al cerrar sesion', () => {
    privacidad.aplicar(7, true);

    privacidad.limpiar();

    expect(privacidad.ocultarMontos()).toBe(false);
  });

  it('no expone importes ni impide abrir la app si Android bloquea la caché', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(() => privacidad.aplicarDesdeCache(7)).not.toThrow();
    expect(privacidad.ocultarMontos()).toBe(true);
    privacidad.aplicar(7, false); // The authenticated server preference can still resolve the state.
    expect(privacidad.ocultarMontos()).toBe(false);
  });

  it('mantiene la preferencia en memoria si no puede guardarla en la caché', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(() => privacidad.aplicar(7, true)).not.toThrow();
    expect(privacidad.ocultarMontos()).toBe(true);
    expect(() => privacidad.alternarLocal()).not.toThrow();
    expect(privacidad.ocultarMontos()).toBe(false);
  });
});
