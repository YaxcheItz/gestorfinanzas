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
  it('abre el historial con los filtros de evidencia calculados por el servidor', () => {
    component.verEvidencia({label:'Gastos actual',desde:'2026-10-01',hasta:'2026-10-20',moneda:'MXN',tipo:'GASTO',operaciones:2,total:40.25});
    expect(navigate).toHaveBeenCalledWith(['/transacciones'],{queryParams:{alcance:'propio',fechaInicio:'2026-10-01',fechaFin:'2026-10-20',moneda:'MXN',tipo:'GASTO'}});
  });
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
          getEtiquetasPersonales: () => of({data: [{id:4,nombre:'viaje'}]}),
          getCuentas: () => of({data: []}),
          chatWithAi: vi.fn(() => of({success:true,data:{answer:'Reporte',actions:[]}})),
          getPropuestasAi: vi.fn(() => of({success:true,data:[]})),
          descartarPropuestaAi: vi.fn(() => of({success:true})),
          confirmAiAction: vi.fn(() => of({success:true,message:'Guardado'})),
          transcribirAudio: vi.fn(() => of({success:true,data:'Gasté 50 en café'})),
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

  it('guarda voz una sola vez cuando cuenta y categoria son claras', () => {
    component.categories.set([{id: 10, nombre:'Comida', tipo:'GASTO', activo:true, esPersonalizada:true}]);
    component.cuentasEdicion.set([{id: 1, nombre:'Efectivo', tipo:'EFECTIVO', moneda:'MXN', activo:true} as any]);
    component.content='Gaste 50 en tacos'; component.pantallaVoz.set(true);
    const confirmar=vi.spyOn(TestBed.inject(FinanzasService),'confirmAiAction');
    component.continuarConVoz();
    result.next({success:true,data:{answer:'Preparado', engine:'REGLAS', actions:[{id:'voz-1',type:'CREATE_TRANSACTION',version:0,summary:'Gasto',data:{tipo:'GASTO',monto:50,cuentaId:1,categoriaId:10,fecha:'2026-11-05'}}]}});
    expect(confirmar).toHaveBeenCalledOnce();
    expect(component.pantallaVoz()).toBe(true);
    expect(component.voiceMessage()).toContain('guardado');
  });

  it('pide aclarar categoria incompleta sin guardar la voz', () => {
    component.cuentasEdicion.set([{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',activo:true} as any]);
    component.content='Gaste 50'; component.pantallaVoz.set(true); component.continuarConVoz();
    result.next({success:true,data:{answer:'Revisar',engine:'REGLAS',actions:[{id:'voz-2',type:'CREATE_TRANSACTION',version:0,summary:'Gasto',data:{tipo:'GASTO',monto:50,cuentaId:1,categoriaId:null,fecha:'2026-11-05'}}]}});
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
    expect(component.open()).toBe(true);
  });

  it('no guarda voz si la cuenta elegida no fue indicada entre varias cuentas', () => {
    component.categories.set([{id:10,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true}]);
    component.cuentasEdicion.set([{id:1,nombre:'Nu',activo:true},{id:2,nombre:'Banco',activo:true}] as any);
    component.content='Gaste 50 en tacos para la nube'; component.continuarConVoz();
    result.next({success:true,data:{answer:'Revisar',engine:'REGLAS',actions:[{id:'voz-3',type:'CREATE_TRANSACTION',version:0,summary:'Gasto',data:{tipo:'GASTO',monto:50,cuentaId:1,categoriaId:10,fecha:'2026-11-05'}}]}});
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
  });

  it('no crea otra propuesta tras perder la respuesta de confirmacion de voz', () => {
    component.categories.set([{id:10,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true}]);
    component.cuentasEdicion.set([{id:1,nombre:'Efectivo',activo:true}] as any);
    vi.spyOn(TestBed.inject(FinanzasService),'confirmAiAction').mockReturnValueOnce(new Observable(sub=>sub.error(new HttpErrorResponse({status:0}))));
    component.content='Gaste 50 en tacos'; component.pantallaVoz.set(true); component.transcripcionLista.set(true); component.continuarConVoz();
    result.next({success:true,data:{answer:'Revisar',engine:'REGLAS',actions:[{id:'voz-4',type:'CREATE_TRANSACTION',version:0,summary:'Gasto',data:{tipo:'GASTO',monto:50,cuentaId:1,categoriaId:10,fecha:'2026-11-05'}}]}});
    expect(component.transcripcionLista()).toBe(false);
    expect(component.open()).toBe(true);
    expect(component.captureTurns()[0].actions[0].id).toBe('voz-4');
    expect(component.voiceMessage()).toContain('Revisa Actividad');
  });
  it('no reutiliza aclaraciones pendientes para guardar otra captura de voz', () => {
    const anterior={id:'anterior',type:'CREATE_TRANSACTION',summary:'Gasto',data:{tipo:'GASTO',monto:10,categoriaId:null},version:0} as any;
    component.captureTurns.set([{id:1,user:'Gasto anterior',answer:'Categoria?',actions:[anterior],voice:false}]);
    (component as any).contexto='Gasto anterior'; component.content='Gaste 50 en comida';
    const captura=vi.spyOn(TestBed.inject(FinanzasService),'capturaRapidaAi');
    component.continuarConVoz();
    expect(captura).toHaveBeenCalledWith('Gaste 50 en comida',false,true,null,null,[]);
    expect(TestBed.inject(FinanzasService).editarPropuestaAi).not.toHaveBeenCalled();
  });

  it('recuerda y permite retirar el consentimiento de voz por usuario', () => {
    usuario.set({id:98765}); fixture.detectChanges();
    vi.spyOn(component as any,'startVoice').mockResolvedValue(undefined);
    component.permitirVoz();
    expect(localStorage.getItem('kaptal.voice-consent.98765')).toBe('1');
    usuario.set(null); fixture.detectChanges();
    usuario.set({id:98765}); fixture.detectChanges();
    expect(component.voiceConsent).toBe(true);
    component.revocarVoz();
    expect(localStorage.getItem('kaptal.voice-consent.98765')).toBeNull();
    expect(component.voiceConsent).toBe(false);
  });

  it('el consentimiento de IA no permite por si solo enviar audio', () => {
    component.consent=true; component.voiceConsent=false; component.toggleVoice();
    expect(component.permisoVoz()).toBe(true);
    expect(component.listening()).toBe(false);
  });

  it('comparte historial con IA solo cuando el usuario lo permite', () => {
    const captura=vi.spyOn(TestBed.inject(FinanzasService),'capturaRapidaAi');
    component.captureTurns.set([{id:1,user:'Hola',answer:'Hola, dime',actions:[],voice:false}]);
    component.content='Otra pregunta'; component.submit();
    expect(captura).toHaveBeenLastCalledWith('Otra pregunta',false,false,null,null,[]);
    result.next({success:true,data:{answer:'Respuesta',actions:[]}});
    component.consent=true; component.content='Continua'; component.submit();
    expect(captura.mock.calls.at(-1)?.[5]).toEqual(expect.arrayContaining([{role:'USER',content:'Hola'},{role:'ASSISTANT',content:'Hola, dime'}]));
  });

  it('una eliminacion propuesta por el asistente requiere dos pasos', () => {
    const propuesta={id:'borrar-1',type:'DELETE_ACCOUNT',summary:'Eliminar cuenta de prueba',data:{cuentaId:99}} as any;
    component.captureTurns.set([{id:1,user:'elimina la cuenta',answer:'Revisa',actions:[propuesta],voice:false}]);
    component.open.set(true); fixture.detectChanges();
    const boton=()=>Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b=>b.textContent?.includes('eliminación'))!;
    boton().click(); fixture.detectChanges();
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
    expect(boton().textContent).toContain('Confirmar');
    boton().click();
    expect(TestBed.inject(FinanzasService).confirmAiAction).toHaveBeenCalledOnce();
  });

  it('agrega una etiqueta disponible al texto sin duplicarla ni guardar', () => {
    component.abrirCapturaDesdeAcceso(new CustomEvent('kaptal-abrir-captura-chat',{detail:{voz:true}}));
    expect(component.etiquetasPersonales()).toEqual([{id:4,nombre:'viaje'}]);
    component.content='Gaste 50 en cafe'; component.insertarEtiqueta('viaje'); component.insertarEtiqueta('viaje');
    expect(component.content).toBe('Gaste 50 en cafe #viaje');
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
  });

  it('abre voz por separado sin iniciar el microfono y permite volver a escribir', () => {
    component.abrirCapturaDesdeAcceso(new CustomEvent('kaptal-abrir-captura-chat', { detail: { voz: true } }));
    expect(component.pantallaVoz()).toBe(true);
    expect(component.open()).toBe(false);
    expect(component.listening()).toBe(false);
    component.toggleVoice();
    expect(component.permisoVoz()).toBe(true);
    component.abrirEscrituraDesdeVoz();
    expect(component.pantallaVoz()).toBe(false);
    expect(component.open()).toBe(true);
  });

  it('no cierra voz al ejecutar por primera vez el efecto de identidad', () => {
    usuario.set({id:42});
    component.abrirCapturaDesdeAcceso(new CustomEvent('kaptal-abrir-captura-chat',{detail:{voz:true}}));
    fixture.detectChanges();
    expect(component.pantallaVoz()).toBe(true);
  });

  it('muestra confirmación del servidor solamente tras un guardado exitoso', () => {
    const propuesta = { id: 'confirmacion-visible', type: 'CREATE_TRANSACTION', summary: 'Gasto', data: {}, version: 0 } as any;
    component.captureTurns.set([{ id: 1, user: 'Gasto', answer: 'Revisa', actions: [propuesta], voice: false }]);
    const confirmar = vi.spyOn(TestBed.inject(FinanzasService), 'confirmAiAction');
    confirmar.mockReturnValueOnce(of({ success: false, message: 'Revisa los datos' } as any));
    component.confirm(propuesta);
    expect(component.captureTurns()[0].confirmaciones).toBeUndefined();
    expect(component.captureTurns()[0].actions).toHaveLength(1);
    component.confirm(propuesta);
    expect(component.captureTurns()[0].confirmaciones).toEqual([{ id: propuesta.id, estado: 'SERVIDOR' }]);
    expect(component.captureTurns()[0].actions).toHaveLength(0);
  });

  it('waits for the account catalogue before accepting a capture', async () => {
    usuario.set({id:1});fixture.detectChanges();
    await vi.waitFor(()=>expect((component as any).borradorRestaurado()).toBe(true));
    const accounts=new Subject<any>(), categories=new Subject<any>();
    vi.spyOn(TestBed.inject(FinanzasService),'getCuentas').mockReturnValue(accounts);
    vi.spyOn(TestBed.inject(FinanzasService),'getCategorias').mockReturnValue(categories);
    (component as any).cargarCatalogoChat();
    component.content='Gasto 25';
    const api=vi.spyOn(TestBed.inject(FinanzasService),'capturaRapidaAi');
    component.submit();expect(api).not.toHaveBeenCalled();
    categories.next({success:true,data:[]});categories.complete();
    expect(component.catalogoCargando()).toBe(true);
    accounts.next({success:true,data:[{id:1,nombre:'Banco',tipo:'DEBITO',moneda:'MXN',activo:true}]});accounts.complete();
    expect(component.catalogoCargando()).toBe(false);
    component.submit();expect(api).toHaveBeenCalledOnce();
  });

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
  it('prepares locally when the network fails but onLine stays true', () => {
    component.cuentasEdicion.set([{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',saldoActual:0,activo:true} as any]);
    component.content='Gasté 25 en comida';component.submit();
    result.error(new HttpErrorResponse({status:0}));
    expect(conexion()).toBe(true);
    expect(component.captureTurns()[0].actions[0].local).toBe(true);
    expect(component.loading()).toBe(false);
    expect(offline.guardarPendiente).not.toHaveBeenCalled();
  });
  it('keeps the selected category when saving a local proposal offline', async () => {
    usuario.set({id:1});fixture.detectChanges();await Promise.resolve();await Promise.resolve();
    conexion.set(false);
    component.cuentasEdicion.set([{id:1,nombre:'Efectivo',tipo:'EFECTIVO',moneda:'MXN',saldoActual:0,activo:true} as any]);
    const category={id:2,nombre:'Comida',tipo:'GASTO',activo:true} as any;
    component.categories.set([category]);component.content='Gasté 25';component.submit();
    component.asignarCategoria(component.captureTurns()[0].actions[0],category,'Gasté 25');
    const proposal=component.captureTurns()[0].actions[0];
    component.confirm(proposal);component.confirm(proposal);
    await vi.waitFor(()=>expect(offline.guardarPendiente).toHaveBeenCalledOnce());
    expect(offline.guardarPendiente).toHaveBeenCalledWith(1,proposal.id,expect.objectContaining({categoriaId:2,monto:25}));
    await vi.waitFor(() => expect(component.captureTurns()[0].confirmaciones).toEqual([{id:proposal.id,estado:'DISPOSITIVO'}]));
    expect(TestBed.inject(FinanzasService).editarPropuestaAi).not.toHaveBeenCalled();
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
  });
  it('does not request a microphone or transcribe offline', () => {
    conexion.set(false);(component as any).voiceConsent=true;
    component.toggleVoice();expect(component.error()).toContain('conexión');
    expect(component.listening()).toBe(false);
  });
  it('preserves an explicitly selected compatible category when changing type', () => {
    const proposal={id:'local-edit',local:true,type:'CREATE_TRANSACTION',summary:'Gasto',data:{tipo:'GASTO',monto:25,cuentaId:1,categoriaId:2}} as any;
    component.categories.set([{id:3,nombre:'Nómina',tipo:'INGRESO',activo:true} as any]);
    component.captureTurns.set([{id:1,user:'Gasto',answer:'Revisa',actions:[proposal],voice:false}]);
    component.abrirEdicion(proposal);component.borrador['tipo']='INGRESO';component.borrador['categoriaId']=3;
    component.guardarEdicion();
    expect(component.captureTurns()[0].actions[0].data['categoriaId']).toBe(3);
    expect(TestBed.inject(FinanzasService).editarPropuestaAi).not.toHaveBeenCalled();
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
    window.addEventListener('kaptal-abrir-registro-rapido', opened, { once: true });
    component.abrirConTeclado();
    await Promise.resolve();
    expect(navigate).not.toHaveBeenCalled();
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

  it('aplica una respuesta escrita de categoria a la propuesta pendiente sin guardar', () => {
    const propuesta = { id:'pendiente', type:'CREATE_TRANSACTION', summary:'Gasto', data:{tipo:'GASTO',monto:25,categoriaId:null}, version:0 } as any;
    component.categories.set([{ id:1, nombre:'Comida', tipo:'GASTO', activo:true, esPersonalizada:true }]);
    component.captureTurns.set([{id:1,user:'Gasto 25',answer:'Elige categoria',actions:[propuesta],voice:false}]);
    component.content = 'fue en comida';
    component.submit();
    expect(TestBed.inject(FinanzasService).editarPropuestaAi).toHaveBeenCalledWith('pendiente',{...propuesta.data,categoriaId:1},0);
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
    expect(component.captureTurns()[0].actions[0].data['categoriaId']).toBe(1);
  });

  it('interpreta restaurantes como comida en una propuesta pendiente', () => {
    const propuesta = { id:'pendiente', type:'CREATE_TRANSACTION', summary:'Gasto', data:{tipo:'GASTO',monto:25,categoriaId:null}, version:0 } as any;
    component.categories.set([{ id:1, nombre:'Comida', tipo:'GASTO', activo:true, esPersonalizada:true }]);
    component.captureTurns.set([{id:1,user:'Gasto 25',answer:'Elige categoria',actions:[propuesta],voice:false}]);
    component.content = 'restaurantes'; component.submit();
    expect(component.captureTurns()[0].actions[0].data['categoriaId']).toBe(1);
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
  });

  it('conserva la respuesta escrita si falla la actualizacion de categoria', () => {
    const propuesta = { id:'pendiente', type:'CREATE_TRANSACTION', summary:'Gasto', data:{tipo:'GASTO',monto:25,categoriaId:null}, version:0 } as any;
    component.categories.set([{ id:1, nombre:'Comida', tipo:'GASTO', activo:true, esPersonalizada:true }]);
    component.captureTurns.set([{id:1,user:'Gasto 25',answer:'Elige categoria',actions:[propuesta],voice:false}]);
    vi.spyOn(TestBed.inject(FinanzasService), 'editarPropuestaAi').mockReturnValueOnce(of({success:false,message:'Error temporal'} as any));
    component.content = 'comida'; component.submit();
    expect(component.content).toBe('comida');
    expect(component.captureTurns()[0].actions[0].data['categoriaId']).toBeNull();
    expect(component.error()).toBe('Error temporal');
  });

  it('no elige automaticamente cuando restaurantes puede referirse a dos categorias', () => {
    const propuesta = { id:'pendiente', type:'CREATE_TRANSACTION', summary:'Gasto', data:{tipo:'GASTO',monto:25,categoriaId:null}, version:0 } as any;
    component.categories.set([{ id:1,nombre:'Comida',tipo:'GASTO',activo:true,esPersonalizada:true },{ id:2,nombre:'Alimentos y Supermercado',tipo:'GASTO',activo:true,esPersonalizada:true }]);
    component.captureTurns.set([{id:1,user:'Gasto 25',answer:'Elige categoria',actions:[propuesta],voice:false}]);
    component.content='restaurantes';component.submit();
    expect(TestBed.inject(FinanzasService).editarPropuestaAi).not.toHaveBeenCalled();
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
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
    const anterior = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const obtener = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {configurable:true,value:{getUserMedia:obtener}});
    try {
      component.toggleVoice();
      expect(component.permisoVoz()).toBe(true);
      expect(component.listening()).toBe(false);
      expect(component.processingStep()).toBeNull();
      expect(obtener).not.toHaveBeenCalled();
    } finally {
      if (anterior) Object.defineProperty(navigator, 'mediaDevices', anterior);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
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
      component.voiceConsent = true;
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

  it('al transcribir deja el texto para revisar sin interpretar ni guardar', async () => {
    vi.stubGlobal('isSecureContext', true);
    const anterior = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    Object.defineProperty(navigator, 'mediaDevices', {configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:vi.fn()}]})}});
    let recorder: any;
    class Grabador {
      static isTypeSupported() { return true; }
      state = 'inactive'; mimeType = 'audio/webm'; ondataavailable: any; onerror: any; onstop: any;
      constructor() { recorder = this; }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable({data:new Blob(['audio'])}); this.onstop(); }
    }
    vi.stubGlobal('MediaRecorder', Grabador);
    try {
      component.abrirCapturaDesdeAcceso(new CustomEvent('kaptal-abrir-captura-chat',{detail:{voz:true}}));
      component.permitirVoz(); await Promise.resolve();
      expect(recorder.state).toBe('recording'); component.toggleVoice();
      expect(component.content).toBe('Gasté 50 en café');
      expect(component.open()).toBe(false); expect(component.pantallaVoz()).toBe(true);
      expect(component.transcripcionLista()).toBe(true);
      component.content = 'Texto editado'; component.abrirEscrituraDesdeVoz();
      expect(component.content).toBe('Texto editado'); expect(component.open()).toBe(true);
      expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
      expect(component.captureTurns()).toEqual([]);
    } finally {
      if(anterior) Object.defineProperty(navigator,'mediaDevices',anterior); else Reflect.deleteProperty(navigator,'mediaDevices');
    }
  });

  it('muestra una transcripcion provisional sin solapar solicitudes ni aceptar respuestas tras cancelar', () => {
    const respuesta = new Subject<any>();
    const transcribir = vi.spyOn(TestBed.inject(FinanzasService), 'transcribirAudio').mockReturnValue(respuesta);
    component.pantallaVoz.set(true); component.listening.set(true);
    (component as any).voiceGeneration = 7;
    (component as any).audioChunks = [new Blob(['audio'])];
    (component as any).mediaRecorder = {mimeType:'audio/webm',state:'inactive'};
    (component as any).previsualizarAudio(7); (component as any).previsualizarAudio(7);
    expect(transcribir).toHaveBeenCalledOnce();
    respuesta.next({success:true,data:'Texto provisional'});
    expect(component.transcripcionParcial()).toBe('Texto provisional');
    component.cerrarPantallaVoz();
    respuesta.next({success:true,data:'Respuesta tardía'});
    expect(component.transcripcionParcial()).toBe('');
    expect(TestBed.inject(FinanzasService).confirmAiAction).not.toHaveBeenCalled();
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
      component.voiceConsent = true; component.toggleVoice(); component.close();
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
    expect(capture).toHaveBeenCalledWith('Reporte de hoy',false,false,null,null,[]);
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
    expect(capture).toHaveBeenLastCalledWith('80',false,false,'Gasto en tacos',null,[]);
    result.next({success:true,data:{answer:'Listo',actions:[],contexto:'Gasto en tacos'}});
    component.content='Reporte de hoy';component.submit();
    expect(capture).toHaveBeenLastCalledWith('Reporte de hoy',false,false,null,null,[]);
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
