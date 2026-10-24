import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AutomaticBankComponent } from './automatic-bank';
import { AutomaticBankService } from '../core/services/automatic-bank';
import { BankNotificationsService } from '../core/services/bank-notifications';
import { FinanzasService } from '../core/services/finanzas.service';
import { AuthService } from '../core/services/auth.service';

describe('Configuración bancaria guardada', () => {
  const user = signal({ id: 71 });
  let automatic: any;
  let c: AutomaticBankComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    automatic = { available: true, read: vi.fn().mockResolvedValue({ active: true, queued: 0,
      rules: [
        { proveedor: 'SANTANDER', cuentaId: 11, listaId: 21, terminacion: null },
        { proveedor: 'SEARS', cuentaId: 12, listaId: 21, terminacion: '1234', paquete: 'com.google.android.apps.messaging', remitente: 'QA' },
      ] }), configure: vi.fn(), disconnect: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AutomaticBankService, useValue: automatic },
      { provide: BankNotificationsService, useValue: { apps: async () => [] } },
      { provide: FinanzasService, useValue: { getCuentas: () => of({ data: [] }) } },
      { provide: AuthService, useValue: { currentUser: user } },
    ] });
    c = TestBed.runInInjectionContext(() => new AutomaticBankComponent());
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function load() {
    const pending = c.load();
    http.expectOne('/api/listas').flush({ data: [] });
    await pending;
  }
  it('recupera Santander, Sears y destino al volver a abrir sin reactivar ni renovar consentimiento', async () => {
    await load();
    expect(c.profiles.find(p => p.provider === 'SANTANDER')?.account).toBe(11);
    expect(c.profiles.find(p => p.provider === 'SEARS')?.account).toBe(12);
    expect(c.smsPackage).toBe('com.google.android.apps.messaging');
    expect(c.sender).toBe('QA'); expect(c.listId).toBe(21); expect(c.consent).toBe(false);
    c.opened({ target: { open: false } } as unknown as Event);
    await load();
    expect(c.profiles.find(p => p.provider === 'SANTANDER')?.account).toBe(11);
    expect(automatic.configure).not.toHaveBeenCalled(); expect(automatic.disconnect).not.toHaveBeenCalled();
  });
  it('elimina selecciones antiguas si ya no hay reglas y conserva el estado desactivado', async () => {
    await load();
    automatic.read.mockResolvedValue({ active: false, queued: 0, rules: [] });
    await load();
    expect(c.profiles.every(p => p.account === null && p.suffix === '')).toBe(true);
    expect(c.listId).toBeNull(); expect(c.sender).toBe(''); expect(c.smsPackage).toBe('');
    expect(c.state()?.active).toBe(false);
  });
});
