import { TestBed } from '@angular/core/testing';
import { NATIVE_SCREEN_PRIVACY } from '../native-screen-privacy';
import { ScreenPrivacyService } from './screen-privacy.service';

describe('ScreenPrivacyService', () => {
  let native: { read: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    localStorage.clear();
    native = { read: vi.fn().mockResolvedValue({ enabled: false }),
      set: vi.fn().mockImplementation(async ({ enabled }) => ({ enabled })) };
    TestBed.configureTestingModule({ providers: [{ provide: NATIVE_SCREEN_PRIVACY, useValue: native }] });
  });

  it('no presenta protección nativa en la web', async () => {
    TestBed.overrideProvider(NATIVE_SCREEN_PRIVACY, { useValue: null });
    const service = TestBed.inject(ScreenPrivacyService);
    await service.refresh(); await service.set(true);
    expect(service.available).toBe(false); expect(service.enabled()).toBeNull();
    expect(native.read).not.toHaveBeenCalled(); expect(native.set).not.toHaveBeenCalled();
  });

  it('carga el estado real y cambia solo por acción explícita', async () => {
    const service = TestBed.inject(ScreenPrivacyService);
    await vi.waitFor(() => expect(service.enabled()).toBe(false));
    expect(native.set).not.toHaveBeenCalled();
    await service.set(true);
    expect(native.set).toHaveBeenCalledWith({ enabled: true });
    expect(service.enabled()).toBe(true); expect(service.busy()).toBe(false);
  });

  it('no modifica el almacenamiento de sesión al proteger o desproteger', async () => {
    localStorage.setItem('finanzas_token', 'synthetic-session');
    localStorage.setItem('finanzas_user', 'synthetic-user');
    const service = TestBed.inject(ScreenPrivacyService);
    await vi.waitFor(() => expect(service.enabled()).toBe(false));
    await service.set(true); await service.set(false);
    expect(localStorage.getItem('finanzas_token')).toBe('synthetic-session');
    expect(localStorage.getItem('finanzas_user')).toBe('synthetic-user');
    expect(localStorage.length).toBe(2);
  });

  it('no permite cambiar una preferencia cuyo estado aún no conoce', async () => {
    let finish!: (state: { enabled: boolean }) => void;
    native.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const service = TestBed.inject(ScreenPrivacyService);
    await service.set(true);
    expect(service.enabled()).toBeNull(); expect(native.set).not.toHaveBeenCalled();
    finish({ enabled: true });
    await vi.waitFor(() => expect(service.enabled()).toBe(true));
  });

  it('rechaza respuestas inválidas sin anunciar desactivación ni protección', async () => {
    native.read.mockResolvedValueOnce({ enabled: 'false' });
    const service = TestBed.inject(ScreenPrivacyService);
    await vi.waitFor(() => expect(service.error()).not.toBe(''));
    expect(service.enabled()).toBeNull(); expect(service.busy()).toBe(false);
    await service.set(true); expect(native.set).not.toHaveBeenCalled();
  });

  it('un error de escritura deja estado desconocido y puede reconciliarse con Android', async () => {
    const service = TestBed.inject(ScreenPrivacyService);
    await vi.waitFor(() => expect(service.enabled()).toBe(false));
    native.set.mockRejectedValueOnce(new Error('private native detail'));
    await service.set(true);
    expect(service.enabled()).toBeNull(); expect(service.error()).not.toContain('private');
    native.read.mockResolvedValueOnce({ enabled: true }); await service.refresh();
    expect(service.enabled()).toBe(true); expect(service.error()).toBe('');
  });

  it('serializa cambios y exige confirmar el estado solicitado', async () => {
    let finish!: (state: { enabled: boolean }) => void;
    const service = TestBed.inject(ScreenPrivacyService);
    await vi.waitFor(() => expect(service.enabled()).toBe(false));
    native.set.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = service.set(true);
    await service.set(false); await service.refresh();
    expect(native.set).toHaveBeenCalledTimes(1);
    finish({ enabled: false }); await pending;
    expect(service.enabled()).toBeNull(); expect(service.error()).not.toBe('');
  });

  it('reconcilia la protección efectiva después de desbloquear la pantalla nativa', async () => {
    const service = TestBed.inject(ScreenPrivacyService);
    await vi.waitFor(() => expect(service.enabled()).toBe(false));
    native.read.mockResolvedValueOnce({ enabled: true });
    window.dispatchEvent(new Event('kaptal-screen-privacy-changed'));
    await vi.waitFor(() => expect(service.enabled()).toBe(true));
  });
});
