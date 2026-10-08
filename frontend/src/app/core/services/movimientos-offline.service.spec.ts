import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { FinanzasService } from './finanzas.service';
import { MovimientosOfflineService } from './movimientos-offline.service';

describe('MovimientosOfflineService: commit y reintentos',()=>{
  const usuario=signal<any>(null);
  let servicio:any;
  const crear=vi.fn(),confirmar=vi.fn();
  beforeEach(()=>{
    usuario.set(null);crear.mockReset();confirmar.mockReset();
    TestBed.configureTestingModule({providers:[
      {provide:AuthService,useValue:{currentUser:usuario}},
      {provide:FinanzasService,useValue:{crearTransaccion:crear,confirmAiAction:confirmar}}
    ]});
    servicio=TestBed.inject(MovimientosOfflineService);
  });
  it('no confirma el guardado antes del commit',async()=>{
    const tx:any={objectStore:()=>({}),abort:vi.fn()};
    vi.spyOn(servicio,'abrirBase').mockResolvedValue({transaction:()=>tx});
    let terminado=false;
    const p=servicio.transaccion('movimientos','readwrite',(_:any,done:any)=>done('guardado')).then((v:any)=>{terminado=true;return v;});
    await Promise.resolve();await Promise.resolve();
    expect(terminado).toBe(false);
    tx.oncomplete();expect(await p).toBe('guardado');
  });
  it('rechaza un aborto posterior al éxito de la solicitud',async()=>{
    const tx:any={objectStore:()=>({}),error:null,abort:vi.fn()};
    vi.spyOn(servicio,'abrirBase').mockResolvedValue({transaction:()=>tx});
    const p=servicio.transaccion('movimientos','readwrite',(_:any,done:any)=>done());
    const rechazo=expect(p).rejects.toThrow('canceló');
    await Promise.resolve();tx.onabort();await rechazo;
  });
  function cola(){
    usuario.set({id:1});
    const e:any={id:'uuid-original',usuarioId:1,payload:{tipo:'GASTO',monto:25,cuentaId:1},estado:'PENDIENTE'};
    vi.spyOn(servicio,'listarDeUsuario').mockResolvedValue([e]);
    vi.spyOn(servicio,'cargarPendientes').mockResolvedValue(undefined);
    vi.spyOn(servicio,'guardarEntrada').mockResolvedValue(undefined);
    vi.spyOn(servicio,'eliminar').mockResolvedValue(undefined);
    return e;
  }
  it('conserva payload y clave si no hay confirmación',async()=>{
    const e=cola();crear.mockReturnValue(throwError(()=>({status:0})));
    expect(await servicio.sincronizarUsuario(1)).toBe(0);
    expect(crear).toHaveBeenCalledWith(e.payload,'uuid-original');
    expect(servicio.eliminar).not.toHaveBeenCalled();
    expect(e.estado).toBe('PENDIENTE');
  });
  it('no repite automáticamente una solicitud rechazada',async()=>{
    const e=cola();crear.mockReturnValue(throwError(()=>({status:400})));
    await servicio.sincronizarUsuario(1);await servicio.sincronizarUsuario(1);
    expect(e.estado).toBe('REVISAR');expect(crear).toHaveBeenCalledOnce();
  });
  it('confirma propuestas por ID y versión originales',async()=>{
    const e=cola();e.propuestaId='propuesta-original';e.versionPropuesta=3;
    confirmar.mockReturnValue(of({success:true,data:{completed:true}}));
    expect(await servicio.sincronizarUsuario(1)).toBe(1);
    expect(confirmar).toHaveBeenCalledWith('propuesta-original',3);
    expect(crear).not.toHaveBeenCalled();expect(servicio.eliminar).toHaveBeenCalledWith(e.id,1);
  });
  it('no muestra la cola del usuario anterior tras cambiar cuenta',async()=>{
    usuario.set({id:1});let resolver:any;
    vi.spyOn(servicio,'listarDeUsuario').mockReturnValue(new Promise(r=>resolver=r));
    const carga=servicio.cargarPendientes(1);usuario.set({id:2});resolver([{id:'ajeno'}]);await carga;
    expect(servicio.pendientes()).toEqual([]);
  });
});
