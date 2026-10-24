import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NATIVE_GOOGLE_SIGN_IN } from '../../../core/native-google-sign-in';
import { GoogleSignInComponent } from './google-sign-in.component';

describe('Google nativo por gesto explícito', () => {
  const native = { signIn: vi.fn() };
  const clientId = '123456789-example.apps.googleusercontent.com';

  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    native.signIn.mockResolvedValue({ credential: 'synthetic-google-id-token' });
    TestBed.configureTestingModule({ imports: [GoogleSignInComponent], providers: [
      { provide: AuthService, useValue: { googleConfig: () => of({ success: true, data: { enabled: true, clientId } }) } },
      { provide: NATIVE_GOOGLE_SIGN_IN, useValue: native },
    ] });
  });

  it('no abre el selector al cargar; solo entrega la credencial al flujo existente tras tocar', async () => {
    const fixture = TestBed.createComponent(GoogleSignInComponent); await fixture.whenStable();
    const received = vi.fn(); fixture.componentInstance.credentialReceived.subscribe(received);
    expect(native.signIn).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click(); await fixture.whenStable();
    expect(native.signIn).toHaveBeenCalledExactlyOnceWith({ clientId });
    expect(received).toHaveBeenCalledExactlyOnceWith('synthetic-google-id-token');
    expect(localStorage.length).toBe(0);
  });

  it('cancelar no inicia sesión ni muestra el mensaje privado del proveedor; permite reintentar', async () => {
    native.signIn.mockRejectedValueOnce({ code: 'CANCELLED', message: 'private provider response' });
    const fixture = TestBed.createComponent(GoogleSignInComponent); await fixture.whenStable();
    const component = fixture.componentInstance; const received = vi.fn(); component.credentialReceived.subscribe(received);
    await component.iniciarNativo();
    expect(received).not.toHaveBeenCalled(); expect(component.errorCarga()).toBeNull();
    await component.iniciarNativo(); expect(received).toHaveBeenCalledOnce();
  });

  it('rechaza credenciales vacías y no propaga errores privados', async () => {
    const fixture = TestBed.createComponent(GoogleSignInComponent); await fixture.whenStable();
    const component = fixture.componentInstance; const received = vi.fn(); component.credentialReceived.subscribe(received);
    native.signIn.mockResolvedValueOnce({ credential: '' }); await component.iniciarNativo();
    expect(received).not.toHaveBeenCalled(); expect(component.errorCarga()).toContain('credencial válida');
    native.signIn.mockRejectedValueOnce(new Error('private-provider-token')); await component.iniciarNativo();
    expect(component.errorCarga()).not.toContain('private-provider-token');
  });

  it('no duplica el selector ni acepta una respuesta después de destruir el formulario', async () => {
    let complete!: (value: { credential: string }) => void;
    native.signIn.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const fixture = TestBed.createComponent(GoogleSignInComponent); await fixture.whenStable();
    const component = fixture.componentInstance; const received = vi.fn(); component.credentialReceived.subscribe(received);
    const pending = component.iniciarNativo(); await component.iniciarNativo();
    expect(native.signIn).toHaveBeenCalledOnce();
    fixture.destroy(); complete({ credential: 'late-synthetic-token' }); await pending;
    expect(received).not.toHaveBeenCalled();
  });

  it('sin configuración del servidor no abre el proveedor', async () => {
    TestBed.overrideProvider(AuthService, { useValue: { googleConfig: () => of({ success: true, data: { enabled: false, clientId: null } }) } });
    const fixture = TestBed.createComponent(GoogleSignInComponent); await fixture.whenStable();
    await fixture.componentInstance.iniciarNativo();
    expect(native.signIn).not.toHaveBeenCalled(); expect(fixture.componentInstance.habilitado()).toBe(false);
  });

  it('la web conserva el botón GIS y no llama al plugin Android', async () => {
    const initialize = vi.fn(), renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };
    TestBed.overrideProvider(NATIVE_GOOGLE_SIGN_IN, { useValue: null });
    try {
      const fixture = TestBed.createComponent(GoogleSignInComponent); await fixture.whenStable();
      expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: clientId, auto_select: false }));
      expect(renderButton).toHaveBeenCalledOnce(); expect(native.signIn).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[aria-label="Acceso con Google"]')).toBeTruthy();
    } finally { delete window.google; }
  });
});
