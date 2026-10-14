import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PrivacidadService } from '../../core/services/privacidad.service';
import { Transaccion } from '../../core/models/finanzas.models';
import { TransaccionesComponent } from './transacciones.component';

describe('TransaccionesComponent history filters', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TransaccionesComponent>>;
  let finanzasService: {
    getCuentas: ReturnType<typeof vi.fn>;
    getCategorias: ReturnType<typeof vi.fn>;
    getTransaccionesPaginadas: ReturnType<typeof vi.fn>;
    eliminarTransaccion: ReturnType<typeof vi.fn>;
    crearTransaccion: ReturnType<typeof vi.fn>;
    actualizarTransaccion: ReturnType<typeof vi.fn>;
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
      eliminarTransaccion: vi.fn(() => of({ success: true, message: '', data: undefined })),
      crearTransaccion: vi.fn(),
      actualizarTransaccion: vi.fn()
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
        { provide: PerfilService, useValue: { alternarOcultarMontos: () => TestBed.inject(PrivacidadService).alternarLocal() } },
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

  it('conserva los resultados nuevos cuando una búsqueda anterior responde tarde', () => {
    const antigua = new Subject<any>(), reciente = new Subject<any>();
    finanzasService.getTransaccionesPaginadas.mockReturnValueOnce(antigua).mockReturnValueOnce(reciente);
    const component = fixture.componentInstance;
    component.setTipoFiltro('GASTO');component.setTipoFiltro('INGRESO');
    reciente.next({success:true,data:{content:[{id:2,tipo:'INGRESO',fecha:'2026-10-13'}],totalElements:1}});
    antigua.next({success:true,data:{content:[{id:1,tipo:'GASTO',fecha:'2026-10-12'}],totalElements:1}});
    expect(component.pageData()?.content.map(m=>m.id)).toEqual([2]);
    expect(component.loading()).toBe(false);
  });

  it('conserva descripción y notas al editar solamente el monto', () => {
    const component=fixture.componentInstance;
    finanzasService.actualizarTransaccion.mockReturnValue(new Subject());
    component.abrirModalEditar({id:7,cuentaId:1,cuentaNombre:'Efectivo',categoriaId:10,tipo:'GASTO',monto:20,moneda:'MXN',fecha:'2026-10-13',descripcion:'Cena con amigos',notas:'Sin picante',fechaCreacion:'2026-10-13T12:00:00'});
    component.formMonto=25;component.guardarMovimiento();
    expect(finanzasService.actualizarTransaccion).toHaveBeenCalledWith(7,expect.objectContaining({monto:25,descripcion:'Cena con amigos',notas:'Sin picante',categoriaId:10}));
  });
  it('no repite saldos iniciales, cashback, cuotas MSI ni cuentas eliminadas',()=>{
    const component=fixture.componentInstance;
    const base={id:1,tipo:'GASTO',cuentaId:1,cuentaNombre:'Banco',monto:25,moneda:'MXN',fecha:'2020-01-01',descripcion:'Cena',fechaCreacion:'2020-01-01T12:00:00'} as Transaccion;
    const escuchar=vi.fn();window.addEventListener('kaptal-abrir-registro-rapido',escuchar);
    try {
      for(const cambio of [{tipo:'SALDO_INICIAL'},{cashbackAutomatico:true},{compraMsiId:'msi'},{cuentaId:null},{tipo:'TRANSFERENCIA',cuentaDestinoId:null}])component.repetirMovimiento({...base,...cambio} as Transaccion);
      expect(escuchar).not.toHaveBeenCalled();
    }finally{window.removeEventListener('kaptal-abrir-registro-rapido',escuchar);}
  });

  it('quita solo una categoría y conserva búsqueda, cuenta y el resto de los filtros', () => {
    const component=fixture.componentInstance;
    (TestBed.inject(ActivatedRoute).snapshot.queryParamMap as unknown as URLSearchParams).set('categoriaId','10');
    component.filtroBusqueda.set('tacos');component.filtroBusquedaInput.set('tacos');
    component.filtroCuentaId.set(4);component.filtroCategoriaIds.set([10,20]);component.filtroMontoMin.set(5);component.paginaActual.set(2);
    component.quitarFiltro(component.filtrosVisibles().find(f=>f.categoriaId===10)!);
    expect(component.filtroCategoriaIds()).toEqual([20]);
    expect(component.filtroBusquedaInput()).toBe('tacos');expect(component.filtroCuentaId()).toBe(4);
    expect(component.filtroMontoMin()).toBe(5);expect(component.paginaActual()).toBe(0);
    expect(finanzasService.getTransaccionesPaginadas).toHaveBeenLastCalledWith(expect.objectContaining({busqueda:'tacos',categoriaIds:[20],cuentaId:4,montoMin:5}),0,15);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([],expect.objectContaining({queryParams:{categoriaId:null},queryParamsHandling:'merge',replaceUrl:true}));
  });

  it('bloquea el doble envío y reintenta el mismo gasto tras una respuesta incierta', () => {
    const component=fixture.componentInstance;
    const primera=new Subject();
    finanzasService.crearTransaccion.mockReturnValue(primera);
    component.abrirModal('GASTO');
    component.formMonto=25;component.formCuentaId=1;component.formCategoriaId=10;
    component.guardarMovimiento();component.guardarMovimiento();
    expect(finanzasService.crearTransaccion).toHaveBeenCalledOnce();
    const [payload,key]=finanzasService.crearTransaccion.mock.calls[0];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    component.cerrarModal();expect(component.modalAbierto()).toBe(true);
    primera.error({status:0});
    component.cambiarTipoModal('INGRESO');
    expect(component.formTipo()).toBe('GASTO');
    component.abrirRegistroManual(new CustomEvent('registro', {detail:{monto:999,tipo:'INGRESO'}}));
    expect(component.formMonto).toBe(25);
    component.cerrarModal();component.abrirModal('GASTO');
    expect(component.movimientoIncierto()).toBe(true);
    finanzasService.crearTransaccion.mockReturnValue(new Subject());
    component.guardarMovimiento();
    expect(finanzasService.crearTransaccion.mock.calls[1]).toEqual([payload,key]);
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
