import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AUTOMATIC_BANK_NATIVE, AutomaticBankService, AutomaticRule } from './automatic-bank';

describe('Registro bancario automático', () => {
  const user = signal<{ id: number } | null>({ id: 71 });
  const state = { deviceId: '00000000-0000-4000-8000-000000000001', active: false, queued: 0 };
  const rule: AutomaticRule = { id: '00000000-0000-4000-8000-000000000002', proveedor: 'REVOLUT',
    paquete: 'com.revolut.revolut', remitente: null, terminacion: null, cuentaId: 1, listaId: 1, categoriaId: null };
  const credential = { id: 'qa', clave: 'synthetic-key', vence: '2027-01-01T00:00:00Z', reglas: [rule] };
  let native: any;
  let http: HttpTestingController;
  beforeEach(() => {
    user.set({ id: 71 });
    native = { read: vi.fn().mockResolvedValue(state), configure: vi.fn().mockResolvedValue(undefined), clear: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { currentUser: user } }, { provide: AUTOMATIC_BANK_NATIVE, useValue: native }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('no crea conexiones sin consentimiento ni descarta compras aún pendientes', async () => {
    const service = TestBed.inject(AutomaticBankService);
    await expect(service.configure([rule], false)).rejects.toThrow();
    native.read.mockResolvedValue({ ...state, queued: 1 });
    await expect(service.configure([rule], true)).rejects.toThrow();
    http.expectNone('/api/automatizacion/android'); expect(native.configure).not.toHaveBeenCalled();
  });
  it('guarda la capacidad en el plugin sin convertirla en credencial de sesión', async () => {
    const pending = TestBed.inject(AutomaticBankService).configure([rule], true);
    const request = await vi.waitFor(() => http.expectOne('/api/automatizacion/android'));
    expect(request.request.body.reglas).toEqual([rule]);
    request.flush({ success: true, data: credential }); await pending;
    expect(native.configure).toHaveBeenCalledWith({ userId: 71, consent: true, credential });
  });
  it('ignora respuestas de configuración que llegan tras cambiar de usuario', async () => {
    const pending = TestBed.inject(AutomaticBankService).configure([rule], true);
    const request = await vi.waitFor(() => http.expectOne('/api/automatizacion/android'));
    user.set({ id: 72 }); request.flush({ success: true, data: credential });
    await expect(pending).rejects.toThrow(); expect(native.configure).not.toHaveBeenCalled();
  });
  it('revoca la capacidad nueva cuando falla su almacenamiento nativo', async () => {
    native.configure.mockRejectedValue(new Error('Storage unavailable'));
    const pending = TestBed.inject(AutomaticBankService).configure([rule], true);
    const assertion = expect(pending).rejects.toThrow('Storage unavailable');
    const request = await vi.waitFor(() => http.expectOne('/api/automatizacion/android'));
    request.flush({ success: true, data: credential });
    const revoke = await vi.waitFor(() => http.expectOne('/api/automatizacion/android/' + state.deviceId));
    expect(revoke.request.method).toBe('DELETE'); revoke.flush({ success: true }); await assertion;
  });
});
