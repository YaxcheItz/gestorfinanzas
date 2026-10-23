import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { AvisosComponent } from './avisos.component';
import { AvisosService } from '../core/services/avisos.service';
import { FinanzasService } from '../core/services/finanzas.service';
import { ListaContextoService } from '../core/services/lista-contexto.service';
import { SharedNoticeService } from '../core/services/shared-notice.service';

describe('Bandeja de avisos',()=>{
  let fixture:ReturnType<typeof TestBed.createComponent<AvisosComponent>>;
  let api:any;
  let shared:any;
  beforeEach(()=>{
    api={listar:vi.fn(()=>of({success:true,data:{content:[],totalPages:0}})),recibir:vi.fn(),editar:vi.fn(),decidir:vi.fn()};
    shared={pending:signal(null),error:signal(''),isCurrent:vi.fn(()=>true),discard:vi.fn(()=>Promise.resolve())};
    TestBed.configureTestingModule({imports:[AvisosComponent],providers:[
      {provide:AvisosService,useValue:api},
      {provide:SharedNoticeService,useValue:shared},
      {provide:FinanzasService,useValue:{getCuentas:()=>of({data:[]}),getCategorias:()=>of({data:[]})}},
      {provide:ListaContextoService,useValue:{activaId:signal(1),listas:signal([])}}
    ]}).overrideComponent(AvisosComponent,{set:{template:''}});
  });
  afterEach(()=>fixture?.destroy());
  it('ignora una respuesta antigua al cambiar de filtro',()=>{
    const anterior=new Subject<any>();api.listar.mockReturnValueOnce(anterior);
    fixture=TestBed.createComponent(AvisosComponent);const c=fixture.componentInstance;
    api.listar.mockReturnValueOnce(of({data:{content:[{id:'nuevo'}],totalPages:1}}));
    c.filtrar('REGISTRADO');anterior.next({data:{content:[{id:'anterior'}],totalPages:1}});
    expect(c.avisos().map(x=>x.id)).toEqual(['nuevo']);
  });
  it('conserva identificador y datos al reintentar una recepcion incierta',()=>{
    fixture=TestBed.createComponent(AvisosComponent);const c=fixture.componentInstance;
    c.nuevo();c.resumen='Aviso';c.datos.descripcion='Compra';const envio=new Subject<any>();api.recibir.mockReturnValue(envio);
    c.guardarDatos();c.guardarDatos();expect(api.recibir).toHaveBeenCalledOnce();
    const primero=structuredClone(api.recibir.mock.calls[0][0]);envio.error({status:0});
    expect(c.formulario()).toBe(true);expect(c.errorFormulario()).not.toBe('');
    api.recibir.mockReturnValue(of({data:{id:'confirmado'}}));c.guardarDatos();
    expect(api.recibir.mock.calls[1][0]).toEqual(primero);
  });
  it('pide una decision explicita ante coincidencias',()=>{
    fixture=TestBed.createComponent(AvisosComponent);const c=fixture.componentInstance;
    const aviso={id:'aviso',version:3,coincidencias:[14]} as any;
    c.prepararConfirmacion(aviso);expect(c.confirmacion()).toEqual(aviso);expect(api.decidir).not.toHaveBeenCalled();
    api.decidir.mockReturnValue(of({data:{estado:'REGISTRADO'}}));c.ejecutar(aviso,'confirmar',true);
    expect(api.decidir).toHaveBeenCalledWith(aviso,'confirmar',true);
  });
  it('compartir no envia el original y reintenta con la misma identidad sin mover dinero',()=>{
    shared.pending.set({id:'texto-qa',text:'Original privado de prueba por $42'});
    fixture=TestBed.createComponent(AvisosComponent);const c=fixture.componentInstance;
    c.usarCompartido();expect(api.recibir).not.toHaveBeenCalled();
    expect(c.resumen).toBe('');expect(c.datos.descripcion).toBe('');
    c.resumen='Compra QA';c.datos.monto=42;
    const attempt=new Subject<any>();api.recibir.mockReturnValue(attempt);c.guardarDatos();
    expect(api.recibir.mock.calls[0][0].identificador).toBe('android-compartido:texto-qa');
    expect(JSON.stringify(api.recibir.mock.calls[0][0])).not.toContain('Original privado');
    attempt.error({status:0});expect(shared.discard).not.toHaveBeenCalled();
    api.recibir.mockReturnValue(of({success:true,data:{id:'aviso'}}));c.guardarDatos();
    expect(api.recibir.mock.calls[1][0]).toEqual(api.recibir.mock.calls[0][0]);
    expect(shared.discard).toHaveBeenCalledWith('texto-qa');expect(api.decidir).not.toHaveBeenCalled();
  });
  it('impide enviar un texto si cambio la sesion mientras estaba abierto',()=>{
    shared.pending.set({id:'texto-qa',text:'Solo QA'});
    fixture=TestBed.createComponent(AvisosComponent);const c=fixture.componentInstance;c.usarCompartido();
    shared.isCurrent.mockReturnValue(false);c.guardarDatos();
    expect(api.recibir).not.toHaveBeenCalled();expect(c.errorFormulario()).toContain('sesión');
  });
});
