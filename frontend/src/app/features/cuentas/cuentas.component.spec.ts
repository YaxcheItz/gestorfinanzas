import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Cuenta } from '../../core/models/finanzas.models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { creditoDisponibleCuenta, deudaActualCuenta, resumenCuentaSelector } from '../../core/utils/cuenta-financiera';
import { CuentasComponent } from './cuentas.component';

describe('CuentasComponent', () => {
  const cuenta: Cuenta = {
    id: 3,
    nombre: 'Ahorro',
    tipo: 'AHORRO',
    saldoActual: 1200,
    moneda: 'MXN',
    descripcion: 'Fondo',
    activo: true,
    fechaCreacion: '2026-01-01'
  };

  let finanzasService: {
    getCuentas: ReturnType<typeof vi.fn>;
    crearCuenta: ReturnType<typeof vi.fn>;
    actualizarCuenta: ReturnType<typeof vi.fn>;
    desactivarCuenta: ReturnType<typeof vi.fn>;
    eliminarCuenta: ReturnType<typeof vi.fn>;
  };
  let component: CuentasComponent;

  beforeEach(() => {
    finanzasService = {
      getCuentas: vi.fn(() => of({ success: true, message: '', data: [cuenta] })),
      crearCuenta: vi.fn(() => of({ success: true, message: '', data: cuenta })),
      actualizarCuenta: vi.fn(() => of({ success: true, message: '', data: cuenta })),
      desactivarCuenta: vi.fn(() => of({ success: true, message: '', data: undefined })),
      eliminarCuenta: vi.fn(() => of({ success: true, message: '', data: undefined }))
    };

    TestBed.configureTestingModule({
      imports: [CuentasComponent],
      providers: [
        // El componente importa RouterLink, que necesita el router y la ruta
        // activa aunque la prueba no navegue a ningun lado.
        provideRouter([]),
        { provide: FinanzasService, useValue: finanzasService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn(() => Promise.resolve(true)) } }
      ]
    });

    component = TestBed.createComponent(CuentasComponent).componentInstance;
  });

  it('creates an account with the optional opening balance', () => {
    component.nombre = '  Fondo  ';
    component.tipo = 'AHORRO';
    component.institucionFinanciera = 'bbva';
    component.saldoInicial = 250;

    component.guardar();

    expect(finanzasService.crearCuenta).toHaveBeenCalledWith({
      nombre: 'Fondo',
      tipo: 'AHORRO',
      institucionFinanciera: 'bbva',
      moneda: 'MXN',
      saldoInicial: 250
    });
  });

  it('offers Mexican financial institutions and uses the selected institution name when blank', () => {
    expect(component.instituciones.length).toBeGreaterThanOrEqual(10);
    expect(component.tiposCuenta.map(tipo => tipo.valor)).not.toContain('DEBITO');
    expect(component.tiposCuenta.map(tipo => tipo.valor)).toContain('INVERSION');
    expect(component.instituciones.map(institucion => institucion.nombre)).toEqual(
      expect.arrayContaining(['Revolut', 'Sears', 'American Express'])
    );
    component.seleccionarInstitucion('nu');

    expect(component.nombre).toBe('Nu México');
    expect(component.institucionSeleccionada()).toMatchObject({ siglas: 'nu', color: '#820AD1' });
  });

  it('updates account details without allowing a manual balance change', () => {
    component.abrirEditar(cuenta);
    component.nombre = 'Ahorro actualizado';
    component.cashbackPorcentaje = 2.5;
    component.cashbackLimiteMensual = 300;

    component.guardar();

    expect(finanzasService.actualizarCuenta).toHaveBeenCalledWith(3, {
      nombre: 'Ahorro actualizado',
      tipo: 'AHORRO',
      moneda: 'MXN',
      descripcion: 'Fondo'
    });
  });

  it('keeps the account type and institution read-only when editing', () => {
    const fixture = TestBed.createComponent(CuentasComponent);
    fixture.componentInstance.abrirEditar({
      ...cuenta,
      tipo: 'CREDITO',
      institucionFinanciera: 'santander',
      limiteCredito: 25000,
      diaCorte: 10,
      diaPago: 20,
      cashbackPorcentaje: 0
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#cuenta-tipo')).toBeNull();
    expect(fixture.nativeElement.querySelector('#cuenta-institucion')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('El tipo no se puede cambiar');
    expect(fixture.nativeElement.textContent).toContain('La institución no se puede cambiar');
  });

  it('shows cashback settings only after selecting a credit card', () => {
    const defaultFixture = TestBed.createComponent(CuentasComponent);
    defaultFixture.componentInstance.abrirCrear();
    defaultFixture.detectChanges();
    expect(defaultFixture.nativeElement.querySelector('.cashback-benefit-panel')).toBeNull();

    const creditFixture = TestBed.createComponent(CuentasComponent);
    creditFixture.componentInstance.abrirCrear();
    creditFixture.componentInstance.tipo = 'CREDITO';
    creditFixture.detectChanges();
    expect(creditFixture.nativeElement.querySelector('.cashback-benefit-panel')).not.toBeNull();
  });

  it('creates a credit card with its limit, statement days, and current debt', () => {
    component.nombre = 'Santander';
    component.tipo = 'CREDITO';
    component.limiteCredito = 25000;
    component.diaCorte = 10;
    component.diaPago = 1;
    component.cashbackPorcentaje = 2.5;
    component.cashbackLimiteMensual = 300;
    component.saldoInicial = 3500;

    component.guardar();

    expect(finanzasService.crearCuenta).toHaveBeenCalledWith({
      nombre: 'Santander',
      tipo: 'CREDITO',
      limiteCredito: 25000,
      diaCorte: 10,
      diaPago: 1,
      cashbackPorcentaje: 2.5,
      cashbackLimiteMensual: 300,
      saldoInicial: 3500,
      moneda: 'MXN'
    });
  });

  it('saves zero cashback by default on a credit card', () => {
    component.abrirCrear();
    component.nombre = 'Tarjeta';
    component.tipoCuentaCambio('CREDITO');
    component.limiteCredito = 10000;
    component.diaCorte = 10;
    component.diaPago = 20;

    component.guardar();

    expect(finanzasService.crearCuenta).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'CREDITO',
      limiteCredito: 10000,
      diaCorte: 10,
      diaPago: 20,
      cashbackPorcentaje: 0
    }));
  });

  it('requires a positive credit limit and validates the statement days', () => {
    component.nombre = 'Tarjeta';
    component.tipo = 'CREDITO';

    component.guardar();
    expect(component.modalError()).toContain('límite de crédito');
    expect(finanzasService.crearCuenta).not.toHaveBeenCalled();

    component.limiteCredito = 10000;
    component.diaPago = 1;
    component.diaCorte = null;
    component.guardar();
    expect(component.modalError()).toContain('día de corte');

    component.diaCorte = 32;
    component.diaPago = 1;
    component.guardar();
    expect(component.modalError()).toContain('día de corte');
    expect(finanzasService.crearCuenta).not.toHaveBeenCalled();
  });

  it('uses the estimated payment date when a payment day has not been entered', () => {
    component.nombre = 'Tarjeta';
    component.tipo = 'CREDITO';
    component.limiteCredito = 10000;
    component.diaCorte = 10;
    component.diaPago = null;
    vi.spyOn(component, 'proximaFechaPago').mockReturnValue(new Date(2026, 9, 30));

    component.guardar();

    expect(component.modalError()).toBeNull();
    expect(finanzasService.crearCuenta).toHaveBeenCalledWith(expect.objectContaining({
      diaCorte: 10,
      diaPago: 30
    }));
  });

  it('rejects a credit limit below the current or opening debt', () => {
    component.nombre = 'Tarjeta nueva';
    component.tipo = 'CREDITO';
    component.limiteCredito = 1000;
    component.diaCorte = 10;
    component.diaPago = 20;
    component.saldoInicial = 1200;

    component.guardar();
    expect(component.modalError()).toContain('menor que la deuda actual');
    expect(finanzasService.crearCuenta).not.toHaveBeenCalled();

    component.abrirEditar({
      ...cuenta,
      tipo: 'CREDITO',
      saldoActual: -3500,
      limiteCredito: 5000,
      diaCorte: 10,
      diaPago: 20,
      cashbackPorcentaje: 0
    });
    component.limiteCredito = 3000;
    component.guardar();
    expect(component.modalError()).toContain('menor que la deuda actual');
    expect(finanzasService.actualizarCuenta).not.toHaveBeenCalled();
  });

  it('shows debt and available credit using the signed card balance', () => {
    const tarjeta: Cuenta = {
      ...cuenta,
      tipo: 'CREDITO',
      saldoActual: -750,
      limiteCredito: 2000
    };

    expect(deudaActualCuenta(tarjeta)).toBe(750);
    expect(creditoDisponibleCuenta(tarjeta)).toBe(1250);
    expect(resumenCuentaSelector(tarjeta)).toContain('Disponible');
  });

  it('tapa el resumen de la cuenta cuando se pide privacidad', () => {
    const tarjeta: Cuenta = {
      ...cuenta,
      tipo: 'CREDITO',
      saldoActual: -750,
      limiteCredito: 2000
    };

    expect(resumenCuentaSelector(tarjeta, true)).toBe('•••');
    expect(resumenCuentaSelector(tarjeta, false)).toContain('1,250');
  });

  it('treats existing debit accounts as investments when editing', () => {
    component.abrirEditar({ ...cuenta, tipo: 'DEBITO' });

    expect(component.tipo).toBe('DEBITO');
    expect(component.tipoCuentaLabel('DEBITO')).toBe('Inversión');
  });

  it('rejects a cashback limit without an active cashback percentage', () => {
    component.nombre = 'Tarjeta';
    component.tipo = 'CREDITO';
    component.limiteCredito = 10000;
    component.cashbackLimiteMensual = 100;

    component.guardar();

    expect(component.modalError()).toContain('porcentaje de cashback');
    expect(finanzasService.crearCuenta).not.toHaveBeenCalled();
  });

  it('rejects a negative opening balance without calling the API', () => {
    component.nombre = 'Ahorro';
    component.saldoInicial = -1;

    component.guardar();

    expect(component.modalError()).toContain('no puede ser negativo');
    expect(finanzasService.crearCuenta).not.toHaveBeenCalled();
  });

  it('confirms deactivation while preserving the account history', async () => {
    const confirmDialog = TestBed.inject(ConfirmDialogService);

    await component.desactivar(cuenta);

    expect(confirmDialog.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Desactivar cuenta',
      confirmText: 'Desactivar',
      message: expect.stringContaining('El historial se conservará')
    }));
    expect(finanzasService.desactivarCuenta).toHaveBeenCalledWith(cuenta.id);
  });

  it('requires confirmation before permanently deleting an account and preserves transactions', async () => {
    const confirmDialog = TestBed.inject(ConfirmDialogService);
    const toastService = TestBed.inject(ToastService);

    await component.eliminarDefinitivamente({ ...cuenta, saldoActual: 0 });

    expect(confirmDialog.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Eliminar cuenta definitivamente',
      confirmText: 'Eliminar definitivamente',
      message: expect.stringContaining('Los movimientos se conservarán en el historial')
    }));
    expect(finanzasService.eliminarCuenta).toHaveBeenCalledWith(cuenta.id);

    await component.eliminarDefinitivamente({ ...cuenta, saldoActual: -125 });
    expect(toastService.error).toHaveBeenCalledWith(expect.stringContaining('tenga saldo o deuda'));
    expect(finanzasService.eliminarCuenta).toHaveBeenCalledTimes(1);
  });
});
