import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccionesMovimientoComponent, TipoRegistroRapido } from './acciones-movimiento.component';

describe('AccionesMovimientoComponent', () => {
  let fixture: ComponentFixture<AccionesMovimientoComponent>;
  let component: AccionesMovimientoComponent;

  /** Los tres botones de operacion, sin el de navegacion a cuentas. */
  const botonesOperacion = (): HTMLButtonElement[] => botones().slice(0, 3);
  const botonCuentas = (): HTMLButtonElement => botones()[3];

  const botones = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccionesMovimientoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AccionesMovimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('ofrece un boton por cada operacion, sin saldo inicial, mas el acceso a cuentas', () => {
    expect(botones().length).toBe(4);

    expect(botonesOperacion().map(b => b.textContent?.trim())).toEqual([
      'Gasto',
      'Ingreso',
      'Transf.'
    ]);
    expect(component.acciones.map(a => a.tipo)).toEqual<TipoRegistroRapido[]>([
      'GASTO',
      'INGRESO',
      'TRANSFERENCIA'
    ]);
  });

  it('avisa del tipo de cada boton al pulsarlo, para abrir el formulario en esa pestana', () => {
    const elegidos: TipoRegistroRapido[] = [];
    component.elegir.subscribe(({ tipo }) => elegidos.push(tipo));

    botonesOperacion().forEach(boton => boton.click());

    expect(elegidos).toEqual(['GASTO', 'INGRESO', 'TRANSFERENCIA']);
  });

  it('lleva la eleccion de cuenta por un canal aparte, para no abrir el formulario', () => {
    const elegidos: TipoRegistroRapido[] = [];
    const navegaciones: number[] = [];
    component.elegir.subscribe(({ tipo }) => elegidos.push(tipo));
    component.navegar.subscribe(() => navegaciones.push(1));

    botonCuentas().click();

    expect(elegidos).toEqual([]);
    expect(navegaciones.length).toBe(1);
  });

  it('describe la accion con texto propio y no solo con el color', () => {
    // El color ya distingue las tres de un vistazo, pero quien no lo distingue o usa lector
    // de pantalla necesita la misma informacion por texto.
    const etiquetasAccion = botonesOperacion().map(b => b.getAttribute('aria-label'));

    expect(etiquetasAccion).toEqual([
      'Saca dinero de tu cuenta',
      'Suma dinero a tu cuenta',
      'Mueve dinero entre cuentas'
    ]);
  });

  it('mantiene los iconos decorativos fuera del arbol de accesibilidad', () => {
    for (const boton of botones()) {
      const svg = boton.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('agrupa los botones para que se anuncien como un conjunto', () => {
    const grupo = fixture.nativeElement.querySelector('[role="group"]');

    expect(grupo).toBeTruthy();
    expect(grupo.getAttribute('aria-label')).toBe('Acciones rápidas para registrar un movimiento');
  });

  it('reparte los botones en dos columnas con separacion suficiente entre vecinos', () => {
    // Por debajo de 44px de alto y con menos de 8px de separacion, acertar el pulso a mano
    // en movil se vuelve una loteria: es el umbral que marcan las guias de target size.
    const grupo = fixture.nativeElement.querySelector('[role="group"]');

    expect(grupo.className).toContain('grid-cols-2');
    expect(grupo.className).toContain('gap-3');
    for (const boton of botones()) {
      expect(boton.className).toContain('min-h-16');
      expect(boton.className).toContain('cursor-pointer');
    }
  });
});
