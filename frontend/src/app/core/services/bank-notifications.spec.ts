import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { BANK_NOTIFICATIONS_NATIVE, BankNotificationsService } from './bank-notifications';

describe('Recepción bancaria nativa', () => {
  const user = signal<{ id: number } | null>({ id: 71 });
  const notice = { id: 'qa', text: 'Original QA', revision: 1, packageName: 'qa.bank', at: 1 };
  const state = { granted: true, enabled: true, packages: ['qa.bank'], notices: [notice], omitted: 0 };
  let native: any;
  beforeEach(() => {
    user.set({ id: 71 });
    native = { read: vi.fn().mockResolvedValue(state), apps: vi.fn(), settings: vi.fn(),
      configure: vi.fn().mockResolvedValue(undefined), discard: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { currentUser: user } }, { provide: BANK_NOTIFICATIONS_NATIVE, useValue: native },
    ] });
  });
  it('oculta la cola al cambiar de cuenta e ignora una lectura anterior', async () => {
    const service = TestBed.inject(BankNotificationsService); TestBed.tick(); await service.refresh();
    expect(service.isCurrent(notice)).toBe(true);
    let finish!: (value: any) => void;
    native.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const stale = service.refresh(); user.set({ id: 72 });
    expect(service.current().notices).toEqual([]);
    native.read.mockResolvedValue({ ...state, notices: [] }); await service.refresh();
    finish(state); await stale; expect(service.current().notices).toEqual([]);
  });
  it('una actualización invalida la revisión abierta y el descarte antiguo', async () => {
    const service = TestBed.inject(BankNotificationsService); TestBed.tick(); await service.refresh();
    native.read.mockResolvedValue({ ...state, notices: [{ ...notice, revision: 2, text: 'Actualizado' }] });
    await service.refresh(); expect(service.isCurrent(notice)).toBe(false);
    await expect(service.discard(notice)).rejects.toThrow(); expect(native.discard).not.toHaveBeenCalled();
  });
  it('activar requiere pasar consentimiento y apps exactas y pausar vacía la cola', async () => {
    const service = TestBed.inject(BankNotificationsService); TestBed.tick(); await service.refresh();
    await service.configure(true, ['qa.bank'], true);
    expect(native.configure).toHaveBeenCalledWith({ userId: 71, enabled: true, packages: ['qa.bank'], consent: true });
    native.read.mockResolvedValue({ granted: true, enabled: false, notices: [], packages: [], omitted: 0 });
    await service.configure(false, [], false); expect(service.current().notices).toEqual([]);
  });
  it('un fallo de lectura oculta el original e impide reutilizarlo', async () => {
    const service = TestBed.inject(BankNotificationsService); TestBed.tick(); await service.refresh();
    native.read.mockRejectedValue(new Error('Sin almacenamiento')); await service.refresh();
    expect(service.isCurrent(notice)).toBe(false); expect(service.error()).not.toBe('');
  });
});
