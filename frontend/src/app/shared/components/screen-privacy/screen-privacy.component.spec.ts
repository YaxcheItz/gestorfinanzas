import { TestBed } from '@angular/core/testing';
import { NATIVE_SCREEN_PRIVACY } from '../../../core/native-screen-privacy';
import { ScreenPrivacyComponent } from './screen-privacy.component';

describe('ScreenPrivacyComponent', () => {
  let native: { read: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    native = { read: vi.fn().mockResolvedValue({ enabled: false }),
      set: vi.fn().mockImplementation(async ({ enabled }) => ({ enabled })) };
    TestBed.configureTestingModule({ imports: [ScreenPrivacyComponent],
      providers: [{ provide: NATIVE_SCREEN_PRIVACY, useValue: native }] });
  });

  it('oculta el control cuando no hay puente Android', async () => {
    TestBed.overrideProvider(NATIVE_SCREEN_PRIVACY, { useValue: null });
    const fixture = TestBed.createComponent(ScreenPrivacyComponent); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('expone un switch accesible y espera confirmación nativa', async () => {
    const fixture = TestBed.createComponent(ScreenPrivacyComponent); await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[role="switch"]');
    expect(button.getAttribute('aria-checked')).toBe('false');
    const label = fixture.nativeElement.querySelector('#' + button.getAttribute('aria-labelledby'));
    expect(label.textContent).toContain('Proteger pantalla');
    button.click(); await fixture.whenStable();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(native.set).toHaveBeenCalledWith({ enabled: true });
  });

  it('no muestra un switch falso si falla la lectura y ofrece reintentar', async () => {
    native.read.mockRejectedValueOnce(new Error('unavailable'));
    const fixture = TestBed.createComponent(ScreenPrivacyComponent); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="switch"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    native.read.mockResolvedValueOnce({ enabled: true });
    fixture.nativeElement.querySelector('button').click(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('true');
  });
});
