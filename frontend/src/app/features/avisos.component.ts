import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { AvisosService } from '../core/services/avisos.service';
import { FinanzasService } from '../core/services/finanzas.service';
import { ListaContextoService } from '../core/services/lista-contexto.service';
import { AvisoFinanciero, ClaseAviso, DatosAviso } from '../core/models/avisos.models';
import { Categoria, Cuenta } from '../core/models/finanzas.models';
import { TextoFinancieroPipe } from '../core/pipes/texto-financiero.pipe';
import { MontoPipe } from '../core/pipes/monto.pipe';
import { FocusTrapDirective } from '../shared/directives/focus-trap.directive';

@Component({selector:'app-avisos',imports:[FormsModule,RouterLink,MontoPipe,TextoFinancieroPipe,FocusTrapDirective],templateUrl:'./avisos.component.html',styleUrl:'./avisos.component.css'})
export class AvisosComponent {
  private readonly api=inject(AvisosService);
  private readonly finanzas=inject(FinanzasService);
  private readonly destroyRef=inject(DestroyRef);
  readonly listas=inject(ListaContextoService);
  readonly avisos=signal<AvisoFinanciero[]>([]);readonly estado=signal('PENDIENTE');readonly pagina=signal(0);readonly paginas=signal(0);
  readonly cargando=signal(false);readonly ocupado=signal(false);readonly error=signal('');readonly mensaje=signal('');readonly errorFormulario=signal('');
  readonly formulario=signal(false);readonly seleccionado=signal<AvisoFinanciero|null>(null);readonly confirmacion=signal<AvisoFinanciero|null>(null);
  readonly cuentas=signal<Cuenta[]>([]);readonly categorias=signal<Categoria[]>([]);readonly cargandoCatalogo=signal(true);
  readonly filtros=[{valor:'PENDIENTE',texto:'Pendientes'},{valor:'REGISTRADO',texto:'Registrados'},{valor:'DESCARTADO',texto:'Descartados'}];
  readonly clases:{valor:ClaseAviso;texto:string}[]=[{valor:'SIN_CLASIFICAR',texto:'Sin clasificar'},{valor:'COMPRA',texto:'Compra'},{valor:'INGRESO',texto:'Ingreso'},{valor:'DEVOLUCION',texto:'Devolución'},{valor:'TRANSFERENCIA',texto:'Transferencia'},{valor:'PAGO_TARJETA',texto:'Pago de tarjeta'},{valor:'AUTORIZACION',texto:'Autorización pendiente'}];
  origen='MANUAL';resumen='';clase:ClaseAviso='COMPRA';moneda='MXN';datos:DatosAviso=this.vacio();private identificador='';private carga=0;
  constructor(){this.cargar();forkJoin({cuentas:this.finanzas.getCuentas(),categorias:this.finanzas.getCategorias()}).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.cargandoCatalogo.set(false))).subscribe({next:r=>{this.cuentas.set(r.cuentas.data??[]);this.categorias.set(r.categorias.data??[]);},error:()=>this.error.set('No pudimos cargar cuentas y categorías. Vuelve a abrir la bandeja con conexión.')});}
  private vacio():DatosAviso {const d=new Date();return {cuentaId:null,categoriaId:null,cuentaDestinoId:null,listaId:this.listas.activaId(),tipo:'GASTO',monto:null,fecha:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,descripcion:''};}
  cargar(){const turno=++this.carga;this.cargando.set(true);this.error.set('');this.api.listar(this.estado(),this.pagina()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{if(turno!==this.carga)return;this.avisos.set(r.data?.content??[]);this.paginas.set(r.data?.totalPages??0);this.cargando.set(false);},error:()=>{if(turno!==this.carga)return;this.error.set('No pudimos cargar los avisos. Reintenta con conexión.');this.cargando.set(false);}});}
  filtrar(estado:string){this.estado.set(estado);this.pagina.set(0);this.cargar();}
  nuevo(){this.seleccionado.set(null);this.identificador=crypto.randomUUID();this.resumen='';this.origen='MANUAL';this.clase='COMPRA';this.moneda='MXN';this.datos=this.vacio();this.errorFormulario.set('');this.formulario.set(true);}
  editar(a:AvisoFinanciero){this.seleccionado.set(a);this.clase=a.clase;this.moneda=a.moneda;this.datos=a.datos?structuredClone(a.datos):this.vacio();this.errorFormulario.set('');this.formulario.set(true);}
  cerrar(){if(!this.ocupado())this.formulario.set(false);}
  cambiarClase(){this.datos.tipo=this.clase==='TRANSFERENCIA'||this.clase==='PAGO_TARJETA'?'TRANSFERENCIA':this.clase==='INGRESO'||this.clase==='DEVOLUCION'?'INGRESO':'GASTO';this.datos.categoriaId=null;this.datos.cuentaDestinoId=null;this.datos.tasaCambio=null;}
  guardarDatos(){if(this.ocupado())return;this.ocupado.set(true);this.errorFormulario.set('');const a=this.seleccionado();const request=a?this.api.editar(a.id,{version:a.version,clase:this.clase,moneda:this.moneda,datos:this.datos}):this.api.recibir({origen:this.origen,identificador:this.identificador,resumen:this.resumen,clase:this.clase,moneda:this.moneda,datos:this.datos});request.pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.ocupado.set(false))).subscribe({next:()=>{this.formulario.set(false);this.mensaje.set('Revisión guardada. El dinero no cambió.');this.cargar();},error:e=>this.errorFormulario.set(e.error?.message??'No pudimos guardar. Reintenta sin cerrar para conservar los datos.')});}
  prepararConfirmacion(a:AvisoFinanciero){if(a.coincidencias.length)this.confirmacion.set(a);else this.ejecutar(a,'confirmar',false);}
  ejecutar(a:AvisoFinanciero,accion:'confirmar'|'descartar',duplicado:boolean){if(this.ocupado())return;this.ocupado.set(true);this.error.set('');this.api.decidir(a,accion,duplicado).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.ocupado.set(false))).subscribe({next:()=>{this.confirmacion.set(null);this.mensaje.set(accion==='confirmar'?'Movimiento registrado.':'Aviso descartado. El dinero no cambió.');this.cargar();},error:e=>{this.confirmacion.set(null);this.error.set(e.error?.message??'No pudimos completar la operación. Recarga la bandeja antes de reintentar.');}});}
  etiquetaClase(c:ClaseAviso){return this.clases.find(x=>x.valor===c)?.texto??c;}
  etiquetaEstado(e:string){return e==='REGISTRADO'?'Registrado':e==='DESCARTADO'?'Descartado':'Pendiente';}
  etiquetaOrigen(o:string){return ({MANUAL:'Manual',GMAIL:'Gmail',WHATSAPP:'WhatsApp',SMS:'SMS',NOTIFICACION:'Notificación'} as Record<string,string>)[o]??o;}
}
