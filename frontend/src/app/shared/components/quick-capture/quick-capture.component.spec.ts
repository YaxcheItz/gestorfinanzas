import { AuthService } from '../../../core/services/auth.service';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { ToastService } from '../../../core/services/toast.service';
import { QuickCaptureComponent } from './quick-capture.component';

describe('QuickCaptureComponent processing and gestures', () => {
  let component: QuickCaptureComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<QuickCaptureComponent>>;
  let teardown = vi.fn(() => {});
  let result: Subject<any>;
  const navigate = vi.fn(() => Promise.resolve(true));

  beforeEach(() => {
    teardown = vi.fn(() => {});
    result = new Subject();
    TestBed.configureTestingModule({
      imports: [QuickCaptureComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: FinanzasService, useValue: {
          getCategorias: () => of({data: []}),
          capturaRapidaAi: () => new Observable(subscriber => {
            const subscription = result.subscribe(subscriber);
            return () => { subscription.unsubscribe(); teardown(); };
          })
        } },
        { provide: PerfilService, useValue: { perfil: () => null } },
        { provide: ToastService, useValue: { info: vi.fn(), error: vi.fn(), warning: vi.fn() } },
        { provide: Router, useValue: { navigate } }
      ]
    });
    fixture = TestBed.createComponent(QuickCaptureComponent);
    component = fixture.componentInstance;
    navigate.mockClear();
  });

  afterEach(() => { fixture.destroy(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('cancels categorization and ignores a late proposal without saving', () => {
    component.content = 'Gaste 25 en tacos';
    component.submit();
    expect(component.processingStep()).toBe('CATEGORIZANDO');
    component.cancelarTranscripcion();
    expect(teardown).toHaveBeenCalledOnce();
    expect(component.processingStep()).toBeNull();
    expect(component.loading()).toBe(false);
    result.next({ success: true, data: { answer: 'Propuesta', actions: [] } });
    expect(component.captureTurns()).toEqual([]);
  });

  it('opens the manual form after a simple tap', async () => {
    const opened = vi.fn();
    window.addEventListener('kaptal-abrir-registro-manual', opened, { once: true });
    component.abrirConTeclado();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/transacciones']);
    expect(opened).toHaveBeenCalledOnce();
  });

  it('keeps voice origin when correcting the category of a proposal', () => {
    const capture = vi.spyOn(TestBed.inject(FinanzasService), 'capturaRapidaAi');
    const proposal = { id: 'proposal-1', type: 'CREATE_TRANSACTION', summary: 'Gasto', data: { tipo: 'GASTO', monto: 25 } };
    component.content = 'Gaste 25 en tacos';
    component.voiceCapture.set(true);
    component.submit();
    result.next({ success: true, data: { answer: 'Revisa el gasto', actions: [proposal] } });
    component.asignarCategoria(proposal, { id: 1, nombre: 'Comida', tipo: 'GASTO', activo: true, esPersonalizada: true }, 'Gaste 25 en tacos');
    expect(capture.mock.calls.at(-1)?.[2]).toBe(true);
  });

  it('keeps a long press from triggering the manual form on release', () => {
    vi.useFakeTimers();
    const button = document.createElement('button');
    const event = { isPrimary: true, button: 0, pointerId: 1, currentTarget: button } as unknown as PointerEvent;
    component.iniciarPorPresion(event);
    vi.advanceTimersByTime(1800);
    component.detenerPorPresion(event);
    component.abrirConTeclado();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('pide permiso explicito antes de acceder al microfono', () => {
    component.toggleVoice();
    expect(component.permisoVoz()).toBe(true);
    expect(component.listening()).toBe(false);
    expect(component.processingStep()).toBeNull();
  });

  it('no permite iniciar otra grabacion mientras el grabador anterior termina', async () => {
    vi.stubGlobal('isSecureContext', true);
    const detenerTrack = vi.fn();
    const obtener = vi.fn(async () => ({ getTracks: () => [{ stop: detenerTrack }] }));
    const anterior = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {getUserMedia: obtener} });
    let recorder: any;
    class Grabador {
      static isTypeSupported() { return true; }
      state = 'inactive'; mimeType = 'audio/webm';
      ondataavailable: any; onerror: any; onstop: any;
      constructor() { recorder = this; }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; }
    }
    vi.stubGlobal('MediaRecorder', Grabador);
    try {
      component.consent = true;
      component.toggleVoice(); await Promise.resolve();
      expect(component.listening()).toBe(true);
      component.toggleVoice(); expect(component.stopping()).toBe(true);
      component.toggleVoice(); expect(obtener).toHaveBeenCalledOnce();
      recorder.onstop();
      expect(component.stopping()).toBe(false);expect(detenerTrack).toHaveBeenCalled();
      expect(component.processingStep()).toBeNull();
    } finally {
      component.close();
      if (anterior) Object.defineProperty(navigator, 'mediaDevices', anterior);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

  it('libera el microfono si el permiso llega despues de cerrar el panel', async () => {
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported() { return true; } });
    let resolver!: (stream: any) => void;
    const obtener = vi.fn(() => new Promise(resolve => { resolver = resolve; }));
    const anterior = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {getUserMedia: obtener} });
    const detener = vi.fn();
    try {
      component.consent = true; component.toggleVoice(); component.close();
      resolver({getTracks:()=>[{stop:detener}]}); await Promise.resolve();
      expect(detener).toHaveBeenCalledOnce();expect(component.listening()).toBe(false);
    } finally {
      if (anterior) Object.defineProperty(navigator, 'mediaDevices', anterior);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

  it('renders local reports in the same chat without financial consent', () => {
    const capture=vi.spyOn(TestBed.inject(FinanzasService),'capturaRapidaAi');
    component.open.set(true);
    component.usarSugerencia('Reporte de hoy');
    expect(capture).toHaveBeenCalledWith('Reporte de hoy',false,false,null);
    result.next({success:true,data:{answer:'Resumen',engine:'REGLAS',actions:[],report:{title:'Hoy',labels:['Gastos'],values:[80],unit:'MXN'}}});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chat-local-report').textContent).toContain('Gastos');
    expect(component.captureTurns()[0].engine).toBe('REGLAS');
  });
  it('uses the clarification context only for a follow-up answer', () => {
    const capture=vi.spyOn(TestBed.inject(FinanzasService),'capturaRapidaAi');
    component.content='Gasto en tacos';component.submit();
    result.next({success:true,data:{answer:'Monto?',actions:[],contexto:'Gasto en tacos'}});
    component.content='80';component.submit();
    expect(capture).toHaveBeenLastCalledWith('80',false,false,'Gasto en tacos');
    result.next({success:true,data:{answer:'Listo',actions:[],contexto:'Gasto en tacos'}});
    component.content='Reporte de hoy';component.submit();
    expect(capture).toHaveBeenLastCalledWith('Reporte de hoy',false,false,null);
  });
  it('does not require a category for a transfer', () => {
    expect(component.necesitaCategoria({id:'t',type:'CREATE_TRANSACTION',summary:'Transferencia',data:{tipo:'TRANSFERENCIA',monto:80}})).toBe(false);
  });
  it('clears chat history without deleting financial data', () => {
    component.content='Saldo';component.submit();result.next({success:true,data:{answer:'Saldo',actions:[]}});
    expect(component.captureTurns()).toHaveLength(1);component.limpiarChat();expect(component.captureTurns()).toEqual([]);
  });
});
