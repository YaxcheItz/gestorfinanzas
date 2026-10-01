import { TestBed } from '@angular/core/testing';
import { CategoriaPreferidaService } from './categoria-preferida.service';

describe('CategoriaPreferidaService', () => {
  let preferida: CategoriaPreferidaService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [CategoriaPreferidaService] });
    preferida = TestBed.inject(CategoriaPreferidaService);
  });

  it('no recuerda ninguna categoria hasta que se elige una', () => {
    preferida.aplicarDesdeCache(7);

    expect(preferida.preferida('GASTO')).toBeNull();
    expect(preferida.preferida('INGRESO')).toBeNull();
  });

  it('recupera la categoria guardada para cada tipo', () => {
    localStorage.setItem('kaptal_categoria_gasto_7', '12');
    localStorage.setItem('kaptal_categoria_ingreso_7', '30');

    preferida.aplicarDesdeCache(7);

    expect(preferida.preferida('GASTO')).toBe(12);
    expect(preferida.preferida('INGRESO')).toBe(30);
  });

  it('separa gasto e ingreso: una categoria de gasto no abre un ingreso', () => {
    preferida.aplicarDesdeCache(7);
    preferida.recordar('GASTO', 12);

    expect(preferida.preferida('INGRESO')).toBeNull();
  });

  it('no mezcla la memoria de dos usuarios en el mismo navegador', () => {
    preferida.aplicarDesdeCache(7);
    preferida.recordar('GASTO', 12);
    preferida.limpiar();

    preferida.aplicarDesdeCache(9);

    expect(preferida.preferida('GASTO')).toBeNull();
  });

  it('guarda en la cache al recordar', () => {
    preferida.aplicarDesdeCache(7);

    preferida.recordar('GASTO', 12);

    expect(localStorage.getItem('kaptal_categoria_gasto_7')).toBe('12');
  });

  it('ignora una cache que no sea un id valido', () => {
    localStorage.setItem('kaptal_categoria_gasto_7', 'todas');
    localStorage.setItem('kaptal_categoria_ingreso_7', '-4');

    preferida.aplicarDesdeCache(7);

    expect(preferida.preferida('GASTO')).toBeNull();
    expect(preferida.preferida('INGRESO')).toBeNull();
  });

  it('olvida la categoria al cerrar sesion', () => {
    preferida.aplicarDesdeCache(7);
    preferida.recordar('GASTO', 12);

    preferida.limpiar();

    expect(preferida.preferida('GASTO')).toBeNull();
  });

  it('no escribe nada si todavia no se sabe quien inicio sesion', () => {
    // Sin usuario no hay clave que escribir: guardarlo seria colgarlo de "undefined".
    preferida.recordar('GASTO', 12);

    expect(localStorage.length).toBe(0);
  });
});