import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApiResponse } from '../../core/models/auth.models';
import { AsientoContable, LibroDiarioFiltro, PageResponse } from '../../core/models/finanzas.models';
import { FeatureStylesService } from '../../core/services/feature-styles.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { LibroDiarioComponent } from './libro-diario.component';

type RespuestaLibro = ApiResponse<PageResponse<AsientoContable>>;

const vacia: PageResponse<AsientoContable> = {
  content: [], totalPages: 0, totalElements: 0, number: 0, size: 20, first: true, last: true, empty: true
};

const conAsientos: PageResponse<AsientoContable> = {
  ...vacia, totalPages: 2, totalElements: 21, last: false, empty: false,
  content: [{
    id: 81, transaccionOrigenId: 71, tipoEvento: 'CREACION', tipoMovimiento: 'GASTO',
    fechaOperacion: '2026-11-11', descripcion: 'Asiento ficticio', tasaCambio: null,
    fechaCreacion: '2026-11-11', lineas: []
  }]
};

const exito = (data: PageResponse<AsientoContable>): RespuestaLibro => ({ success: true, message: '', data });

describe('Libro diario', () => {
  const consultar = vi.fn<(page: number, size: number, filtros: LibroDiarioFiltro) => Observable<RespuestaLibro>>();

  beforeEach(() => {
    consultar.mockReset().mockReturnValue(of(exito(conAsientos)));
    TestBed.configureTestingModule({
      imports: [LibroDiarioComponent],
      providers: [
        provideRouter([]),
        { provide: FeatureStylesService, useValue: { load: () => undefined } },
        { provide: FinanzasService, useValue: { getCuentas: () => of({ success: true, data: [] }), getLibroDiario: consultar } }
      ]
    });
  });

  function abrirLibro() {
    const fixture = TestBed.createComponent(LibroDiarioComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('oculta el resultado anterior mientras se consulta otro filtro', () => {
    const pendiente = new Subject<RespuestaLibro>();
    consultar.mockReturnValueOnce(pendiente);
    const fixture = abrirLibro();
    const libro = fixture.componentInstance;
    const texto = fixture.nativeElement as HTMLElement;

    libro.pagina.set(vacia);
    fixture.detectChanges();
    expect(texto.querySelector('[aria-label="Cargando asientos"]')).not.toBeNull();
    expect(texto.textContent).not.toContain('Aún no hay asientos contables');

    pendiente.next(exito(vacia));
    fixture.detectChanges();
    expect(texto.textContent).toContain('Aún no hay asientos contables');
  });

  it('conserva el filtro aplicado al paginar con una edición pendiente', () => {
    const libro = abrirLibro().componentInstance;
    libro.filtroTipoMovimiento.set('GASTO');
    libro.aplicarFiltros();
    libro.filtroTipoMovimiento.set('TRANSFERENCIA');

    libro.cambiarPagina(1);

    expect(consultar).toHaveBeenLastCalledWith(1, 20, expect.objectContaining({ tipoMovimiento: 'GASTO' }));
  });

  it('limpia en plena carga y conserva solo el resultado de la consulta nueva', () => {
    const anterior = new Subject<RespuestaLibro>();
    const sinFiltros = new Subject<RespuestaLibro>();
    consultar.mockReturnValueOnce(of(exito(conAsientos)))
      .mockReturnValueOnce(anterior)
      .mockReturnValueOnce(sinFiltros);
    const libro = abrirLibro().componentInstance;
    libro.filtroTipoMovimiento.set('TRANSFERENCIA');
    libro.aplicarFiltros();

    libro.limpiarFiltros();
    anterior.next(exito(vacia));

    expect(consultar).toHaveBeenCalledTimes(3);
    expect(consultar).toHaveBeenLastCalledWith(0, 20, {});
    expect(libro.cargando()).toBe(true);
    expect(libro.pagina()).toBeNull();
    sinFiltros.next(exito(conAsientos));
    expect(libro.pagina()).toBe(conAsientos);
  });

  it('muestra un rango inválido junto al formulario y conserva los resultados', () => {
    const fixture = abrirLibro();
    const libro = fixture.componentInstance;
    const vista = fixture.nativeElement as HTMLElement;
    libro.filtroDesde.set('2026-11-30');
    libro.filtroHasta.set('2026-11-01');
    libro.aplicarFiltros();
    fixture.detectChanges();

    expect(consultar).toHaveBeenCalledTimes(1);
    expect(vista.querySelector('form [role="alert"]')?.textContent).toContain('La fecha inicial no puede ser posterior');
    expect(vista.textContent).not.toContain('Reintentar');
    expect(vista.textContent).toContain('Asiento ficticio');

    libro.filtroHasta.set('2026-11-30');
    libro.aplicarFiltros();
    fixture.detectChanges();
    expect(vista.querySelector('form [role="alert"]')).toBeNull();
    expect(consultar).toHaveBeenLastCalledWith(0, 20, expect.objectContaining({
      desde: '2026-11-30', hasta: '2026-11-30'
    }));
  });

  it('reintenta la consulta que falló con los últimos filtros aplicados', () => {
    const error = new Subject<RespuestaLibro>();
    consultar.mockReturnValueOnce(of(exito(conAsientos))).mockReturnValueOnce(error);
    const fixture = abrirLibro();
    const libro = fixture.componentInstance;
    libro.filtroTipoMovimiento.set('GASTO');
    libro.aplicarFiltros();
    error.error({ error: { message: 'Servicio ficticio no disponible' } });
    libro.filtroTipoMovimiento.set('TRANSFERENCIA');
    fixture.detectChanges();

    const vista = fixture.nativeElement as HTMLElement;
    vista.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    expect(consultar).toHaveBeenCalledTimes(3);
    expect(consultar).toHaveBeenLastCalledWith(0, 20, expect.objectContaining({ tipoMovimiento: 'GASTO' }));
  });

  it('distingue el vacío filtrado aunque el formulario se edite y permite limpiar', () => {
    consultar.mockReturnValueOnce(of(exito(conAsientos))).mockReturnValueOnce(of(exito(vacia)));
    const fixture = abrirLibro();
    const libro = fixture.componentInstance;
    const vista = fixture.nativeElement as HTMLElement;
    libro.filtroTipoMovimiento.set('INGRESO');
    libro.aplicarFiltros();
    libro.filtroTipoMovimiento.set('');
    fixture.detectChanges();

    expect(vista.textContent).toContain('No hay asientos con estos filtros');
    expect(vista.textContent).not.toContain('Aún no hay asientos contables');
    const limpiar = Array.from(vista.querySelectorAll('button'))
      .find(boton => boton.textContent?.trim() === 'Limpiar filtros');
    expect(limpiar).toBeDefined();
    limpiar?.click();
    expect(consultar).toHaveBeenCalledTimes(3);
    expect(consultar).toHaveBeenLastCalledWith(0, 20, {});
  });
});
