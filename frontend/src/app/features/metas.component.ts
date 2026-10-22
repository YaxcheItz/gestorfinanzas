import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Cuenta, MONEDAS_DISPONIBLES, TransaccionPayload } from '../core/models/finanzas.models';
import { ApiResponse } from '../core/models/auth.models';
import { FinanzasService } from '../core/services/finanzas.service';
import { getApiBaseUrl } from '../core/services/api-base-url';
import { MontoPipe } from '../core/pipes/monto.pipe';
import { MontoPrivadoDirective } from '../shared/directives/monto-privado.directive';
import { fechaCivilFinanciera } from '../core/utils/periodo-financiero';

@Component({
  selector:'app-metas',imports:[FormsModule,MontoPipe,MontoPrivadoDirective],
  template:`<section aria-label="Metas de ahorro" class="mx-auto max-w-3xl space-y-6 p-4 pb-32">
    <h1 class="text-3xl font-semibold">Metas de ahorro</h1>
    <p>Cada meta es un apartado virtual de tus fondos. Aportar y retirar transfiere entre tus cuentas; no crea ingresos ni gastos.</p>
    @if(error()){<p role="alert">{{error()}}</p><button type="button" (click)="cargar()" [disabled]="ocupada()">Reintentar</button>}
    <form (ngSubmit)="crear()" class="space-y-3 rounded-2xl border p-4">
      <h2 class="text-xl font-semibold">Nueva meta</h2>
      <label>Nombre<input name="nombreMeta" [(ngModel)]="nombre" required minlength="2" maxlength="100" /></label>
      <label>Objetivo<input appMontoPrivado name="objetivoMeta" [(ngModel)]="objetivo" type="number" inputmode="decimal" min="0.01" step="0.01" required /></label>
      <label>Moneda<select name="monedaMeta" [(ngModel)]="moneda">@for(m of monedas;track m.codigo){<option [value]="m.codigo">{{m.codigo}}</option>}</select></label>
      <button [disabled]="ocupada()" type="submit">Crear meta</button>
    </form>
    @for(meta of metas();track meta.id){
      <article class="space-y-3 rounded-2xl border p-4">
        <h2 class="text-xl font-semibold">{{meta.nombre}}</h2>
        <p>{{meta.saldoActual | monto:meta.moneda}} de {{meta.metaObjetivo! | monto:meta.moneda}}</p>
        <p>{{meta.metaCancelada ? 'Cancelada · fondos conservados' : meta.saldoActual >= meta.metaObjetivo! ? 'Objetivo alcanzado' : 'En progreso'}}</p>
        <button type="button" [disabled]="ocupada()" (click)="abrir(meta,'aporte')" [hidden]="meta.metaCancelada || !meta.activo">Aportar a {{meta.nombre}}</button>
        <button type="button" [disabled]="ocupada() || meta.saldoActual <= 0 || !meta.activo" (click)="abrir(meta,'retiro')">Retirar de {{meta.nombre}}</button>
        <button type="button" [disabled]="ocupada()" (click)="cancelar(meta)">{{meta.metaCancelada ? 'Reanudar' : 'Cancelar'}} meta {{meta.nombre}}</button>
        @if(elegida()?.id === meta.id){
          <form (ngSubmit)="transferir()" class="space-y-3 border-t pt-3">
            <h3>{{direccion === 'aporte' ? 'Aportar' : 'Retirar'}}</h3>
            <label>Cuenta {{direccion === 'aporte' ? 'de origen' : 'de destino'}}<select [attr.aria-label]="direccion === 'aporte' ? 'Cuenta de origen' : 'Cuenta de destino'" name="cuentaMeta" [(ngModel)]="cuentaId" required><option [ngValue]="null">Elige una cuenta</option>@for(c of disponibles();track c.id){<option [ngValue]="c.id">{{c.nombre}} · {{c.moneda}}</option>}</select></label>
            <label>Importe<input appMontoPrivado name="importeMeta" [(ngModel)]="importe" type="number" inputmode="decimal" min="0.01" step="0.01" required /></label>
            <button [disabled]="ocupada()" type="submit">Confirmar {{direccion === 'aporte' ? 'aporte' : 'retiro'}}</button>
            <button type="button" [disabled]="ocupada()" (click)="elegida.set(null)">Cerrar</button>
          </form>
        }
      </article>
    } @empty {<p>Aún no tienes metas. Crea una y aporta desde una cuenta de la misma moneda.</p>}
    <p>Los movimientos aparecen en tu historial como transferencias. Cancelar no devuelve fondos automáticamente; puedes retirarlos cuando lo decidas.</p>
  </section>`,
  styles:`label{display:grid;gap:6px}input,select,button{min-height:44px;padding:10px;border:1px solid var(--kaptal-border);border-radius:12px;background:var(--kaptal-surface);color:var(--kaptal-content);font-size:16px}input,select{width:100%;min-width:0}button{margin-right:8px}button:disabled{opacity:.5}article{overflow-wrap:anywhere}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--kaptal-focus);outline-offset:2px}`
})
export class MetasComponent implements OnInit {
  private readonly http=inject(HttpClient);
  private readonly finanzas=inject(FinanzasService);
  readonly cuentas=signal<Cuenta[]>([]);readonly ocupada=signal(false);readonly error=signal('');
  readonly metas=computed(()=>this.cuentas().filter(c=>c.metaObjetivo!=null));
  readonly elegida=signal<Cuenta|null>(null);
  readonly disponibles=computed(()=>this.cuentas().filter(c=>c.activo && c.tipo!=='CREDITO' && c.id!==this.elegida()?.id && c.moneda===this.elegida()?.moneda));
  readonly monedas=MONEDAS_DISPONIBLES;
  nombre='';objetivo:number|null=null;moneda='MXN';direccion:'aporte'|'retiro'='aporte';cuentaId:number|null=null;importe:number|null=null;
  private intento:{huella:string;clave:string}|null=null;
  ngOnInit(){void this.cargar();}
  async cargar(){try{const r=await firstValueFrom(this.finanzas.getCuentas(true));if(!r.success)throw new Error(r.message);this.cuentas.set(r.data);this.error.set('');}catch{this.error.set('No se pudieron cargar las metas. Revisa la conexión.');}}
  abrir(meta:Cuenta,direccion:'aporte'|'retiro'){this.elegida.set(meta);this.direccion=direccion;this.cuentaId=null;this.importe=null;this.error.set('');}
  async crear(){await this.ejecutar(async()=>{const r=await firstValueFrom(this.http.post<ApiResponse<Cuenta>>(`${getApiBaseUrl()}/metas`,{nombre:this.nombre,objetivo:this.objetivo,moneda:this.moneda}));if(!r.success)throw new Error(r.message);this.nombre='';this.objetivo=null;});}
  async cancelar(meta:Cuenta){await this.ejecutar(async()=>{const r=await firstValueFrom(this.http.patch<ApiResponse<Cuenta>>(`${getApiBaseUrl()}/metas/${meta.id}/estado`,{cancelada:!meta.metaCancelada}));if(!r.success)throw new Error(r.message);this.elegida.set(null);});}
  async transferir(){const meta=this.elegida();if(!meta||!this.cuentaId||!this.importe)return;
    const payload:TransaccionPayload={cuentaId:this.direccion==='aporte'?this.cuentaId:meta.id,cuentaDestinoId:this.direccion==='aporte'?meta.id:this.cuentaId,tipo:'TRANSFERENCIA',monto:this.importe,fecha:fechaCivilFinanciera(),descripcion:`${this.direccion==='aporte'?'Aporte a':'Retiro de'} meta ${meta.nombre}`.slice(0,200)};
    const huella=JSON.stringify(payload);if(this.intento?.huella!==huella)this.intento={huella,clave:crypto.randomUUID()};const clave=this.intento!.clave;
    await this.ejecutar(async()=>{const r=await firstValueFrom(this.finanzas.crearTransaccion(payload,clave));if(!r.success)throw new Error(r.message);this.intento=null;this.elegida.set(null);});
  }
  private async ejecutar(accion:()=>Promise<void>){if(this.ocupada())return;this.ocupada.set(true);this.error.set('');try{await accion();await this.cargar();}catch(e:unknown){this.error.set(e instanceof HttpErrorResponse ? e.error?.message || 'No se pudo guardar. Revisa la conexión.' : e instanceof Error ? e.message : 'No se pudo guardar.');}finally{this.ocupada.set(false);}}
}
