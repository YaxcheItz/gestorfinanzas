import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MovimientosOfflineService } from './movimientos-offline.service';

@Injectable({providedIn:'root'})
export class ActualizacionPwaService {
  private readonly sw=inject(SwUpdate,{optional:true});
  private readonly document=inject(DOCUMENT);
  private readonly offline=inject(MovimientosOfflineService);
  private readonly destroyRef=inject(DestroyRef);
  private readonly protectores=new Set<()=>Promise<boolean>>();
  readonly disponible=signal(false);
  readonly aplicando=signal(false);
  readonly error=signal('');
  constructor(){
    if(!this.sw?.isEnabled)return;
    this.sw.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event=>{
      if(event.type==='VERSION_READY')this.disponible.set(true);
      if(event.type==='VERSION_INSTALLATION_FAILED')this.error.set('No se pudo descargar la actualización. Tu versión actual sigue disponible.');
    });
    this.sw.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(()=>{this.disponible.set(true);this.error.set('La versión necesita recargarse. Guarda el borrador antes de actualizar.');});
  }
  proteger(guardar:()=>Promise<boolean>):()=>void {this.protectores.add(guardar);return()=>this.protectores.delete(guardar);}
  async actualizar():Promise<boolean>{
    if(!this.disponible()||this.aplicando())return false;
    this.aplicando.set(true);this.error.set('');
    try{
      if(this.offline.sincronizando())throw new Error('Espera a que termine la sincronización.');
      if([...this.document.querySelectorAll('form.ng-dirty')].some(form=>!form.closest('#quick-capture-panel')))
        throw new Error('Termina o cierra el formulario abierto antes de actualizar.');
      for(const guardar of this.protectores)if(!await guardar())throw new Error('Espera a que termine el guardado o la grabación.');
      if(this.offline.sincronizando())throw new Error('Espera a que termine la sincronización.');
      this.recargar();return true;
    }catch(error){this.error.set(error instanceof Error?error.message:'No se guardó el borrador. No se actualizará todavía.');return false;}
    finally{this.aplicando.set(false);}
  }
  /** Una recarga evita mezclar chunks de dos versiones. No activar una versión sobre la página antigua. */
  protected recargar():void{this.document.defaultView?.location.reload();}
}
