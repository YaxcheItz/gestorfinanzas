import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent movement dialog accessibility', () => {
  let crearTransaccion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    crearTransaccion = vi.fn(() => of({ success: true, message: '', data: undefined }));
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: () => null, isAuthenticated: () => true }
        },
        {
          provide: FinanzasService,
          useValue: {
            getDashboardResumen: () => of({
              success: true,
              message: '',
              data: { resumenPorMoneda: [], ultimosMovimientos: [] }
            }),
            getPresupuestos: () => of({ success: true, message: '', data: { presupuestos: [], resumenPorMoneda: [] } }),
            getDashboardAnalitica: () => of({
              success: true,
              message: '',
              data: { gastosPorCategoria: [], ultimosSeisMeses: [] }
            }),
            getDashboardComparacion: () => of({
              success: true,
              message: '',
              data: { mes: 4, anio: 2026, mesAnterior: 3, anioAnterior: 2026, porMoneda: [] }
            }),
            getPlantillasRecurrentes: () => of({ success: true, message: '', data: [] }),
            registrarMovimientoRecurrente: () => of({ success: true, message: '', data: undefined }),
            getCuentas: () => of({ success: true, message: '', data: [] }),
            getCategorias: () => of({ success: true, message: '', data: [] }),
            crearTransaccion
          }
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: PerfilService, useValue: { perfil: signal(null), cargando: signal(false) } },
        { provide: Router, useValue: { navigate: vi.fn(), parseUrl: () => ({ queryParams: {} }) } },
        { provide: ActivatedRoute, useValue: {queryParams:of({})} }
      ]
    });
    await TestBed.compileComponents();
  });

  it('separa efectivo y deuda y muestra presupuesto restante solo en la moneda elegida',()=>{
    const fixture=TestBed.createComponent(DashboardComponent);fixture.detectChanges();const component=fixture.componentInstance;
    component.resumen.set({resumenPorMoneda:[{moneda:'MXN',balanceTotal:600,dineroDisponible:1000,deudaTarjetas:400,ingresosMes:100,gastosMes:25,totalCuentas:2},{moneda:'USD',balanceTotal:200,dineroDisponible:200,deudaTarjetas:0,ingresosMes:50,gastosMes:5,totalCuentas:1}],ultimosMovimientos:[]} as any);
    component.presupuestoResumen.set({presupuestos:[{id:1,moneda:'MXN',categoriaNombre:'Comida',montoLimite:500,montoGastado:200,montoDisponible:300,porcentajeConsumido:40}],resumenPorMoneda:[{moneda:'MXN',totalDisponible:300},{moneda:'USD',totalDisponible:10}]} as any);
    component.vistaDetallada.set(true);fixture.detectChanges();const hero=fixture.nativeElement.querySelector('.dashboard-screen__monthly').textContent;
    expect(hero).toContain('Dinero en cuentas');expect(hero).toContain('1,000');expect(hero).toContain('Deuda de tarjetas');expect(hero).toContain('400');
    expect(component.presupuestoMonedaSeleccionada()?.totalDisponible).toBe(300);
    component.monedaResumen.set('USD');expect(component.presupuestoMonedaSeleccionada()?.totalDisponible).toBe(10);
    fixture.destroy();
  });
  it('oculta tambien la proporcion y valores accesibles del presupuesto al activar privacidad', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.monedaResumen.set('MXN');
    component.vistaDetallada.set(true);
    component.presupuestoResumen.set({ presupuestos: [{ id: 1, moneda: 'MXN', categoriaNombre: 'Comida', montoLimite: 500, montoGastado: 200, montoDisponible: 300, porcentajeConsumido: 40, estado: 'NORMAL' }], resumenPorMoneda: [] } as any);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute('aria-valuenow')).toBe('200');
    expect(bar.style.getPropertyValue('--budget-fill')).toBe('40%');
    component.privacidad.alternarLocal();
    fixture.detectChanges();
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.getAttribute('aria-valuemax')).toBeNull();
    expect(bar.getAttribute('aria-valuetext')).toBe('Importe oculto');
    expect(bar.style.getPropertyValue('--budget-fill')).toBe('0%');
    fixture.destroy();
  });

  it('grafica gastos reales sin exigir presupuesto y oculta las alturas en privacidad', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.gastosCategoria.set([
      { categoriaId: 7, categoriaNombre: 'Comida', moneda: 'MXN', monto: 250 },
      { categoriaId: 8, categoriaNombre: 'Viajes', moneda: 'USD', monto: 900 },
      { categoriaId: 9, categoriaNombre: 'Transporte', moneda: 'MXN', monto: 125 }
    ]);
    component.monedaResumen.set('MXN');
    expect(component.categoriasInicio().map(item => item.monto)).toEqual([250, 125]);
    expect(component.categoriasInicio().map(item => item.altura)).toEqual([100, 50]);
    expect(component.categoriasInicio()[0].presupuesto).toBeUndefined();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.home-category__bar-button') as HTMLButtonElement;
    button.click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/transacciones'], { queryParams: { categoriaId: 7, fechaInicio: component.fechasRango().desde, fechaFin: component.fechasRango().hasta } });
    component.privacidad.alternarLocal();
    expect(component.categoriasInicio().every(item => item.altura === 0)).toBe(true);
    fixture.destroy();
  });

  it('abre acciones al mantener pulsado, cancela al desplazar y no navega al soltar', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(DashboardComponent);
    try {
      const component = fixture.componentInstance;
      const categoria = { categoriaId: 7, categoriaNombre: 'Comida', moneda: 'MXN', monto: 20, tono: '#fff', altura: 100, icono: null };
      component.iniciarPresionCategoria({isPrimary: true, button: 0, clientX: 0, clientY: 0} as PointerEvent, categoria);
      component.moverPresionCategoria({clientX: 20, clientY: 0} as PointerEvent);
      vi.advanceTimersByTime(600);
      expect(component.categoriaContextual()).toBeNull();
      component.iniciarPresionCategoria({isPrimary: true, button: 0, clientX: 0, clientY: 0} as PointerEvent, categoria);
      vi.advanceTimersByTime(500);
      expect(component.categoriaContextual()).toEqual(categoria);
      component.cancelarPresionCategoria();
      component.tocarCategoria(categoria);
      expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    } finally { fixture.destroy(); vi.useRealTimers(); }
  });

  it('compacta al salir el hero y desconecta el observador al abandonar Inicio', () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(handler: IntersectionObserverCallback) { callback = handler; }
      observe = observe;
      disconnect = disconnect;
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    try {
      fixture.detectChanges();
      expect(observe).toHaveBeenCalledOnce();
      callback!([{isIntersecting:false,boundingClientRect:{top:-200}}] as IntersectionObserverEntry[], {} as IntersectionObserver);
      expect(fixture.componentInstance.inicioCompacto()).toBe(true);
      callback!([{isIntersecting:true,boundingClientRect:{top:100}}] as IntersectionObserverEntry[], {} as IntersectionObserver);
      expect(fixture.componentInstance.inicioCompacto()).toBe(false);
    } finally { fixture.destroy(); vi.unstubAllGlobals(); }
    expect(disconnect).toHaveBeenCalled();
  });

  it('retries an uncertain request without opening an editable replacement', () => {
    const component=TestBed.createComponent(DashboardComponent).componentInstance;
    const sincronizar=vi.spyOn(component,'sincronizarPendientes').mockResolvedValue(undefined);
    const abrir=vi.spyOn(component,'abrirModal');
    component.revisarPendiente({id:'original',usuarioId:1,payload:{tipo:'GASTO',monto:25},creadoEn:'2026-10-08'} as any);
    expect(sincronizar).toHaveBeenCalledOnce();expect(abrir).not.toHaveBeenCalled();
  });
  it('uses a new UUID for a rejected correction and preserves the original', () => {
    const component=TestBed.createComponent(DashboardComponent).componentInstance;
    const pendiente:any={id:'propuesta:original',usuarioId:1,estado:'REVISAR',payload:{tipo:'GASTO',monto:25,cuentaId:1,fecha:'2026-10-08'},creadoEn:'2026-10-08'};
    component.revisarPendiente(pendiente);
    expect((component as any).formIdempotencyKey).not.toBe(pendiente.id);
    expect((component as any).formIdempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(pendiente.id).toBe('propuesta:original');
    expect(component.modalError()).toContain('Revisa Actividad');
  });

  it('loads today and an anchored calendar week instead of monthly data', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    const resumen = vi.spyOn(TestBed.inject(FinanzasService), 'getDashboardResumen');
    component.seleccionarRango('HOY');
    const hoy = component.fechasRango().hasta;
    expect(resumen.mock.calls.at(-1)?.slice(2)).toEqual([hoy, hoy]);
    component.seleccionarRango('SEMANA');
    const { desde, hasta } = component.fechasRango();
    expect(desde <= hoy && hoy <= hasta).toBe(true);
    expect(new Date(desde + 'T12:00:00Z').getUTCDay()).toBe(1);
    expect(Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000)).toBe(6);
  });

  it('does not change the applied range until valid custom dates are submitted', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    component.seleccionarRango('PERSONALIZADO');
    expect(component.tipoRango()).toBe('MES');
    component.borradorDesde = '2025-02-02';
    component.borradorHasta = '2025-02-01';
    component.aplicarRangoPersonalizado();
    expect(component.errorRango()).toBeTruthy();
    expect(component.tipoRango()).toBe('MES');
    component.borradorHasta = '2025-03-04';
    component.aplicarRangoPersonalizado();
    expect(component.fechasRango()).toEqual({ desde: '2025-02-02', hasta: '2025-03-04' });
    component.seleccionarRango('MES');
    expect(component.periodoEsActual()).toBe(true);
  });

  it('navega catorcenas sin volver al mes y propaga fechas al historial e informe', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    component.seleccionarRango('CATORCENA');
    const actual = component.fechasRango();
    component.cambiarPeriodo(-1);
    const anterior = component.fechasRango();
    expect(component.tipoRango()).toBe('CATORCENA');
    expect(Date.parse(actual.desde) - Date.parse(anterior.desde)).toBe(14 * 86400000);
    component.cambiarPeriodo(1);
    expect(component.fechasRango()).toEqual(actual);
    component.irATransacciones();
    expect(TestBed.inject(Router).navigate).toHaveBeenLastCalledWith(['/transacciones'], { queryParams: { fechaInicio: actual.desde, fechaFin: actual.hasta } });
    component.irAReportes();
    expect(TestBed.inject(Router).navigate).toHaveBeenLastCalledWith(['/reportes'], { queryParams: { desde: actual.desde, hasta: actual.hasta, desdeAnterior: anterior.desde, hastaAnterior: anterior.hasta, sinComparacion: undefined } });
  });

  it('todo el historial desactiva flechas y no inventa una comparacion anterior', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    component.seleccionarRango('TODO');
    expect(component.puedeRetroceder()).toBe(false);
    expect(component.periodoEsActual()).toBe(true);
    const anterior = component.fechasRango();
    component.cambiarPeriodo(-1);
    expect(component.fechasRango()).toEqual(anterior);
    component.irAReportes();
    expect(TestBed.inject(Router).navigate).toHaveBeenLastCalledWith(['/reportes'], { queryParams: { ...anterior, sinComparacion: 'true' } });
  });

  it('aplicar un borrador invalido no cambia el rango ni guarda preferencias', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    const inicial = component.fechasRango();
    component.borradorPeriodo = { tipo: 'QUINCENA', ancla: '2026-01-05', diaInicio: 28, diaQuincena: 31 };
    component.aplicarPeriodo();
    expect(component.errorRango()).toBeTruthy();
    expect(component.fechasRango()).toEqual(inicial);
  });

  it('una consulta temporal no cambia el periodo guardado al volver a cargar el perfil', () => {
    const perfil = signal<any>(null);
    TestBed.overrideProvider(PerfilService, { useValue: { perfil, cargando: signal(false) } });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.componentInstance.seleccionarRango('CATORCENA');
    perfil.set({ id: 7, monedaPredeterminada: 'MXN', periodoPredeterminado: { tipo: 'MES', ancla: '2026-01-05', diaInicio: 20, diaQuincena: 16 } });
    fixture.detectChanges();
    expect(fixture.componentInstance.tipoRango()).toBe('CATORCENA');
    fixture.destroy();
  });

  it('espera el perfil demorado antes de abrir el selector con el periodo guardado', async () => {
    const perfil = signal<any>(null);
    const cargando = signal(true);
    TestBed.overrideProvider(PerfilService, { useValue: { perfil, cargando } });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector('.time-dropdown-btn') as HTMLButtonElement;
    expect(selector.disabled).toBe(true);
    const rangoInicial = fixture.componentInstance.fechasRango();
    fixture.componentInstance.cambiarPeriodo(-1);
    expect(fixture.componentInstance.fechasRango()).toEqual(rangoInicial);
    fixture.componentInstance.toggleModalRango();
    expect(fixture.componentInstance.modalRangoAbierto()).toBe(false);
    perfil.set({ id: 7, monedaPredeterminada: 'MXN', periodoPredeterminado: { tipo: 'CATORCENA', ancla: '2024-02-26', diaInicio: 20, diaQuincena: 16 } });
    cargando.set(false);
    fixture.detectChanges();
    expect(selector.disabled).toBe(false);
    selector.click(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[value="CATORCENA"]') as HTMLInputElement).checked).toBe(true);
    expect((fixture.nativeElement.querySelector('input[name="anclaPeriodo"]') as HTMLInputElement).value).toBe('2024-02-26');
    fixture.destroy();
  });

  it('permite elegir un periodo temporal si la carga inicial del perfil falla', () => {
    const cargando = signal(true);
    TestBed.overrideProvider(PerfilService, { useValue: { perfil: signal(null), cargando } });
    const fixture = TestBed.createComponent(DashboardComponent); fixture.detectChanges();
    cargando.set(false); fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector('.time-dropdown-btn') as HTMLButtonElement;
    expect(selector.disabled).toBe(false);
    selector.click(); fixture.detectChanges();
    expect(fixture.componentInstance.modalRangoAbierto()).toBe(true);
    fixture.destroy();
  });

  it('exposes the selected movement type as a pressed state', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirModal('TRANSFERENCIA');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const buttons = Array.from(dialog.querySelectorAll('button[aria-pressed]')) as HTMLButtonElement[];

    expect(buttons.find(button => button.textContent?.includes('Transferencia'))?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons.find(button => button.textContent?.includes('Gasto'))?.getAttribute('aria-pressed')).toBe('false');
  });

  describe('categoría recordada por tipo', () => {
    const categorias = [
      { id: 1, nombre: 'Comida', tipo: 'GASTO', activo: true, esPersonalizada: false },
      { id: 2, nombre: 'Transporte', tipo: 'GASTO', activo: true, esPersonalizada: false },
      { id: 3, nombre: 'Salario', tipo: 'INGRESO', activo: true, esPersonalizada: false }
    ] as never[];

    const mosaicoDe = (fixture: ReturnType<typeof TestBed.createComponent<DashboardComponent>>) =>
      (fixture.nativeElement.querySelector('app-categoria-selector button') as HTMLElement | null)?.textContent ?? '';

    beforeEach(() => {
      localStorage.clear();
      TestBed.inject(CategoriaPreferidaService).aplicarDesdeCache(7);
    });

    it('abre el gasto con la última categoría usada, no con la primera de la lista', () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();
      fixture.componentInstance.categorias.set(categorias);
      TestBed.inject(CategoriaPreferidaService).recordar('GASTO', 2);

      fixture.componentInstance.abrirModal('GASTO');
      fixture.detectChanges();

      expect(fixture.componentInstance.formCategoriaId).toBe(2);
    });

    it('no arrastra la categoría de un tipo al otro', () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();
      fixture.componentInstance.categorias.set(categorias);
      TestBed.inject(CategoriaPreferidaService).recordar('GASTO', 2);

      fixture.componentInstance.abrirModal('INGRESO');
      fixture.detectChanges();

      expect(mosaicoDe(fixture)).toContain('Salario');
    });

    it('cae a la primera categoría si la recordada ya no existe', () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();
      fixture.componentInstance.categorias.set(categorias);
      TestBed.inject(CategoriaPreferidaService).recordar('GASTO', 99);

      fixture.componentInstance.abrirModal('GASTO');
      fixture.detectChanges();

      expect(mosaicoDe(fixture)).toContain('Comida');
    });

    it('deja prevailecer la categoría explícita de una acción rápida', () => {
      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();
      fixture.componentInstance.categorias.set(categorias);
      TestBed.inject(CategoriaPreferidaService).recordar('GASTO', 2);

      fixture.componentInstance.abrirModal({ tipo: 'GASTO', categoriaId: 1 });
      fixture.detectChanges();

      expect(mosaicoDe(fixture)).toContain('Comida');
    });
  });

  it('muestra categorias y recientes sin presupuestos en la vista simple', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(root.querySelector('.dashboard-screen__actions')).toBeNull();
    expect(root.querySelector('#dashboard-budgets-title')).toBeNull();
    expect(root.querySelector('#home-categories-title')).toBeTruthy();
    expect(root.querySelector('#dashboard-recent-title')).toBeNull();
    expect(root.querySelector('.home-empty')).toBeTruthy();
    expect(text).not.toContain('As? va tu mes');
    expect(text).not.toContain('Tendencia de gastos');
  });

  it('prioriza gasto y revela ingresos y cuentas solo en vista detallada', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.resumen.set({
      balanceTotal: 12500,
      ingresosMes: 15000,
      gastosMes: 2500,
      balanceMes: 12500,
      tasaAhorro: 83.3,
      totalCuentas: 2,
      mes: 4,
      anio: 2026,
      ultimosMovimientos: [],
      resumenPorMoneda: [{
        moneda: 'MXN',
        balanceTotal: 12500,
        ingresosMes: 15000,
        gastosMes: 2500,
        balanceMes: 12500,
        tasaAhorro: 83.3,
        totalCuentas: 2
      }]
    });
    fixture.detectChanges();

    const controlFinanciero = fixture.nativeElement.querySelector('.dashboard-screen__monthly') as HTMLElement;
    expect(controlFinanciero).toBeTruthy();
    expect(controlFinanciero.textContent).toContain('Gastos del periodo');
    expect(controlFinanciero.querySelector('.dashboard-screen__amount')?.textContent).toContain('2,500');
    fixture.componentInstance.vistaDetallada.set(true);
    fixture.detectChanges();
    expect(controlFinanciero.textContent).toContain('12,500');
    expect(controlFinanciero.textContent).toContain('Ingresos');
    expect(controlFinanciero.textContent).toContain('Balance del periodo');
    expect(controlFinanciero.textContent).toContain('2 cuentas');

    // Los montos largos se parten antes de desbordar la tarjeta.
    expect(controlFinanciero.querySelector('.dashboard-screen__amount')).toBeTruthy();
  });

  it('shows only active recurring movements due within the next seven days', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const addDays = (value: string, count: number) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day + count);
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-');
    };
    const plantilla = (id: number, fecha: string, activa = true) => ({
      id,
      cuentaId: 1,
      cuentaNombre: 'Efectivo',
      categoriaId: null,
      categoriaNombre: 'Renta',
      tipo: 'GASTO' as const,
      monto: 100,
      moneda: 'MXN',
      notas: null,
      frecuencia: 'MENSUAL' as const,
      siguienteFecha: fecha,
      activa
    });

    component.plantillasRecurrentes.set([
      plantilla(1, component.fechaHoy()),
      plantilla(2, addDays(component.fechaHoy(), 7)),
      plantilla(3, addDays(component.fechaHoy(), 8)),
      plantilla(4, component.fechaHoy(), false)
    ]);

    expect(component.plantillasPorAtender().map(item => item.id)).toEqual([1, 2]);
  });

  describe('formulario compacto', () => {
    const abrirModal = async (tipo: 'GASTO' | 'TRANSFERENCIA') => {
      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.cuentas.set([
        { id: 1, nombre: 'Efectivo', tipo: 'DEBITO', moneda: 'MXN', activo: true, saldoActual: 1000, fechaCreacion: '2026-01-01' },
        { id: 2, nombre: 'Tarjeta', tipo: 'CREDITO', moneda: 'MXN', activo: true, saldoActual: -500, fechaCreacion: '2026-01-01' }
      ]);
      component.abrirModal(tipo);
      await fixture.whenStable();
      fixture.detectChanges();
      return { fixture, component };
    };

    it('deja la categoría a todo el ancho, no en media fila', async () => {
      const { fixture } = await abrirModal('GASTO');
      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const selector = modal.querySelector('#categoriaId') as HTMLElement;

      // Si la categoría fuera una celda de un `grid-cols-2`, su contenedor mediría
      // la mitad del modal y el mosaico de veinte nombres quedaría estrangulado.
      const contenedor = selector.closest('.min-w-0') as HTMLElement;
      const padre = contenedor.parentElement as HTMLElement;
      expect(padre.className).not.toContain('grid-cols-2');
    });

    it('quita los rótulos "Monto a registrar", "Cuenta" y "Fecha" sin perder el nombre accesible', async () => {
      const { fixture } = await abrirModal('GASTO');
      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

      // Ningún rótulo de campo queda a la vista: los que siguen en el DOM
      // son solo para el lector de pantalla.
      const textoLabels = Array.from(
        modal.querySelectorAll('label, span[id$="-label"]') as NodeListOf<HTMLElement>
      )
        .filter(el => !el.className.includes('sr-only'))
        .map(el => el.textContent?.trim())
        .join(' | ');
      expect(textoLabels).not.toContain('Monto a registrar');
      expect(textoLabels).not.toContain('Cuenta');
      expect(textoLabels).not.toContain('Fecha');

      // Se sustituyen por descripciones solo para tecnología asistiva.
      const monto = modal.querySelector('#monto') as HTMLInputElement;
      expect(monto.getAttribute('aria-label')).toContain('Monto a registrar');

      const fecha = modal.querySelector('#fecha button') as HTMLButtonElement;
      expect(fecha.getAttribute('aria-haspopup')).toBe('dialog');
      const labelFecha = modal.querySelector('label[for="fecha"]') as HTMLElement;
      expect(labelFecha.textContent?.trim()).toBe('Fecha del movimiento');
      expect(labelFecha.className).toContain('sr-only');

      // "Cuenta" sigue enunciando el selector aunque no se pinte.
      const etiquetaCuenta = modal.querySelector('#cuentaId-label') as HTMLElement;
      expect(etiquetaCuenta.className).toContain('sr-only');
    });

    it('deja ver el 0.00 de ejemplo: con placeholder tenue el campo parecía vacío', async () => {
      const { fixture } = await abrirModal('GASTO');
      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const monto = modal.querySelector('#monto') as HTMLInputElement;

      expect(monto.placeholder).toBe('0.00');
      expect(monto.className).not.toContain('placeholder:text-slate-200');
    });

    it('muestra "De" y "Para" en una sola fila con la flecha en columna propia', async () => {
      const { fixture, component } = await abrirModal('TRANSFERENCIA');
      component.formCuentaId = 1;
      component.formCuentaDestinoId = 2;
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const origen = modal.querySelector('#cuentaId') as HTMLElement;
      const destino = modal.querySelector('#cuentaDestinoId') as HTMLElement;

      // El contenedor del grid es el ancestro inmediato de cada app-cuenta-selector.
      const fila = origen.closest('.grid') as HTMLElement;
      expect(destino.closest('.grid')).toBe(fila);
      // Una columna fija para la flecha: es lo que impide que se monte sobre un botón.
      expect(fila.className).toContain('1.5rem');

      const etiquetaOrigen = modal.querySelector('#cuentaId-label') as HTMLElement;
      const etiquetaDestino = modal.querySelector('#cuentaDestinoId-label') as HTMLElement;
      expect(etiquetaOrigen.textContent?.trim()).toBe('De');
      expect(etiquetaDestino.textContent?.trim()).toBe('Para');
    });

    it('muestra solo el nombre de la cuenta en la fila, no el saldo', async () => {
      const { fixture, component } = await abrirModal('TRANSFERENCIA');
      component.formCuentaId = 1;
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const boton = modal.querySelector('#cuentaId') as HTMLElement;
      expect(boton.textContent).toContain('Efectivo');
      expect(boton.textContent).not.toContain('1,000');
      expect(boton.textContent).not.toContain('MXN');

      // El saldo si aparece en el desplegable, que es donde se elige.
      boton.click();
      fixture.detectChanges();
      const opciones = modal.querySelector('#cuentaId-opciones') as HTMLElement;
      expect(opciones.textContent).toContain('Efectivo');
    });

    it('superpone el desplegable a la fila de transferencia sin mover las cuentas', async () => {
      const { fixture } = await abrirModal('TRANSFERENCIA');

      (fixture.nativeElement.querySelector('#cuentaId') as HTMLElement).click();
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const panel = modal.querySelector('#cuentaId-opciones') as HTMLElement;
      expect(panel.className).toContain('absolute');
      expect(panel.className).toContain('w-[calc(200%_+_2.25rem)]');
      (modal.querySelector('#cuentaDestinoId') as HTMLElement).click();
      fixture.detectChanges();
      const panelDestino = modal.querySelector('#cuentaDestinoId-opciones') as HTMLElement;
      expect(panelDestino.className).toContain('right-0');
    });
  });

  describe('meses sin intereses y repetición', () => {
    const cuentas = [
      { id: 1, nombre: 'Efectivo', tipo: 'DEBITO', moneda: 'MXN', activo: true },
      { id: 2, nombre: 'Tarjeta', tipo: 'CREDITO', moneda: 'MXN', activo: true }
    ] as never[];

    const preparar = (cuentaId = 2) => {
      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.cuentas.set(cuentas);
      component.abrirModal('GASTO');
      component.formCuentaId = cuentaId;
      component.formMonto = 1200;
      component.formCategoriaId = 1;
      return { fixture, component };
    };

    it('envía el plazo al servidor: sin esto el MSI se guardaba como gasto completo', () => {
      const { component } = preparar();

      component.alternarMsi(true);
      component.formMsi = 12;
      component.guardarMovimiento();

      expect(crearTransaccion).toHaveBeenCalledTimes(1);
      expect(crearTransaccion.mock.calls[0][0].msi).toBe(12);
      expect(crearTransaccion.mock.calls[0][0].frecuenciaRecurrencia).toBeNull();
    });

    it('no manda MSI si el plazo quedó sin elegir', () => {
      const { component } = preparar();

      component.alternarMsi(true);
      component.formMsi = null;
      component.guardarMovimiento();

      expect(crearTransaccion).not.toHaveBeenCalled();
      expect(component.modalError()).toContain('meses sin intereses');
    });

    it('no manda MSI cuando no está marcado, aunque quede un plazo suelto', () => {
      const { component } = preparar();

      component.formMsi = 6;
      component.guardarMovimiento();

      expect(crearTransaccion.mock.calls[0][0].msi).toBeNull();
    });

    it('rechaza repetir y MSI a la vez: el servidor solo programa una plantilla', () => {
      const { component } = preparar();

      component.alternarRecurrente(true);
      component.alternarMsi(true);

      expect(component.movimientoRecurrente).toBe(false);
      expect(component.esCompraMsi).toBe(true);
    });

    it('apagar MSI deja limpia la repetición', () => {
      const { component } = preparar();

      component.alternarMsi(true);
      component.alternarMsi(false);

      expect(component.esCompraMsi).toBe(false);
      expect(component.formMsi).toBeNull();
      expect(component.siguienteFechaRecurrencia).toBe('');
    });

    it('calcula la siguiente fecha al activar la repetición', () => {
      const { component } = preparar(1);

      component.alternarRecurrente(true);

      expect(component.siguienteFechaRecurrencia).toBeTruthy();
      expect(component.siguienteFechaRecurrencia > component.formFecha).toBe(true);
    });

    it('olvida el MSI al cambiar a una cuenta que no es de crédito', () => {
      const { component } = preparar();

      component.alternarMsi(true);
      component.formMsi = 12;

      component.cambiarCuentaOrigen(1);

      // Si se quedara marcado, el servidor responde "Los MSI solo aplican a
      // gastos con tarjeta de crédito" y el usuario pierde el formulario.
      expect(component.esCompraMsi).toBe(false);
      expect(component.formMsi).toBeNull();
    });

    it('olvida el MSI al salir del tipo gasto', () => {
      const { component } = preparar();

      component.alternarMsi(true);
      component.formMsi = 12;

      component.cambiarTipo('INGRESO');

      expect(component.esCompraMsi).toBe(false);
      expect(component.formMsi).toBeNull();
    });
  });
});
