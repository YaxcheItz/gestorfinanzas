import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfiguracionComponent } from './configuracion.component';

describe('ConfiguracionComponent data safety', () => {
  let fixture!: ReturnType<typeof TestBed.createComponent<ConfiguracionComponent>>;
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
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new URLSearchParams(), fragment: null } } },
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
        { provide: FinanzasService, useValue: finanzas },
        { provide: PerfilService, useValue: perfil },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 7 }), logout: vi.fn(), actualizarUsuario: vi.fn() } },
        { provide: SwPush, useValue: { isEnabled: false, subscription: of(null) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (fixture) fixture.destroy();
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

  it('requests the verified PIN and builds the WhatsApp deep link for the configured bot', () => {
    const component = fixture.componentInstance;

    component.generarPinWhatsApp();
    fixture.detectChanges();

    expect(finanzas.obtenerPinVinculacionWhatsApp).toHaveBeenCalledOnce();
    expect(component.pinCodigo()).toBe('123456');
    expect(component.enlaceWhatsApp()).toContain('https://wa.me/5219515791240?text=');
    expect(decodeURIComponent(component.enlaceWhatsApp())).toContain('VINCULAR 123456');
  });
});
