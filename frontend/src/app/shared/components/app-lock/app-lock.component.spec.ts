import { TestBed } from '@angular/core/testing';
import { NATIVE_APP_LOCK } from '../../../core/native-app-lock';
import { AppLockComponent } from './app-lock.component';

describe('AppLockComponent', () => {
  let native: { read: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    native = { read: vi.fn().mockResolvedValue({ enabled: false, supported: true, available: true }),
      set: vi.fn().mockResolvedValue({ enabled: true, supported: true, available: true }) };
    TestBed.configureTestingModule({ imports: [AppLockComponent], providers: [{ provide: NATIVE_APP_LOCK, useValue: native }] });
  });
  it('no muestra controles de bloqueo nativo en web', async () => {
    TestBed.overrideProvider(NATIVE_APP_LOCK, { useValue: null });
    const fixture = TestBed.createComponent(AppLockComponent); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });
  it('tiene nombre accesible estable y solicita el cambio solo al pulsar', async () => {
    const fixture = TestBed.createComponent(AppLockComponent); await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[role="switch"]');
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(native.set).not.toHaveBeenCalled();
    const label = fixture.nativeElement.querySelector('#' + button.getAttribute('aria-labelledby'));
    expect(label.textContent).toContain('Bloquear Kaptal');
    button.click(); await fixture.whenStable();
    expect(button.getAttribute('aria-checked')).toBe('true');
  });
  it('explica falta de seguridad Android sin ofrecer activación ficticia', async () => {
    native.read.mockResolvedValue({ enabled: false, supported: true, available: false });
    const fixture = TestBed.createComponent(AppLockComponent); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="switch"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Seguridad de Android');
  });
});
