import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { NativeCaptureService, NATIVE_CAPTURE } from './native-capture.service';
import { ToastService } from './toast.service';

describe('Accesos de captura Android', () => {
  const events = new Subject<NavigationEnd>();
  const router = { navigated: true, events, navigate: vi.fn() };
  const native = { consume: vi.fn(), addListener: vi.fn() };
  const toast = { error: vi.fn() };
  let changed: () => void;
  let remove: ReturnType<typeof vi.fn>;
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

  beforeEach(() => {
    vi.clearAllMocks(); router.navigated = true;
    remove = vi.fn(); native.consume.mockResolvedValue({}); router.navigate.mockResolvedValue(true);
    native.addListener.mockImplementation(async (_event, listener) => { changed = listener; return { remove }; });
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: router }, { provide: NATIVE_CAPTURE, useValue: native },
      { provide: ToastService, useValue: toast },
    ] });
  });

  it('espera la navegación inicial y lleva el arranque frío a la ruta protegida', async () => {
    router.navigated = false; native.consume.mockResolvedValue({ action: 'nuevo-gasto' });
    TestBed.inject(NativeCaptureService); await settle();
    expect(native.consume).not.toHaveBeenCalled();
    router.navigated = true; events.next(new NavigationEnd(1, '/', '/login')); await settle();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/dashboard'], { queryParams: { accion: 'nuevo-gasto' } });
  });

  it('recibe accesos con la app abierta y no interpreta URLs ni acciones desconocidas', async () => {
    TestBed.inject(NativeCaptureService); await settle();
    for (const action of ['nuevo-ingreso', 'dictar']) {
      native.consume.mockResolvedValueOnce({ action }); changed(); await settle();
      expect(router.navigate).toHaveBeenLastCalledWith(['/dashboard'], { queryParams: { accion: action } });
    }
    router.navigate.mockClear();
    for (const action of ['https://other.example', ['dictar'], 'logout']) {
      native.consume.mockResolvedValueOnce({ action }); changed(); await settle();
    }
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('informa el fallo de transporte y retira el listener al destruirse', async () => {
    TestBed.inject(NativeCaptureService); await settle();
    native.consume.mockRejectedValueOnce(new Error('unavailable')); changed(); await settle();
    expect(toast.error).toHaveBeenCalledOnce();
    TestBed.resetTestingModule(); expect(remove).toHaveBeenCalledOnce();
  });

  it('no registra listeners en la web', async () => {
    TestBed.overrideProvider(NATIVE_CAPTURE, { useValue: null });
    TestBed.inject(NativeCaptureService); await settle();
    expect(native.addListener).not.toHaveBeenCalled();
  });
});
