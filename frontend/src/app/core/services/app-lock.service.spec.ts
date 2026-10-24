import { TestBed } from '@angular/core/testing';
import { NATIVE_APP_LOCK } from '../native-app-lock';
import { AppLockService } from './app-lock.service';

describe('AppLockService', () => {
  const off = { enabled: false, supported: true, available: true };
  let native: { read: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    native = { read: vi.fn().mockResolvedValue(off), set: vi.fn().mockResolvedValue({ ...off, enabled: true }) };
    TestBed.configureTestingModule({ providers: [{ provide: NATIVE_APP_LOCK, useValue: native }] });
  });
  it('no ofrece un bloqueo ficticio en web', async () => {
    TestBed.overrideProvider(NATIVE_APP_LOCK, { useValue: null });
    const service = TestBed.inject(AppLockService);
    await service.refresh(); await service.set(true);
    expect(service.state()).toBeNull(); expect(native.set).not.toHaveBeenCalled();
  });
  it('solo solicita autenticación tras acción explícita', async () => {
    const service = TestBed.inject(AppLockService);
    await vi.waitFor(() => expect(service.state()).toEqual(off));
    expect(native.set).not.toHaveBeenCalled();
    await service.set(true);
    expect(native.set).toHaveBeenCalledWith({ enabled: true });
    expect(service.state()?.enabled).toBe(true);
  });
  it('no cambia estados desconocidos o no compatibles', async () => {
    native.read.mockResolvedValue({ ...off, supported: false });
    const service = TestBed.inject(AppLockService);
    await vi.waitFor(() => expect(service.state()?.supported).toBe(false));
    await service.set(true); expect(native.set).not.toHaveBeenCalled();
  });
  it('cancelar no anuncia activación y permite reconciliar el estado', async () => {
    const service = TestBed.inject(AppLockService);
    await vi.waitFor(() => expect(service.state()).toEqual(off));
    native.set.mockRejectedValueOnce(new Error('private system details'));
    await service.set(true);
    expect(service.state()).toBeNull(); expect(service.error()).not.toContain('private');
    await service.refresh(); expect(service.state()?.enabled).toBe(false);
  });
  it('rechaza una respuesta mal formada o distinta de la solicitada', async () => {
    const service = TestBed.inject(AppLockService);
    await vi.waitFor(() => expect(service.state()).toEqual(off));
    native.set.mockResolvedValueOnce(off); await service.set(true);
    expect(service.state()).toBeNull();
    native.read.mockResolvedValueOnce({ enabled: false }); await service.refresh();
    expect(service.state()).toBeNull(); expect(service.error()).not.toBe('');
  });
});
