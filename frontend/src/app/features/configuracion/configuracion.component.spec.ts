import { WhatsappConnectionService } from '../../core/services/whatsapp-connection.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { Observable, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfiguracionComponent } from './configuracion.component';

describe('ConfiguracionComponent data safety', () => {
  let fixture!: ReturnType<typeof TestBed.createComponent<ConfiguracionComponent>>;
  let push: { isEnabled: boolean; subscription: Observable<PushSubscription | null>; requestSubscription: ReturnType<typeof vi.fn> };
  let finanzas: {
    getPlantillasRecurrentes: ReturnType<typeof vi.fn>;
    getConfiguracionPush: ReturnType<typeof vi.fn>;
    exportarTransaccionesCsv: ReturnType<typeof vi.fn>;
    obtenerPinVinculacionWhatsApp: ReturnType<typeof vi.fn>;
  };
  let perfil: {
    perfil: ReturnType<typeof signal>;
    error: ReturnType<typeof signal>;
    cargando: ReturnType<typeof signal>;
    esTemaAutomatico: ReturnType<typeof vi.fn>;
    configurarTema: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    eliminarCuenta: ReturnType<typeof vi.fn>;
    limpiar: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    push = { isEnabled: true, subscription: of(null), requestSubscription: vi.fn() };
    finanzas = {
      getPlantillasRecurrentes: vi.fn(() => of({ success: true, message: '', data: [] })),
      getConfiguracionPush: vi.fn(() => of({ success: true, message: '', data: { configurado: false } })),
      exportarTransaccionesCsv: vi.fn(() => of({ body: new Blob(['fecha,monto']), headers: null })),
      obtenerPinVinculacionWhatsApp: vi.fn(() => of({
        success: true, message: '', data: { pin: '123456', vigenciaSegundos: 600, numeroBot: '5219515791240' }
      }))
    };
    perfil = {
      perfil: signal({ id: 7, nombre: 'Ana', email: 'ana@example.com', tema: 'CLARO', monedaPredeterminada: 'MXN', telefono: '+5219515791234' }),
      error: signal(null),
      cargando: signal(false),
      esTemaAutomatico: vi.fn(() => false),
      configurarTema: vi.fn(),
      actualizar: vi.fn(() => of({ success: true, message: '', data: { id: 7, nombre: 'Ana', email: 'ana@example.com' } })),
      eliminarCuenta: vi.fn(() => of({ success: true, message: '', data: undefined })),
      limpiar: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        {provide: WhatsappConnectionService, useValue: {estado: () => of({success:true,data:{disponible:false,operativo:false,estado:'DESCONECTADA'}})}},
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new URLSearchParams(), fragment: null } } },
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
        { provide: FinanzasService, useValue: finanzas },
        { provide: PerfilService, useValue: perfil },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 7 }), logout: vi.fn(), actualizarUsuario: vi.fn() } },
        { provide: SwPush, useValue: push }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (fixture) fixture.destroy();
  });

  it('no solicita permisos al abrir configuración ni si faltan claves del servidor', async () => {
    await fixture.whenStable();
    await fixture.componentInstance.activarPush();
    expect(push.requestSubscription).not.toHaveBeenCalled();
  });

  it('tener Web Push configurado no solicita permiso sin una acción del usuario', async () => {
    finanzas.getConfiguracionPush.mockReturnValue(of({ success: true, data: { configurado: true, clavePublica: 'public-key' } }));
    fixture.destroy();
    fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.pushConfigurado()).toBe(true);
    expect(push.requestSubscription).not.toHaveBeenCalled();
  });

  it('si se deniega el permiso conserva los avisos desactivados y permite reintentar', async () => {
    finanzas.getConfiguracionPush.mockReturnValue(of({ success: true, data: { configurado: true, clavePublica: 'public-key' } }));
    fixture.componentInstance.pushConfigurado.set(true);
    push.requestSubscription.mockRejectedValue(new DOMException('Permiso denegado', 'NotAllowedError'));
    await fixture.componentInstance.activarPush();
    expect(push.requestSubscription).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.pushActivo()).toBe(false);
    expect(fixture.componentInstance.guardandoPush()).toBe(false);
    expect(TestBed.inject(ToastService).error).toHaveBeenCalledWith('No se pudieron activar los avisos.');
  });

  it('does not delete the account unless the exact confirmation word is entered', () => {
    const component = fixture.componentInstance;
    component.entiendoBorrado = true;
    component.passwordBorrado = 'password123';
    component.palabraBorrado = 'ELIMINA';

    component.eliminarCuenta();

    expect(perfil.eliminarCuenta).not.toHaveBeenCalled();
    component.palabraBorrado = 'ELIMINAR';
    component.eliminarCuenta();
    expect(perfil.eliminarCuenta).toHaveBeenCalledWith({ password: 'password123' });
  });

  it('exports all transactions as a shareable CSV file', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(window.navigator, 'canShare', { configurable: true, value: () => true });

    await fixture.componentInstance.exportarCsv();

    expect(finanzas.exportarTransaccionesCsv).toHaveBeenCalledWith();
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Movimientos de Kaptal',
      files: [expect.any(File)]
    }));
    Reflect.deleteProperty(window.navigator, 'share');
    Reflect.deleteProperty(window.navigator, 'canShare');
  });

  it('uses the dedicated account connection instead of the old PIN control', () => {
    expect(fixture.nativeElement.querySelector('app-whatsapp-connection')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Obtener PIN');
  });
});
