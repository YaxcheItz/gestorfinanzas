import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { AiActionProposal } from '../models/ai.models';
import { Categoria, Cuenta, TransaccionPayload } from '../models/finanzas.models';
import { AuthService } from './auth.service';
import { FinanzasService } from './finanzas.service';

export interface MovimientoPendiente {
  id:string; usuarioId:number; payload:TransaccionPayload; creadoEn:string; error?:string;
  propuestaId?:string; versionPropuesta?:number; estado?:'PENDIENTE'|'REVISAR';
}
export interface CatalogoOffline { usuarioId:number;cuentas:Cuenta[];categorias:Categoria[];actualizadoEn:string; }
export interface BorradorChat {
  revision?:string;
  usuarioId:number;texto:string;acciones:AiActionProposal[];contexto?:string|null;
  editandoId?:string|null;edicion?:Record<string,unknown>;actualizadoEn:string;
}
@Injectable({providedIn:'root'})
export class MovimientosOfflineService {
  private readonly document=inject(DOCUMENT);
  private readonly auth=inject(AuthService);
  private readonly finanzas=inject(FinanzasService);
  private readonly destroyRef=inject(DestroyRef);
  private dbPromise?:Promise<IDBDatabase>;
  private sincronizacionEnCurso=false;
  private usuarioVisible:number|null=null;
  private readonly revisiones=new Map<number,string|undefined>();
  private readonly cambioCuenta=new Subject<void>();
  readonly conexion=signal(this.document.defaultView?.navigator.onLine??true);
  readonly pendientes=signal<MovimientoPendiente[]>([]);
  readonly sincronizando=signal(false);
  readonly totalSincronizados=signal(0);
  readonly errorAlmacenamiento=signal<string|null>(null);
  readonly permisoNotificaciones=signal<NotificationPermission|'unsupported'>('unsupported');
  constructor(){
    const vista=this.document.defaultView;
    if(vista&&'Notification' in vista)this.permisoNotificaciones.set(vista.Notification.permission);
    const online=()=>{this.conexion.set(true);void this.sincronizar();};const offline=()=>this.conexion.set(false);
    vista?.addEventListener('online',online);vista?.addEventListener('offline',offline);
    this.destroyRef.onDestroy(()=>{vista?.removeEventListener('online',online);vista?.removeEventListener('offline',offline);this.cambioCuenta.next();this.cambioCuenta.complete();});
    effect(()=>{
      const id=this.auth.currentUser()?.id??null;if(id===this.usuarioVisible)return;
      this.usuarioVisible=id;this.cambioCuenta.next();this.pendientes.set([]);this.totalSincronizados.set(0);this.errorAlmacenamiento.set(null);
      if(id!==null)untracked(()=>void this.cargarPendientes(id).then(()=>this.sincronizar()));
    });
  }
  private exigirUsuario(id:number):void{if(this.auth.currentUser()?.id!==id)throw new Error('La cuenta cambió. Abre de nuevo el chat.');}
  private actual(id:number):boolean{return this.auth.currentUser()?.id===id;}
  async guardarPendiente(usuarioId:number,id:string,payload:TransaccionPayload):Promise<void>{
    await this.encolar({id,usuarioId,payload,creadoEn:new Date().toISOString(),estado:'PENDIENTE'});
  }
  async guardarConfirmacion(usuarioId:number,p:AiActionProposal,payload:TransaccionPayload):Promise<void>{
    await this.encolar({id:'propuesta:'+p.id,usuarioId,payload,propuestaId:p.id,versionPropuesta:p.version??0,creadoEn:new Date().toISOString(),estado:'PENDIENTE'});
  }
  private iguales(a:unknown,b:unknown):boolean{
    const ordenar=(v:unknown):unknown=>v&&typeof v==='object'&&!Array.isArray(v)
      ?Object.fromEntries(Object.entries(v as Record<string,unknown>).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,ordenar(v)])):v;
    return JSON.stringify(ordenar(a))===JSON.stringify(ordenar(b));
  }
  private async encolar(e:MovimientoPendiente):Promise<void>{
    this.exigirUsuario(e.usuarioId);
    const revision=await this.transaccion<string|undefined>(['movimientos','borradores'],'readwrite',(s,done,fail,tx)=>{
      const r=s.get(e.id);r.onsuccess=()=>{
        const anterior=r.result as MovimientoPendiente|undefined;
        if(anterior&&(anterior.usuarioId!==e.usuarioId||!this.iguales(anterior.payload,e.payload)||anterior.propuestaId!==e.propuestaId||anterior.versionPropuesta!==e.versionPropuesta)){
          fail(new Error('Esta solicitud ya tiene datos confirmados. Reinténtala sin cambiarlos.'));return;
        }s.put(anterior??structuredClone(e));
        const borradores=tx.objectStore('borradores'),b=borradores.get(e.usuarioId);
        b.onsuccess=()=>{const previo=b.result as BorradorChat|undefined;
          if(previo){const ids=new Set([e.id,e.propuestaId]);previo.acciones=previo.acciones.filter(p=>!ids.has(p.id));
            if(previo.editandoId&&ids.has(previo.editandoId)){previo.editandoId=null;previo.edicion=undefined;}
            previo.revision=crypto.randomUUID();borradores.put(previo);
          }done(previo?.revision);
        };
      };
    });if(revision)this.revisiones.set(e.usuarioId,revision);this.exigirUsuario(e.usuarioId);await this.cargarPendientes(e.usuarioId);
  }
  async guardarCatalogo(usuarioId:number,cuentas:Cuenta[],categorias:Categoria[]):Promise<void>{
    this.exigirUsuario(usuarioId);
    const c:CatalogoOffline={usuarioId,categorias,actualizadoEn:new Date().toISOString(),cuentas:cuentas.map(c=>({id:c.id,nombre:c.nombre,tipo:c.tipo,saldoActual:0,moneda:c.moneda,activo:c.activo,fechaCreacion:c.fechaCreacion,saldoLocalDesactualizado:true}))};
    await this.transaccion<void>('catalogos','readwrite',(s,done)=>{s.put(c);done();});
  }
  async leerCatalogo(usuarioId:number):Promise<CatalogoOffline|null>{this.exigirUsuario(usuarioId);const c=await this.leer<CatalogoOffline>('catalogos',usuarioId);this.exigirUsuario(usuarioId);return c;}
  async guardarBorrador(b:BorradorChat):Promise<void>{
    this.exigirUsuario(b.usuarioId);if(b.texto.length>1200||b.acciones.length>50||JSON.stringify(b).length>200000)throw new Error('El borrador es demasiado grande.');
    const revision=crypto.randomUUID(),base=this.revisiones.get(b.usuarioId);
    await this.transaccion<void>('borradores','readwrite',(s,done,fail)=>{const r=s.get(b.usuarioId);r.onsuccess=()=>{
      if(r.result&&r.result.revision!==base){fail(new Error('Otro chat cambió el borrador guardado. Conserva este texto antes de recargar.'));return;}
      s.put({...structuredClone(b),revision});done();
    };});this.revisiones.set(b.usuarioId,revision);
  }
  async leerBorrador(usuarioId:number):Promise<BorradorChat|null>{this.exigirUsuario(usuarioId);const b=await this.leer<BorradorChat>('borradores',usuarioId);this.exigirUsuario(usuarioId);this.revisiones.set(usuarioId,b?.revision);return b;}
  private leer<T>(nombre:string,key:IDBValidKey):Promise<T|null>{return this.transaccion<T|null>(nombre,'readonly',(s,done)=>{const r=s.get(key);r.onsuccess=()=>done((r.result as T|undefined)??null);});}
  async descartar(id:string):Promise<void>{
    const uid=this.auth.currentUser()?.id;if(uid==null)return;if(this.sincronizacionEnCurso)throw new Error('Espera a que termine la sincronización.');
    const eliminar=async()=>{await this.eliminar(id,uid);await this.cargarPendientes(uid);};
    const locks=this.document.defaultView?.navigator.locks;
    if(locks)await locks.request('kaptal-offline-'+uid,{ifAvailable:true},lock=>{if(!lock)throw new Error('Otra pestaña está sincronizando. Espera.');return eliminar();});else await eliminar();
  }
  async solicitarNotificaciones():Promise<void>{
    const api=this.document.defaultView?.Notification;if(!api){this.permisoNotificaciones.set('unsupported');return;}
    try{this.permisoNotificaciones.set(await api.requestPermission());}catch{this.permisoNotificaciones.set(api.permission);}
  }
  async sincronizar():Promise<number>{
    const uid=this.auth.currentUser()?.id;if(uid==null||!this.document.defaultView?.navigator.onLine||this.sincronizacionEnCurso)return 0;
    this.sincronizacionEnCurso=true;this.sincronizando.set(true);
    try{const locks=this.document.defaultView?.navigator.locks;return locks?await locks.request('kaptal-offline-'+uid,{ifAvailable:true},lock=>lock?this.sincronizarUsuario(uid):0):await this.sincronizarUsuario(uid);}
    catch{if(this.actual(uid))this.errorAlmacenamiento.set('No se pudo confirmar el almacenamiento local. Los pendientes se conservan.');return 0;}
    finally{this.sincronizando.set(false);this.sincronizacionEnCurso=false;if(this.auth.currentUser()?.id!==uid&&this.auth.currentUser())queueMicrotask(()=>void this.sincronizar());}
  }
  private async sincronizarUsuario(uid:number):Promise<number>{
    let completados=0;
    for(const e of await this.listarDeUsuario(uid)){
      if(!this.actual(uid)||!this.document.defaultView?.navigator.onLine)break;if(e.estado==='REVISAR')continue;
      try{
        const r=e.propuestaId?await firstValueFrom(this.finanzas.confirmAiAction(e.propuestaId,e.versionPropuesta??0).pipe(takeUntil(this.cambioCuenta)))
          :await firstValueFrom(this.finanzas.crearTransaccion(e.payload,e.id).pipe(takeUntil(this.cambioCuenta)));
        if(!this.actual(uid))break;
        if(!r.success||!r.data||(e.propuestaId&&(!('completed' in r.data)||!r.data.completed)))throw new Error('La API no confirmó el registro.');
        await this.eliminar(e.id,uid);completados++;
      }catch(error:unknown){
        if(!this.actual(uid))break;const status=(error as {status?:number})?.status;
        e.estado=status!==undefined&&status>=400&&status<500&&status!==401&&status!==429?'REVISAR':'PENDIENTE';
        const motivo=(error as {error?:{message?:unknown}})?.error?.message;
        e.error=e.estado==='REVISAR'?'El servidor rechazó el registro. '+(typeof motivo==='string'?motivo.slice(0,500)+' ':'')+'No se reintentará automáticamente.':'Resultado sin confirmar. Se reintentará la misma solicitud, sin duplicarla.';
        await this.guardarEntrada(e);if(e.estado!=='REVISAR')break;
      }
    }
    if(this.actual(uid)){
      await this.cargarPendientes(uid);if(!this.actual(uid))return completados;
      this.totalSincronizados.update(n=>n+completados);
      if(completados){this.document.defaultView?.dispatchEvent(new Event('kaptal-movimiento-guardado'));
        const api=this.document.defaultView?.Notification;
        if(api&&this.permisoNotificaciones()==='granted')try{new api('Kaptal sincronizó tus movimientos',{body:completados+' movimiento(s) registrados.',tag:'kaptal-offline-sync'});}catch{/* El permiso de notificación no cambia el resultado financiero. */}
      }
    }return completados;
  }
  private async cargarPendientes(uid:number):Promise<void>{
    try{const entradas=await this.listarDeUsuario(uid);if(this.actual(uid)){this.pendientes.set(entradas);this.errorAlmacenamiento.set(null);}}
    catch{if(this.actual(uid)){this.pendientes.set([]);this.errorAlmacenamiento.set('No se pudo leer el almacenamiento local.');}}
  }
  private listarDeUsuario(uid:number):Promise<MovimientoPendiente[]>{return this.transaccion<MovimientoPendiente[]>('movimientos','readonly',(s,done)=>{const r=s.index('usuarioId').getAll(uid);r.onsuccess=()=>done((r.result as MovimientoPendiente[]).sort((a,b)=>a.creadoEn.localeCompare(b.creadoEn)));});}
  private guardarEntrada(e:MovimientoPendiente):Promise<void>{return this.transaccion<void>('movimientos','readwrite',(s,done)=>{s.put(e);done();});}
  private eliminar(id:string,uid:number):Promise<void>{
    this.exigirUsuario(uid);return this.transaccion<void>('movimientos','readwrite',(s,done,fail)=>{const r=s.get(id);r.onsuccess=()=>{if(r.result&&r.result.usuarioId!==uid){fail(new Error('El pendiente no pertenece a esta cuenta.'));return;}s.delete(id);done();};});
  }
  /** El éxito de una solicitud no garantiza commit: solo oncomplete confirma el guardado. */
  private async transaccion<T>(nombre:string|string[],modo:IDBTransactionMode,operar:(s:IDBObjectStore,done:(v?:T)=>void,fail:(e:Error)=>void,tx:IDBTransaction)=>void):Promise<T>{
    const db=await this.abrirBase();return new Promise<T>((resolve,reject)=>{
      const tx=db.transaction(nombre,modo);let resultado:T;let error:Error|undefined;
      tx.oncomplete=()=>resolve(resultado);tx.onabort=()=>reject(error??tx.error??new Error('Se canceló el guardado local.'));
      tx.onerror=()=>{error??=tx.error??new Error('Falló el almacenamiento local.');};
      try{operar(tx.objectStore(Array.isArray(nombre)?nombre[0]:nombre),v=>{resultado=v as T;},e=>{error=e;tx.abort();},tx);}
      catch(e){error=e instanceof Error?e:new Error('No se pudo operar el almacenamiento local.');tx.abort();}
    });
  }
  private abrirBase():Promise<IDBDatabase>{
    if(this.dbPromise)return this.dbPromise;const api=this.document.defaultView?.indexedDB;if(!api)return Promise.reject(new Error('Este navegador no ofrece almacenamiento local.'));
    const apertura=new Promise<IDBDatabase>((resolve,reject)=>{
      const r=api.open('kaptal-movimientos-offline',3);let rechazada=false;
      r.onupgradeneeded=()=>{const db=r.result;
        if(!db.objectStoreNames.contains('movimientos'))db.createObjectStore('movimientos',{keyPath:'id'}).createIndex('usuarioId','usuarioId');
        if(!db.objectStoreNames.contains('catalogos'))db.createObjectStore('catalogos',{keyPath:'usuarioId'});
        if(!db.objectStoreNames.contains('borradores'))db.createObjectStore('borradores',{keyPath:'usuarioId'});
      };
      r.onblocked=()=>{rechazada=true;reject(new Error('Cierra otras pestañas antiguas para actualizar el almacenamiento.'));};
      r.onsuccess=()=>{if(rechazada){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();this.dbPromise=undefined;};resolve(r.result);};
      r.onerror=()=>reject(r.error??new Error('No se pudo iniciar el almacenamiento local.'));
    });this.dbPromise=apertura.catch(error=>{this.dbPromise=undefined;throw error;});return this.dbPromise;
  }
}
