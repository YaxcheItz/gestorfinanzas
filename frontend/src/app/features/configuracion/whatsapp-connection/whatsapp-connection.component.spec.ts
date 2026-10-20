import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {WhatsappConnectionComponent} from './whatsapp-connection.component';
import {WhatsappConnection} from '../../../core/services/whatsapp-connection.service';
import {ConfirmDialogService} from '../../../core/services/confirm-dialog.service';

const url='/api/canales/whatsapp/conexion';
const state: WhatsappConnection={disponible:true,operativo:true,estado:'DESCONECTADA',conexionId:null,telefono:null,vence:null,verificada:null,generacion:0,guardarAutomaticamente:false};
describe('WhatsApp account connection',()=>{
  let fixture: ReturnType<typeof TestBed.createComponent<WhatsappConnectionComponent>>;
  let http: HttpTestingController;
  let confirm: ReturnType<typeof vi.fn>;
  beforeEach(async()=>{
    confirm=vi.fn(async()=>true);
    await TestBed.configureTestingModule({imports:[WhatsappConnectionComponent],providers:[provideHttpClient(),provideHttpClientTesting(),{provide:ConfirmDialogService,useValue:{confirm}}]}).compileComponents();
    fixture=TestBed.createComponent(WhatsappConnectionComponent);http=TestBed.inject(HttpTestingController);fixture.detectChanges();
  });
  afterEach(()=>{fixture.destroy();http.verify();});
  function load(data: WhatsappConnection=state){http.expectOne(url).flush({success:true,data});fixture.detectChanges();}
  it('does not show a working connection or consent form when unavailable',()=>{
    load({...state,disponible:false,operativo:false});expect(fixture.nativeElement.textContent).toContain('se está preparando');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
  it('requires explicit consent and a valid international phone before POST',()=>{
    load();const c=fixture.componentInstance;c.telefono='+15555550123';c.iniciar();http.expectNone(url);
    c.consentimiento=true;c.telefono='555123';c.iniciar();http.expectNone(url);
  });
  it('creates one challenge and clears the ephemeral link when verified',()=>{
    load();const c=fixture.componentInstance;c.telefono='+15555550123';c.consentimiento=true;c.automatico=true;c.iniciar();c.iniciar();
    const post=http.expectOne(url);expect(post.request.method).toBe('POST');expect(post.request.body).toEqual({telefono:'+15555550123',aceptarVinculacion:true,guardarAutomaticamente:true});
    const challenge={codigo:'KAPTAL-synthetic',urlWhatsapp:'https://wa.me/15555550100?text=vincular%20synthetic',vence:new Date(Date.now()+600000).toISOString()};
    post.flush({success:true,data:challenge});load({...state,estado:'PENDIENTE',vence:challenge.vence});
    expect(fixture.nativeElement.querySelector('a')?.href).toBe(challenge.urlWhatsapp);
    c.actualizar();load({...state,estado:'VERIFICADA',telefono:'•••• 0123'});
    expect(c.desafio()).toBeNull();expect(fixture.nativeElement.textContent).toContain('Conectado');expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
  it('verification alone does not claim financial service is active',()=>{
    load({...state,operativo:false,estado:'VERIFICADA',telefono:'•••• 0123'});
    expect(fixture.nativeElement.textContent).toContain('Número verificado');expect(fixture.nativeElement.textContent).not.toContain('Conectado');
  });
  it('explains that undo identifies the movement and asks for confirmation',()=>{
    load({...state,estado:'VERIFICADA',telefono:'•••• 0123'});
    const help=fixture.nativeElement.textContent;
    expect(help).toContain('Escribe «deshacer» para revisar el último movimiento');
    expect(help).toContain('confirma antes de eliminarlo');
  });
  it('keeps an actual connection visible when refreshing fails',()=>{
    load({...state,estado:'VERIFICADA',telefono:'•••• 0123'});fixture.componentInstance.actualizar();
    http.expectOne(url).flush({message:'Sin conexión'},{status:503,statusText:'Unavailable'});fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin conexión');expect(fixture.nativeElement.textContent).toContain('Conectado');
  });
  it('requires confirmation and only clears the connection after DELETE succeeds',async()=>{
    load({...state,estado:'VERIFICADA',telefono:'•••• 0123'});await fixture.componentInstance.desconectar();expect(confirm).toHaveBeenCalledOnce();
    const request=http.expectOne(url);expect(request.request.method).toBe('DELETE');request.flush({success:true,data:state});fixture.detectChanges();
    expect(fixture.componentInstance.estado()?.estado).toBe('DESCONECTADA');
  });
  it('rejects links to another site and does not enable an external redirect',()=>{
    load();const c=fixture.componentInstance;c.telefono='+15555550123';c.consentimiento=true;c.iniciar();
    http.expectOne(url).flush({success:true,data:{codigo:'synthetic',urlWhatsapp:'https://other.example.test/',vence:''}});fixture.detectChanges();
    expect(c.desafio()).toBeNull();expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
  it('does not announce changed preferences on an API error',()=>{
    load({...state,estado:'VERIFICADA'});fixture.componentInstance.preferencias(true);
    const request=http.expectOne(url+'/preferencias');expect(request.request.method).toBe('PATCH');request.flush({message:'No se pudo guardar'},{status:503,statusText:'Unavailable'});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=switch]')?.getAttribute('aria-checked')).toBe('false');
  });
});
