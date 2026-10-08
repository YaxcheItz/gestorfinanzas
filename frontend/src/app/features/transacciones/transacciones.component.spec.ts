import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { Transaccion } from '../../core/models/finanzas.models';
import { TransaccionesComponent } from './transacciones.component';

describe('TransaccionesComponent history filters', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TransaccionesComponent>>;
  let finanzasService: {
    getCuentas: ReturnType<typeof vi.fn>;
    getCategorias: ReturnType<typeof vi.fn>;
    getTransaccionesPaginadas: ReturnType<typeof vi.fn>;
    eliminarTransaccion: ReturnType<typeof vi.fn>;
  };
  let confirm: ReturnType<typeof vi.fn>;

  it('propone el aniversario de febrero sin saltar a marzo', () => {
    const component = fixture.componentInstance;
    component.movimientoRecurrente = true;
    component.frecuenciaRecurrencia = 'ANUAL';
    component.formFecha = '2024-02-29';
    component.actualizarSiguienteFecha();
    expect(component.siguienteFechaRecurrencia).toBe('2025-02-28');
  });

  beforeEach(async () => {
    finanzasService = {
      getCuentas: vi.fn(() => of({ success: true, message: '', data: [] })),
      getCategorias: vi.fn(() => of({ success: true, message: '', data: [] })),
      getTransaccionesPaginadas: vi.fn(() => of({
        success: true,
        message: '',
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 15,
          number: 0,
          first: true,
          last: true,
          empty: true
        }
      })),
      eliminarTransaccion: vi.fn(() => of({ success: true, message: '', data: undefined }))
    };
    confirm = vi.fn().mockResolvedValue(false);

    await TestBed.configureTestingModule({
      imports: [TransaccionesComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new URLSearchParams() } } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: FinanzasService, useValue: finanzasService },
        { provide: CategoriaPreferidaService, useValue: { recordar: vi.fn(), preferida: () => null } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransaccionesComponent);
    fixture.detectChanges();
    finanzasService.getTransaccionesPaginadas.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    fixture.destroy();
  });

  it('debounces free-text searches for 300 ms and queries with the latest value', () => {
    vi.useFakeTimers();
    const component = fixture.componentInstance;

    component.onBusquedaChange('Starbucks');
    vi.advanceTimersByTime(200);
    component.onBusquedaChange('Gasolina');
    vi.advanceTimersByTime(299);

    expect(finanzasService.getTransaccionesPaginadas).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(finanzasService.getTransaccionesPaginadas).toHaveBeenCalledTimes(1);
    expect(finanzasService.getTransaccionesPaginadas.mock.calls[0][0].busqueda).toBe('Gasolina');
  });

  it('applies type, amount range, and multiple categories together', () => {
    const component = fixture.componentInstance;
    component.abrirPanelFiltros();
    component.borradorTipo.set('GASTO');
    component.borradorMontoMin.set(50);
    component.borradorMontoMax.set(500);
    component.alternarCategoriaBorrador(4, true);
    component.alternarCategoriaBorrador(9, true);

    component.aplicarPanelFiltros();

    const filtros = finanzasService.getTransaccionesPaginadas.mock.calls[0][0];
    expect(filtros.tipo).toBe('GASTO');
    expect(filtros.montoMin).toBe(50);
    expect(filtros.montoMax).toBe(500);
    expect(filtros.categoriaIds).toEqual([4, 9]);
    expect(component.panelFiltrosAbierto()).toBe(false);
  });

  it('preserves an existing transfer type while applying other filters', () => {
    const component = fixture.componentInstance;
    component.filtroTipo.set('TRANSFERENCIA');
    component.abrirPanelFiltros();
    component.borradorMontoMin.set(25);

    component.aplicarPanelFiltros();

    expect(finanzasService.getTransaccionesPaginadas.mock.calls[0][0].tipo).toBe('TRANSFERENCIA');
    expect(finanzasService.getTransaccionesPaginadas.mock.calls[0][0].montoMin).toBe(25);
  });

  it('asks for permanent deletion confirmation before deleting a movement', async () => {
    const component = fixture.componentInstance;

    await component.eliminarMovimiento(17);

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('¿Eliminar permanentemente?')
    }));
    expect(finanzasService.eliminarTransaccion).not.toHaveBeenCalled();
  });

  it('shows capture channel and an additional note in movement details', () => {
    const component = fixture.componentInstance;
    const movement: Transaccion = {
      id: 1,
      cuentaId: 2,
      cuentaNombre: 'Efectivo',
      tipo: 'GASTO',
      monto: 125,
      moneda: 'MXN',
      fecha: '2026-06-01',
      descripcion: 'Café',
      notas: 'Capturado por voz. Sin azúcar.',
      metodoCaptura: 'VOZ',
      fechaCreacion: '2026-06-01T15:47:00-06:00'
    };

    expect(component.etiquetaMetodoCaptura(movement)).toBe('Voz');
    expect(component.notaDetalleVisible(movement)).toBe('Capturado por voz. Sin azúcar.');
    expect(component.fechaHoraExacta(movement)).toContain('2026');
    expect(component.etiquetaMetodoCaptura({ ...movement, metodoCaptura: 'WHATSAPP', notas: null })).toBe('WhatsApp');
    expect(component.etiquetaMetodoCaptura({ ...movement, metodoCaptura: 'TEXTO', notas: 'Compra por WhatsApp' })).toBe('Texto');
    expect(component.etiquetaMetodoCaptura({ ...movement, metodoCaptura: null })).toBe('No registrado');
  });

  it('selects initial account and category when they arrive after the manual dialog opens', () => {
    const cuentas = new Subject<any>();
    const categorias = new Subject<any>();
    vi.spyOn(TestBed.inject(FinanzasService), 'getCuentas').mockReturnValue(cuentas);
    vi.spyOn(TestBed.inject(FinanzasService), 'getCategorias').mockReturnValue(categorias);
    const component = fixture.componentInstance;
    component.cargarCuentasYCategorias();
    component.abrirRegistroManual();
    cuentas.next({ success: true, data: [{ id: 4, nombre: 'Efectivo', tipo: 'EFECTIVO', moneda: 'MXN', activo: true }] });
    categorias.next({ success: true, data: [{ id: 8, nombre: 'Comida', tipo: 'GASTO', activo: true }] });
    expect(component.formCuentaId).toBe(4);
    expect(component.formCategoriaId).toBe(8);
  });
});
