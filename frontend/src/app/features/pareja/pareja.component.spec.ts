import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParejaComponent } from './pareja.component';
import { ParejaService } from '../../core/services/pareja.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError, Subject } from 'rxjs';
import { ApiResponse } from '../../core/models/auth.models';
import { Pareja } from '../../core/models/pareja.models';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ParejaComponent', () => {
  let component: ParejaComponent;
  let fixture: ComponentFixture<ParejaComponent>;
  let parejaServiceMock: any;
  let toastServiceMock: any;
  let confirmDialogServiceMock: any;

  const mockPareja: Pareja = {
    id: 1,
    moneda: 'MXN',
    fechaCreacion: new Date().toISOString(),
    yo: { id: 10, nombre: 'Ana', email: 'ana@example.com', aportado: 500, consumido: 200, pagado: 0, cobrado: 0, saldo: 300 },
    pareja: { id: 11, nombre: 'Luis', email: 'luis@example.com', aportado: 300, consumido: 200, pagado: 0, cobrado: 0, saldo: 100 },
    resumen: { fondoDisponible: 400, totalAportado: 800, totalGastado: 400, cantidadAportes: 1, cantidadGastos: 1, cantidadPagos: 0, idQuienDebe: null, montoDeuda: 0 },
    aportes: [],
    gastos: [],
    pagos: []
  };

  beforeEach(async () => {
    parejaServiceMock = {
      obtener: vi.fn().mockReturnValue(of({ success: true, data: null, message: '' })),
      invitaciones: vi.fn().mockReturnValue(of({ success: true, data: [], message: '' })),
      historiales: vi.fn().mockReturnValue(of({ success: true, data: [], message: '' })),
      historial: vi.fn().mockReturnValue(of({ success: true, data: {...mockPareja,activa:false}, message: '' })),
      aceptar: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      resolverInvitacion: vi.fn().mockReturnValue(of({ success: true, data: null, message: '' })),
      crear: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      agregarAporte: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      eliminarAporte: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      agregarGasto: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      eliminarGasto: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      registrarPago: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      eliminarPago: vi.fn().mockReturnValue(of({ success: true, data: mockPareja, message: '' })),
      desvincular: vi.fn().mockReturnValue(of({ success: true, data: null, message: '' }))
    };
    toastServiceMock = {
      show: vi.fn(),
      error: vi.fn()
    };
    confirmDialogServiceMock = {
      confirm: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ParejaComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: ParejaService, useValue: parejaServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ParejaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Carga de datos', () => {
    it('should load couple data on init', () => {
      const apiResponse: ApiResponse<Pareja | null> = { success: true, data: mockPareja, message: '' };
      parejaServiceMock.obtener.mockReturnValue(of(apiResponse));

      component.cargar();

      expect(component.pareja()).toBe(mockPareja);
      expect(component.cargando()).toBe(false);
    });

    it('should handle error when loading couple data', () => {
      parejaServiceMock.obtener.mockReturnValue(throwError(() => new Error('Error de red')));

      component.cargar();

      expect(component.error()).not.toBeNull();
      expect(component.cargando()).toBe(false);
    });
  });

  describe('Vinculación', () => {
    it('envía una invitación sin activar el vínculo', () => {
      const invitacion = {id:1,remitenteNombre:'Ana',remitenteEmail:'ana@example.com',destinatarioEmail:'luis@example.com',recibida:false,moneda:'MXN',fechaCreacion:''};
      const apiResponse = { success: true, data: invitacion, message: 'Ok' };
      parejaServiceMock.crear.mockReturnValue(of(apiResponse));

      component.correoPareja = 'luis@example.com';
      component.vincular();

      expect(parejaServiceMock.crear).toHaveBeenCalledWith({ email: 'luis@example.com' });
      expect(component.pareja()).toBeNull();
      expect(component.invitaciones()).toEqual([invitacion]);
      expect(toastServiceMock.show).toHaveBeenCalledWith('success', 'Invitación enviada; falta que la otra persona acepte');
    });
  });

  describe('Gestión de Movimientos', () => {
    beforeEach(() => {
      component.pareja.set(mockPareja);
    });

    it('should open the contribution form', () => {
      component.abrir('aporte');
      expect(component.formulario()).toBe('aporte');
      expect(component.formMonto).toBeNull();
    });

    it('should open the expense form', () => {
      component.abrir('gasto');
      expect(component.formulario()).toBe('gasto');
      expect(component.formTipoReparto).toBe('IGUAL');
    });

    it('should validate expense form correctly for PORCENTAJE', () => {
      component.abrir('gasto');
      component.formMonto = 100;
      component.formDescripcion = 'Cena';
      component.formTipoReparto = 'PORCENTAJE';

      expect(component.puedeGuardar()).toBe(false);

      component.formPorcentaje = 30;
      expect(component.puedeGuardar()).toBe(true);

      component.formPorcentaje = 110;
      expect(component.puedeGuardar()).toBe(false);
    });

    it('should validate expense form correctly for EXACTO', () => {
      component.abrir('gasto');
      component.formMonto = 100;
      component.formDescripcion = 'Cena';
      component.formTipoReparto = 'EXACTO';

      expect(component.puedeGuardar()).toBe(false);

      component.formExacto = 40;
      expect(component.puedeGuardar()).toBe(true);

      component.formExacto = 110;
      expect(component.puedeGuardar()).toBe(false);
    });

    it('should successfully add a contribution', () => {
      const apiResponse: ApiResponse<Pareja> = { success: true, data: mockPareja, message: 'Ok' };
      parejaServiceMock.agregarAporte.mockReturnValue(of(apiResponse));

      component.abrir('aporte');
      component.formMonto = 100;
      component.guardar();

      expect(parejaServiceMock.agregarAporte).toHaveBeenCalled();
      expect(toastServiceMock.show).toHaveBeenCalledWith('success', 'Aporte registrado');
    });
  });

  describe('Desvinculación', () => {
    it('should unlink couple when confirmed', async () => {
      component.pareja.set(mockPareja);
      confirmDialogServiceMock.confirm.mockResolvedValue(true);
      parejaServiceMock.desvincular.mockReturnValue(of({ success: true, data: null, message: '' }));

      await component.desvincular();

      expect(parejaServiceMock.desvincular).toHaveBeenCalledWith(mockPareja.id);
      expect(component.pareja()).toBeNull();
      expect(toastServiceMock.show).toHaveBeenCalledWith('success', 'Pareja desvinculada');
    });

    it('should not unlink when confirmation is denied', async () => {
      component.pareja.set(mockPareja);
      confirmDialogServiceMock.confirm.mockResolvedValue(false);

      await component.desvincular();

      expect(parejaServiceMock.desvincular).not.toHaveBeenCalled();
    });
  });

  it('acepta solo tras confirmar y luego carga el vínculo activo', async () => {
    parejaServiceMock.obtener.mockReturnValue(of({success:true,data:mockPareja,message:''}));
    confirmDialogServiceMock.confirm.mockResolvedValue(true);
    await component.aceptarInvitacion({id:8,recibida:true,remitenteNombre:'Luis',remitenteEmail:'luis@example.com',destinatarioEmail:'ana@example.com',moneda:'MXN',fechaCreacion:''});
    expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
    expect(parejaServiceMock.aceptar).toHaveBeenCalledWith(8);
    expect(component.pareja()).toEqual(mockPareja);
  });
  it('cancelar la confirmación de aceptación no envía una petición', async () => {
    confirmDialogServiceMock.confirm.mockResolvedValue(false);
    await component.aceptarInvitacion({id:8,recibida:true,remitenteNombre:'Luis',remitenteEmail:'luis@example.com',destinatarioEmail:'ana@example.com',moneda:'MXN',fechaCreacion:''});
    expect(parejaServiceMock.aceptar).not.toHaveBeenCalled();
    expect(component.ocupado()).toBe(false);
  });
  it('historial de consulta no permite formularios ni borrados', async () => {
    component.verHistorial(1);
    component.abrir('gasto');
    await component.eliminarGasto(4);
    expect(component.formulario()).toBeNull();
    expect(parejaServiceMock.eliminarGasto).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Historial archivado de consulta');
    expect(fixture.nativeElement.textContent).not.toContain('Registrar gasto');
  });
  it('no muestra una deuda ficticia de cero', () => {
    component.pareja.set(mockPareja);
    expect(component.deuda()).toBeNull();
  });
  it('un pago enviado usa pagador y beneficiario distintos y termina el envío síncrono', () => {
    component.pareja.set({...mockPareja,resumen:{...mockPareja.resumen,idQuienDebe:10,montoDeuda:20}});
    component.abrir('pago'); component.formMonto=20; component.guardar();
    expect(parejaServiceMock.registrarPago).toHaveBeenCalledWith(expect.objectContaining({pagadorId:10,beneficiarioId:11}));
    expect(component.ocupado()).toBe(false);
  });
  it('un pago recibido invierte la dirección sin repetir el deudor', () => {
    component.pareja.set({...mockPareja,resumen:{...mockPareja.resumen,idQuienDebe:11,montoDeuda:20}});
    component.abrir('pago'); component.formMonto=20; component.guardar();
    expect(parejaServiceMock.registrarPago).toHaveBeenCalledWith(expect.objectContaining({pagadorId:11,beneficiarioId:10}));
  });
  it('impide doble envío mientras sigue pendiente una respuesta', () => {
    const pendiente=new Subject(); parejaServiceMock.agregarAporte.mockReturnValue(pendiente);
    component.pareja.set(mockPareja); component.abrir('aporte'); component.formMonto=10;
    component.guardar(); component.guardar();
    expect(parejaServiceMock.agregarAporte).toHaveBeenCalledTimes(1);
    pendiente.complete();
  });
  it('el reparto actualiza la vista previa y rechaza partes redondeadas a cero', () => {
    component.abrir('gasto'); component.formDescripcion='Cena'; component.formMonto=100;
    component.formTipoReparto='PORCENTAJE'; component.formPorcentaje=30;
    expect(component.porcentajePropio()).toBe(70);
    component.formPorcentaje=40; expect(component.porcentajePropio()).toBe(60);
    component.formMonto=0.02; component.formPorcentaje=0.01;
    expect(component.puedeGuardar()).toBe(false);
  });
});
