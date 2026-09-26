import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Cuenta } from '../../core/models/finanzas.models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
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
  };
  let component: CuentasComponent;

  beforeEach(() => {
    finanzasService = {
      getCuentas: vi.fn(() => of({ success: true, message: '', data: [cuenta] })),
      crearCuenta: vi.fn(() => of({ success: true, message: '', data: cuenta })),
      actualizarCuenta: vi.fn(() => of({ success: true, message: '', data: cuenta })),
      desactivarCuenta: vi.fn(() => of({ success: true, message: '', data: undefined }))
    };

    TestBed.configureTestingModule({
      imports: [CuentasComponent],
      providers: [
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
    component.saldoInicial = 250;

    component.guardar();

    expect(finanzasService.crearCuenta).toHaveBeenCalledWith({
      nombre: 'Fondo',
      tipo: 'AHORRO',
      moneda: 'MXN',
      saldoInicial: 250
    });
  });

  it('updates account details without allowing a manual balance change', () => {
    component.abrirEditar(cuenta);
    component.nombre = 'Ahorro actualizado';
    component.saldoInicial = 9999;

    component.guardar();

    expect(finanzasService.actualizarCuenta).toHaveBeenCalledWith(3, {
      nombre: 'Ahorro actualizado',
      tipo: 'AHORRO',
      moneda: 'MXN',
      descripcion: 'Fondo'
    });
  });

  it('rejects a negative opening balance without calling the API', () => {
    component.nombre = 'Ahorro';
    component.saldoInicial = -1;

    component.guardar();

    expect(component.modalError()).toContain('no puede ser negativo');
    expect(finanzasService.crearCuenta).not.toHaveBeenCalled();
  });

  it('confirms the impact of deactivation and preserves the account history', async () => {
    const confirmDialog = TestBed.inject(ConfirmDialogService);

    await component.desactivar(cuenta);

    expect(confirmDialog.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Desactivar cuenta',
      message: expect.stringContaining('dejará de incluirse en el balance total')
    }));
    expect(finanzasService.desactivarCuenta).toHaveBeenCalledWith(cuenta.id);
  });
});
