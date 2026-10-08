import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { ActualizacionPwaService } from './actualizacion-pwa.service';
import { MovimientosOfflineService } from './movimientos-offline.service';

describe('Actualización PWA protege borradores',()=>{
  let servicio:any,recargar:any;
  const eventos=new Subject<any>(),sincronizando=signal(false);
  beforeEach(()=>{
    sincronizando.set(false);
    TestBed.configureTestingModule({providers:[
      {provide:SwUpdate,useValue:{isEnabled:true,versionUpdates:eventos,unrecoverable:new Subject()}},
      {provide:MovimientosOfflineService,useValue:{sincronizando}}
    ]});
    servicio=TestBed.inject(ActualizacionPwaService);recargar=vi.spyOn(servicio,'recargar').mockImplementation(()=>{});
    eventos.next({type:'VERSION_READY'});
  });
  it('espera el guardado antes de recargar',async()=>{
    let resolver:any;servicio.proteger(()=>new Promise(r=>resolver=r));
    const p=servicio.actualizar();expect(recargar).not.toHaveBeenCalled();
    resolver(true);expect(await p).toBe(true);expect(recargar).toHaveBeenCalledOnce();
  });
  it('no recarga si el almacenamiento falla',async()=>{
    servicio.proteger(async()=>{throw new Error('Sin espacio');});
    expect(await servicio.actualizar()).toBe(false);expect(recargar).not.toHaveBeenCalled();
    expect(servicio.error()).toBe('Sin espacio');
  });
  it('espera sincronización y grabación',async()=>{
    sincronizando.set(true);expect(await servicio.actualizar()).toBe(false);
    sincronizando.set(false);servicio.proteger(async()=>false);
    expect(await servicio.actualizar()).toBe(false);expect(recargar).not.toHaveBeenCalled();
  });
});
