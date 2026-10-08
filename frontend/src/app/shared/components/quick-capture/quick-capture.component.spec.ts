import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { ToastService } from '../../../core/services/toast.service';
import { QuickCaptureComponent } from './quick-capture.component';
import { MovimientosOfflineService } from '../../../core/services/movimientos-offline.service';
import { ActualizacionPwaService } from '../../../core/services/actualizacion-pwa.service';

describe('QuickCaptureComponent processing and gestures', () => {
  let component: QuickCaptureComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<QuickCaptureComponent>>;
  let teardown = vi.fn(() => {});
  let result: Subject<any>;
  const navigate = vi.fn(() => Promise.resolve(true));
  const usuario = signal<any>(null);
  const conexion = signal(true);
  let offline: any;
  let protegerActualizacion: () => Promise<boolean>;

  beforeEach(() => {
    usuario.set(null);
    conexion.set(true);
    offline = {conexion,pendientes:signal([]),sincronizando:signal(false),
      leerBorrador:vi.fn(async()=>null),leerCatalogo:vi.fn(async()=>null),guardarCatalogo:vi.fn(async()=>{}),
      guardarBorrador:vi.fn(async()=>{}),guardarPendiente:vi.fn(async()=>{}),guardarConfirmacion:vi.fn(async()=>{}),sincronizar:vi.fn(async()=>0)};
    teardown = vi.fn(() => {});
    result = new Subject();
    TestBed.configureTestingModule({
      imports: [QuickCaptureComponent],
      providers: [
        { provide: MovimientosOfflineService, useValue: offline },
        { provide: ActualizacionPwaService, useValue: {proteger:(guardar:()=>Promise<boolean>)=>{protegerActualizacion=guardar;return()=>{};}} },
        { provide: AuthService, useValue: { currentUser: usuario } },
        { provide: FinanzasService, useValue: {
          getCategorias: () => of({data: []}),
          getCuentas: () => of({data: []}),
          chatWithAi: vi.fn(() => of({success:true,data:{answer:'Reporte',actions:[]}})),
          getPropuestasAi: vi.fn(() => of({success:true,data:[]})),
          descartarPropuestaAi: vi.fn(() => of({success:true})),
          confirmAiAction: vi.fn(() => of({success:true,message:'Guardado'})),
          editarPropuestaAi: vi.fn((id,datos,version) => of({success:true,data:{id,type:'CREATE_TRANSACTION',summary:'Actualizado',data:datos,version:version+1}})),
          capturaRapidaAi: () => new Observable(subscriber => {
            const subscription = result.subscribe(subscriber);
            return () => { subscription.unsubscribe(); teardown(); };
          })
        } },
        { provide: PerfilService, useValue: { perfil: () => null } },
        { provide: ToastService, useValue: { info: vi.fn(), error: vi.fn(), warning: vi.fn(),success:vi.fn() } },
        { provide: Router, useValue: { navigate } }
      ]
    });
    fixture = TestBed.createComponent(QuickCaptureComponent);
    component = fixture.componentInstance;
    navigate.mockClear();
  });

  afterEach(() => { fixture.destroy(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('prepares an offline proposal without sending text or recording money', () => {
    conexion.set(false);
    component.cuentasEdicion.set([{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',saldoActual:0,activo:true} as any]);
    component.content='Gasté 25 en comida';
    const api=vi.spyOn(TestBed.inject(FinanzasService),'capturaRapidaAi');
    component.submit();
    expect(api).not.toHaveBeenCalled();
    expect(component.captureTurns()[0].actions[0].local).toBe(true);
    expect(offline.guardarPendiente).not.toHaveBeenCalled();
  });
  it('keeps unsupported offline text for correction', () => {
    conexion.set(false);component.content='Reporte mensual';component.submit();
    expect(component.content).toBe('Reporte mensual');
    expect(component.captureTurns()).toEqual([]);
    expect(offline.guardarPendiente).not.toHaveBeenCalled();
  });
  it('does not request a microphone or transcribe offline', () => {
    conexion.set(false);(component as any).voiceConsent=true;
    component.toggleVoice();expect(component.error()).toContain('conexión');
    expect(component.listening()).toBe(false);
  });
  it('blocks update when text changes during the draft commit', async () => {
    (component as any).usuarioChat=1;(component as any).borradorRestaurado.set(true);
    let resolver:any;offline.guardarBorrador.mockImplementation(()=>new Promise(r=>resolver=r));
    component.content='Texto inicial';const protegido=protegerActualizacion();
    await Promise.resolve();await Promise.resolve();
    component.content='Texto más reciente';resolver();
    expect(await protegido).toBe(false);
  });

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
    const editar = vi.spyOn(TestBed.inject(FinanzasService), 'editarPropuestaAi');
    const proposal = { id: 'proposal-1', type: 'CREATE_TRANSACTION', summary: 'Gasto', data: { tipo: 'GASTO', monto: 25,metodoCaptura:'VOZ' } };
    component.content = 'Gaste 25 en tacos';
    component.voiceCapture.set(true);
    component.submit();
    result.next({ success: true, data: { answer: 'Revisa el gasto', actions: [proposal] } });
    component.asignarCategoria(proposal, { id: 1, nombre: 'Comida', tipo: 'GASTO', activo: true, esPersonalizada: true }, 'Gaste 25 en tacos');
    expect(editar).toHaveBeenCalledWith('proposal-1',{...proposal.data,categoriaId:1},0);
    expect(component.captureTurns()[0].actions[0].id).toBe('proposal-1');
    expect(component.captureTurns()[0].actions[0].version).toBe(1);
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
  const propuesta={id:'persistida',type:'CREATE_TRANSACTION',summary:'Gasto 25',version:2,data:{tipo:'GASTO',monto:25}};
  it('recupera propuestas por ID sin volver a interpretar ni guardar',()=>{
    vi.spyOn(TestBed.inject(FinanzasService),'getPropuestasAi').mockReturnValue(of({success:true,data:[propuesta],message:''}));
    component.recuperarPropuestas();component.recuperarPropuestas();
    expect(component.captureTurns()).toHaveLength(1);
    expect(component.captureTurns()[0].actions).toEqual([propuesta]);
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
  });
  it('descartar solo retira la propuesta cuando el servidor confirma',()=>{
    const respuesta=new Subject<any>();
    vi.spyOn(TestBed.inject(FinanzasService),'descartarPropuestaAi').mockReturnValue(respuesta);
    component.captureTurns.set([{id:1,user:'Gasto',answer:'Revisa',actions:[propuesta],voice:false}]);
    component.dismiss(propuesta.id);expect(component.captureTurns()[0].actions).toHaveLength(1);
    respuesta.next({success:true});expect(component.captureTurns()[0].actions).toEqual([]);
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
  });
  it('reintenta una respuesta incierta con la misma propuesta y version',()=>{
    const confirmar=vi.spyOn(TestBed.inject(FinanzasService),'confirmAiAction');
    const respuesta=new Subject<any>();confirmar.mockReturnValueOnce(respuesta);
    component.captureTurns.set([{id:1,user:'Gasto',answer:'Revisa',actions:[propuesta],voice:false}]);
    component.confirm(propuesta);component.confirm(propuesta);expect(confirmar).toHaveBeenCalledTimes(1);
    respuesta.error(new HttpErrorResponse({status:0}));expect(component.captureTurns()[0].actions).toHaveLength(1);
    component.confirm(propuesta);expect(confirmar.mock.calls).toEqual([[propuesta.id,2],[propuesta.id,2]]);
    expect(component.captureTurns()[0].actions).toEqual([]);
  });
  it('actualizar prepara la propuesta y requiere una confirmacion separada',()=>{
    component.captureTurns.set([{id:1,user:'Gasto',answer:'Revisa',actions:[propuesta],voice:false}]);
    component.abrirEdicion(propuesta);component.borrador['monto']=30;component.guardarEdicion();
    const actual=component.captureTurns()[0].actions[0];expect(actual.id).toBe(propuesta.id);expect(actual.version).toBe(3);
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
    component.confirm(actual);expect(TestBed.inject(FinanzasService).confirmAiAction).toHaveBeenCalledWith(propuesta.id,3);
  });
  it('cambiar usuario cancela una confirmacion y no muestra su respuesta tardia',()=>{
    usuario.set({id:1});fixture.detectChanges();
    const respuesta=new Subject<any>();vi.spyOn(TestBed.inject(FinanzasService),'confirmAiAction').mockReturnValue(respuesta);
    component.captureTurns.set([{id:1,user:'Gasto',answer:'Revisa',actions:[propuesta],voice:false}]);component.confirm(propuesta);
    usuario.set({id:2});fixture.detectChanges();respuesta.next({success:true});
    expect(component.captureTurns()).toEqual([]);expect(component.confirming()).toBeNull();
    expect(TestBed.inject(ToastService).success).not.toHaveBeenCalled();
  });
  it('reintentar un reporte fallido mantiene el orden de la conversacion',()=>{
    const respuesta=new Subject<any>();const chat=vi.spyOn(TestBed.inject(FinanzasService),'chatWithAi');chat.mockReturnValueOnce(respuesta);
    component.consent=true;component.reportQuestion='Primera consulta';component.askReport();
    respuesta.error(new HttpErrorResponse({status:503}));
    component.reportQuestion='Reintento';component.askReport();
    expect(chat).toHaveBeenLastCalledWith([{role:'USER',content:'Reintento'}],true);
    expect(component.reportMessages().map(m=>m.role)).toEqual(['USER','ASSISTANT']);
  });
});
