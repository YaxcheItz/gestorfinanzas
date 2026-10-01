import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PrivacidadService } from '../../core/services/privacidad.service';
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
        { provide: PerfilService, useValue: { perfil: signal(null) } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });
    await TestBed.compileComponents();
  });

  it('moves focus into the dialog, traps Tab, and restores focus on Escape', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const opener = Array.from(
      fixture.nativeElement.querySelectorAll('app-acciones-movimiento button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Gasto')) as HTMLButtonElement;
    opener.focus();
    opener.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLDivElement;
    const closeButton = dialog.querySelector('[aria-label="Cerrar formulario de movimiento"]') as HTMLButtonElement;
    const submitButton = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(dialog.querySelector('#monto'));

    opener.focus();
    opener.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(closeButton);

    closeButton.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(submitButton);

    submitButton.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(closeButton);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(opener);
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
      (fixture.nativeElement.querySelector('#categoriaId') as HTMLElement | null)?.textContent ?? '';

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

      expect(mosaicoDe(fixture)).toContain('Transporte');
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

  it('announces analytics loading and errors and exposes chart values in a data table', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.analiticaLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Cargando analítica');

    component.analiticaLoading.set(false);
    component.analiticaError.set('No se pudo cargar la analítica financiera.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');

    component.analiticaError.set(null);
    component.analitica.set({
      gastosPorCategoria: [{
        categoriaId: 1,
        categoriaNombre: 'Alimentos',
        monto: 4321,
        moneda: 'MXN'
      }],
      ultimosSeisMeses: [{
        anio: 2026,
        mes: 4,
        ingresos: 12500,
        gastos: 4321,
        moneda: 'MXN'
      }]
    });
    component.monedaAnalitica.set('MXN');
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    expect(table.textContent).toContain('abr 2026');
    expect(table.textContent).toContain('Ingresos');
    expect(table.textContent).toContain('Gastos');
    expect(table.textContent).toContain('12,500.00');
    expect(fixture.nativeElement.querySelector('ul[aria-label="Gastos por categoría e importe"]')?.textContent)
      .toContain('Alimentos');
  });

  it('no deja los importes al descubierto en los title de las barras cuando se pide privacidad', () => {
    const privacidad = TestBed.inject(PrivacidadService);
    privacidad.aplicar(1, false);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.analitica.set({
      gastosPorCategoria: [],
      ultimosSeisMeses: [{
        anio: 2026,
        mes: 4,
        ingresos: 12500,
        gastos: 4321,
        moneda: 'MXN'
      }]
    });
    component.monedaAnalitica.set('MXN');
    fixture.detectChanges();

    const titlesVisibles = Array.from(
      fixture.nativeElement.querySelectorAll('[title]') as NodeListOf<HTMLElement>
    ).map(el => el.getAttribute('title'));
    expect(titlesVisibles.some(t => t?.includes('12,500.00'))).toBe(true);

    privacidad.aplicar(1, true);
    fixture.detectChanges();

    const titlesOcultos = Array.from(
      fixture.nativeElement.querySelectorAll('[title]') as NodeListOf<HTMLElement>
    ).map(el => el.getAttribute('title'));
    expect(titlesOcultos.some(t => t?.includes('12,500.00'))).toBe(false);
    expect(titlesOcultos.some(t => t?.includes('•••'))).toBe(true);

    privacidad.limpiar();
  });

  it('muestra el saldo, los ingresos y los gastos del mes en una sola tarjeta', () => {
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

    const controlFinanciero = fixture.nativeElement.querySelector('[aria-label="Control Financiero"]') as HTMLElement;
    expect(controlFinanciero).toBeTruthy();
    expect(controlFinanciero.textContent).toContain('12,500');
    expect(controlFinanciero.textContent).toContain('2 cuentas activas');

    // Los montos largos se parten antes de desbordar la tarjeta.
    expect(controlFinanciero.querySelector('.dashboard-summary-amount')).toBeTruthy();
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

      const fecha = modal.querySelector('#fecha') as HTMLInputElement;
      expect(fecha.getAttribute('type')).toBe('date');
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

    it('abre el desplegable de las cuentas a todo el ancho del modal', async () => {
      const { fixture } = await abrirModal('TRANSFERENCIA');

      (fixture.nativeElement.querySelector('#cuentaId') as HTMLElement).click();
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const panel = modal.querySelector('#cuentaId-opciones') as HTMLElement;
      // Sin esto el panel mide media fila y los nombres largas se salen.
      expect(panel.className).toContain('col-span-full');
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
