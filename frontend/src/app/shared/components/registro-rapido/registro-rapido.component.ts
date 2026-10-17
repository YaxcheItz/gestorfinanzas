import { ListaContextoService } from '../../../core/services/lista-contexto.service';
import { parsearEtiquetas } from '../../../core/utils/etiquetas';
import { FeatureStylesService } from '../../../core/services/feature-styles.service';
import { TextoFinancieroPipe } from '../../../core/pipes/texto-financiero.pipe';
import { crearIdSolicitud } from '../../../core/utils/request-id';
import { MontoPrivadoDirective } from '../../directives/monto-privado.directive';
import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, OnDestroy, afterNextRender, effect, inject, signal } from '@angular/core';
import { CaptureLauncherService } from '../../../core/services/capture-launcher.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { Categoria, Cuenta, TransaccionPayload } from '../../../core/models/finanzas.models';
import { FinanzasService } from '../../../core/services/finanzas.service';
import { CategoriaPreferidaService } from '../../../core/services/categoria-preferida.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrivacidadService } from '../../../core/services/privacidad.service';
import { AuthService } from '../../../core/services/auth.service';
import { PrivacyToggleComponent } from '../privacy-toggle/privacy-toggle.component';
import { DialogViewportDirective } from '../../directives/dialog-viewport.directive';
import { MovimientosOfflineService } from '../../../core/services/movimientos-offline.service';
import { CategoriaIconoComponent } from '../categoria-icono/categoria-icono.component';

import { MontoPipe } from '../../../core/pipes/monto.pipe';
import { CommonModule } from '@angular/common';
import { PresupuestoDisponible } from '../../../core/models/finanzas.models';

type TipoRegistro = 'GASTO' | 'INGRESO' | 'TRANSFERENCIA';
@Component({
  selector: 'app-registro-rapido', standalone: true,
  imports: [CommonModule, MontoPipe, TextoFinancieroPipe, MontoPrivadoDirective, FormsModule, RouterLink, PrivacyToggleComponent, DialogViewportDirective, CategoriaIconoComponent],
  template: `@if (open()) {
    <div appDialogViewport class="quick-entry-backdrop" (click)="cerrar()">
      <section class="quick-entry" role="dialog" aria-modal="true" aria-labelledby="quick-entry-title" (click)="$event.stopPropagation()" (keydown)="teclado($event)">
        <header><h2 id="quick-entry-title">{{ repitiendo() ? 'Repetir movimiento' : 'Añadir movimiento' }}</h2><app-privacy-toggle/><button type="button" class="utility-button" (click)="cerrar()" [disabled]="saving()" aria-label="Cerrar registro">×</button></header>
        <div class="entry-mode" aria-label="Forma de añadir"><button type="button" class="is-active" aria-pressed="true">Rápido</button><button type="button" (click)="voz()" [disabled]="saving() || incierto">Escribir o dictar</button></div>
        <form (ngSubmit)="guardar()">
          <fieldset [disabled]="saving() || incierto || loading()">
            <div class="entry-types" aria-label="Tipo de movimiento">@for (opcion of tipos; track opcion.value) {<button type="button" [class.is-active]="tipo === opcion.value" [attr.aria-pressed]="tipo === opcion.value" (click)="cambiarTipo(opcion.value)">{{ opcion.label }}</button>}</div>
            <label class="entry-amount" for="quick-entry-amount">Monto <span>{{ cuentaActual()?.moneda || '' }}</span><input id="quick-entry-amount" name="monto" [type]="privacidad.ocultarMontos() ? 'password' : 'text'" inputmode="decimal" autocomplete="off" placeholder="0.00" [(ngModel)]="monto" required maxlength="18" /></label>
            @if (loading()) {<p role="status">Cargando cuentas y categorías…</p>}
            @else if (!cuentas.length) {<p>Necesitas una cuenta para registrar movimientos. <a routerLink="/cuentas" (click)="cerrar()">Crear cuenta</a></p>}
            @else {
              @if(repitiendo()) {<label>Descripción <span class="entry-optional">opcional</span><input name="descripcion" [(ngModel)]="descripcion" maxlength="200" /></label>}
              <div class="entry-accounts"><label>{{ tipo === 'TRANSFERENCIA' ? 'Desde' : 'Cuenta' }}<select name="cuenta" [(ngModel)]="cuentaId" (ngModelChange)="ajustarDestino(); consultarPresupuestoDisponible()">@if(cuentaId === null) {<option [ngValue]="null" disabled>Elige una cuenta</option>}@for (cuenta of cuentasDisponibles(); track cuenta.id) {<option [ngValue]="cuenta.id">{{ cuenta.nombre }} · {{ cuenta.moneda }}</option>}</select></label>
              @if (tipo === 'TRANSFERENCIA') {<label>Hacia<select name="destino" [(ngModel)]="destinoId">@for (cuenta of destinos(); track cuenta.id) {<option [ngValue]="cuenta.id">{{ cuenta.nombre }} · {{ cuenta.moneda }}</option>}</select></label>}</div>
              @if (tipo === 'TRANSFERENCIA' && distintaMoneda()) {<label>Tipo de cambio ({{ cuentaActual()?.moneda }} → {{ cuentaDestino()?.moneda }})<input appMontoPrivado name="tasa" type="number" inputmode="decimal" min="0.000001" step="any" [(ngModel)]="tasaCambio" required /></label>}
              @if (tipo !== 'TRANSFERENCIA') {
                <div class="entry-categories"><span>Categoría</span><div class="entry-category-chips" aria-label="Categorías recientes">@for (categoria of categoriasRapidas(); track categoria.id) {<button type="button" [class.is-active]="categoriaId === categoria.id" [attr.aria-pressed]="categoriaId === categoria.id" (click)="seleccionarCategoria(categoria.id)"><app-categoria-icono [icono]="categoria.icono" [tipo]="categoria.tipo"/><span>{{ categoria.nombre }}</span></button>}</div></div>
                @if (presupuestoDisponible(); as prep) {
                  @if (prep.tienePresupuesto) {
                    <div class="entry-budget rounded-2xl p-2.5 sm:p-3 border text-xs transition-all"
                         [ngClass]="{
                           'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200': prep.estado === 'EXCEDIDO',
                           'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200': prep.estado === 'ALERTA',
                           'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200': prep.estado === 'NORMAL'
                         }">
                      <div class="flex flex-wrap items-center justify-between gap-2 font-semibold">
                        <span class="flex min-w-0 items-center gap-1.5">
                          @if (prep.estado === 'EXCEDIDO') { <span>⛔</span> <span>Límite mensual excedido</span> }
                          @else if (prep.estado === 'ALERTA') { <span>⚠️</span> <span>Cerca del límite ({{ prep.porcentajeAlerta }}%)</span> }
                          @else { <span>🌿</span> <span>Presupuesto disponible</span> }
                        </span>
                        <span class="tabular-nums font-bold">
                          {{ prep.montoDisponible >= 0 ? 'Te queda: ' : 'Excedido por: ' }}
                          {{ (prep.montoDisponible >= 0 ? prep.montoDisponible : -prep.montoDisponible) | monto:prep.moneda:'symbol':'1.2-2' }}
                        </span>
                      </div>
                      <div class="mt-1 text-[11px] opacity-80 flex items-center justify-between">
                        <span>Gastado {{ prep.montoGastado | monto:prep.moneda:'symbol':'1.2-2' }} de {{ prep.montoLimite | monto:prep.moneda:'symbol':'1.2-2' }}</span>
                        <span>@if(privacidad.ocultarMontos()){•••} @else { {{ prep.porcentajeConsumido | number:'1.0-0' }}% }</span>
                      </div>
                      @if (montoExcedeDisponible(prep.montoDisponible)) {
                        <p class="mt-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          ⚠️ Este gasto superará lo disponible para el mes.
                        </p>
                      }
                    </div>
                  }
                }
              }
              <p class="entry-date">{{ fecha === hoyLocal() ? 'Hoy' : fecha }} · {{ tipo === 'TRANSFERENCIA' ? 'Entre tus cuentas' : 'Descripción opcional' }}</p>
              <details class="entry-details"><summary>Más categorías, fecha y detalles</summary>
                @if (tipo !== 'TRANSFERENCIA') {<label>Todas las categorías<select name="categoria" [(ngModel)]="categoriaId" (ngModelChange)="consultarPresupuestoDisponible()"><option [ngValue]="null">Sin categoría</option>@for (categoria of categoriasDisponibles(); track categoria.id) {<option [ngValue]="categoria.id">{{ categoria.nombre }}</option>}</select></label>}
                @if(!repitiendo()) {<label>Descripción <span class="entry-optional">opcional</span><input name="descripcion" [(ngModel)]="descripcion" maxlength="200" placeholder="Ej. tacos, sueldo o ahorro" /></label>}
                <label>Lista<select name="listaMovimiento" [(ngModel)]="listaRegistroId" (ngModelChange)="consultarPresupuestoDisponible()">@for(lista of listasEditables(); track lista.id){<option [ngValue]="lista.id">{{ lista.emoji }} {{ lista.nombre }}</option>}</select></label><label>Etiquetas<input name="etiquetasMovimiento" [(ngModel)]="etiquetasTexto" placeholder="#visa #vacaciones" maxlength="271" /></label>
                <label>Fecha<input name="fecha" type="date" [(ngModel)]="fecha" (ngModelChange)="consultarPresupuestoDisponible()" required /></label><label>Nota<input name="nota" [(ngModel)]="nota" maxlength="500" /></label><button type="button" class="entry-text-button" (click)="avanzado()">Opciones avanzadas: recurrentes y meses sin intereses</button>
              </details>
            }
          </fieldset>
          <footer class="entry-footer">
          @if(repitiendo()) {<p class="entry-repeat" role="status">{{ fecha === hoyLocal() ? 'Es un movimiento nuevo para hoy.' : 'Es un movimiento nuevo con fecha ' + fecha + '.' }} Revisa los datos antes de guardar.</p>}
          @if (cuentaActual(); as cuenta) {<p class="entry-summary">{{ nombreListaRegistro() }} · {{ cuenta.nombre }}@if(tipo === 'TRANSFERENCIA') { → {{ cuentaDestino()?.nombre || 'Elige destino' }}} @else { · {{ categoriaActual()?.nombre || 'Sin categoría' }}}</p>}
          @if (!offline.conexion()) {<p class="entry-offline" role="status">Se guardará en este dispositivo y se enviará al volver la conexión.</p>}
          @if (error()) {<p class="entry-error" role="alert">{{ (error()) | textoFinanciero }}</p>}
          <button type="submit" class="entry-save" [disabled]="saving() || loading() || !cuentas.length || (!incierto && (!monto.trim() || !cuentaActual()))">{{ saving() ? 'Guardando…' : incierto ? 'Reintentar el mismo movimiento' : !offline.conexion() ? 'Guardar en este dispositivo' : 'Guardar ' + (tipo === 'GASTO' ? 'gasto' : tipo === 'INGRESO' ? 'ingreso' : 'transferencia') }}</button>
          </footer>
        </form>
      </section>
    </div>
  }`
})
export class RegistroRapidoComponent implements OnDestroy {
  private readonly styleAssets = inject(FeatureStylesService).load('capture');
  private readonly captureLauncher = inject(CaptureLauncherService);
  private readonly finanzas = inject(FinanzasService);
  private readonly preferida = inject(CategoriaPreferidaService);
  readonly offline = inject(MovimientosOfflineService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly privacidad = inject(PrivacidadService);
  readonly contextoLista = inject(ListaContextoService);
  listaRegistroId: number | null = null;
  etiquetasTexto = '';
  listasEditables() { return this.contextoLista.listas().filter(l => !l.archivada && l.rol !== 'LECTOR'); }
  nombreListaRegistro() { return this.contextoLista.listas().find(l => l.id === this.listaRegistroId)?.nombre ?? 'Personal'; }
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly repitiendo = signal(false);
  readonly presupuestoDisponible = signal<PresupuestoDisponible | null>(null);
  private repeticion: Partial<TransaccionPayload> | null = null;
  readonly tipos: { value: TipoRegistro; label: string }[] = [{value:'GASTO',label:'Gasto'}, {value:'INGRESO',label:'Ingreso'}, {value:'TRANSFERENCIA',label:'Transferencia'}];
  cuentas: Cuenta[] = [];
  categorias: Categoria[] = [];
  tipo: TipoRegistro = 'GASTO';
  monto = ''; descripcion = ''; nota = ''; fecha = '';
  cuentaId: number | null = null; destinoId: number | null = null; categoriaId: number | null = null; tasaCambio: number | null = null;
  incierto = false;
  private key = '';
  private pendiente: TransaccionPayload | null = null;
  private catalogoSub?: Subscription;
  private guardarSub?: Subscription;
  private presupuestoSub?: Subscription;
  private focoAnterior: HTMLElement | null = null;
  private usuarioRegistro: number | null = null;
  private catalogoVersion = 0;
  constructor() {
    const launcher = this.captureLauncher;
    inject(DestroyRef).onDestroy(() => launcher.detach('manual'));
    afterNextRender(() => {
      const pending = launcher.attach('manual');
      if (pending) this.abrir(pending);
    });
    effect(() => {
      const usuarioId = this.auth.currentUser()?.id;
      if (this.usuarioRegistro !== null && usuarioId !== this.usuarioRegistro) {
        this.catalogoSub?.unsubscribe(); this.guardarSub?.unsubscribe(); this.open.set(false); this.saving.set(false);
        this.incierto = false; this.pendiente = null; this.cuentas = []; this.categorias = []; this.usuarioRegistro = null;
        this.repeticion=null;this.repitiendo.set(false);
      }
    });
  }

  @HostListener('window:kaptal-abrir-registro-rapido', ['$event']) abrir(event?: Event): void {
    this.captureLauncher.attach('manual');
    if (this.open()) return;
    this.focoAnterior = this.document.activeElement as HTMLElement;
    if (this.incierto && this.pendiente && this.usuarioRegistro===this.auth.currentUser()?.id) { this.open.set(true); return; }
    const detail = (event as CustomEvent<{tipo?: TipoRegistro;categoriaId?:number;preservar?:boolean;repetir?:Partial<TransaccionPayload>}> | undefined)?.detail;
    if(detail?.repetir && !['GASTO','INGRESO','TRANSFERENCIA'].includes(detail.repetir.tipo??''))return;
    if (detail?.preservar && !this.loading() && this.cuentas.length && this.usuarioRegistro === this.auth.currentUser()?.id) { this.open.set(true); this.enfocarMonto();return; }
    this.usuarioRegistro = this.auth.currentUser()?.id ?? null;
    this.categoriaSolicitada = detail?.categoriaId ?? null;
    this.repeticion=detail?.repetir??null;this.repitiendo.set(!!this.repeticion);
    const solicitado = this.repeticion?.tipo ?? detail?.tipo;
    this.tipo = solicitado === 'INGRESO' || solicitado === 'TRANSFERENCIA' ? solicitado : 'GASTO';
    this.listaRegistroId = this.repeticion?.listaId ?? this.contextoLista.activaId();
    this.etiquetasTexto = (this.repeticion?.etiquetas ?? []).map(e => '#' + e).join(' ');
    this.monto = ''; this.descripcion = ''; this.nota = ''; this.tasaCambio = null;
    this.fecha = this.hoyLocal();
    this.key = crearIdSolicitud(); this.pendiente = null; this.incierto = false;
    this.error.set(''); this.open.set(true); this.loading.set(true);
    const version = ++this.catalogoVersion;
    this.catalogoSub?.unsubscribe();
    this.catalogoSub = forkJoin({ cuentas: this.finanzas.getCuentas(), categorias: this.finanzas.getCategorias() }).subscribe({
      next: data => {
        this.cuentas = data.cuentas.data.filter(c => c.activo); this.categorias = data.categorias.data.filter(c => c.activo);
        if (this.usuarioRegistro !== null) void this.offline.guardarCatalogo(this.usuarioRegistro,this.cuentas,this.categorias).catch(()=>{});
        this.cambiarTipo(this.tipo);this.aplicarCategoriaSolicitada();this.aplicarRepeticion(); this.loading.set(false);
        this.consultarPresupuestoDisponible();
        this.enfocarMonto();
      },
      error: () => { void this.cargarCatalogoLocal(version); }
    });
  }
  cambiarTipo(tipo: TipoRegistro): void {
    this.tipo = tipo;
    this.categoriaId = this.categoriasDisponibles().find(c => c.id === this.preferida.preferida(tipo))?.id ?? this.categoriasDisponibles()[0]?.id ?? null;
    let anterior: number | null = null;
    try { anterior = Number(this.document.defaultView?.localStorage.getItem(`kaptal_cuenta_rapida_${this.auth.currentUser()?.id}_${tipo}`)); } catch { /* Preferencia opcional. */ }
    this.cuentaId = this.cuentasDisponibles().find(c => c.id === anterior)?.id ?? this.cuentasDisponibles()[0]?.id ?? null;
    this.ajustarDestino();
    this.consultarPresupuestoDisponible();
  }

  seleccionarCategoria(id: number): void {
    this.categoriaId = id;
    this.consultarPresupuestoDisponible();
  }

  consultarPresupuestoDisponible(): void {
    this.presupuestoSub?.unsubscribe();
    this.presupuestoDisponible.set(null);
    if (this.tipo !== 'GASTO' || !this.categoriaId || typeof this.finanzas.getPresupuestoDisponible !== 'function') {
      this.presupuestoDisponible.set(null);
      return;
    }
    const cuenta = this.cuentaActual();
    this.presupuestoSub = this.finanzas.getPresupuestoDisponible(
      this.categoriaId,
      this.listaRegistroId,
      this.fecha || undefined,
      cuenta?.moneda
    ).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.presupuestoDisponible.set(res.data);
        } else {
          this.presupuestoDisponible.set(null);
        }
      },
      error: () => this.presupuestoDisponible.set(null)
    });
  }

  montoExcedeDisponible(disponible: number): boolean {
    const num = Number(this.monto.trim().replace(',', '.'));
    return Number.isFinite(num) && num > 0 && num > disponible;
  }
  private categoriaSolicitada: number | null = null;
  private aplicarCategoriaSolicitada(): void {
    if (this.categoriasDisponibles().some(cat => cat.id === this.categoriaSolicitada)) this.categoriaId = this.categoriaSolicitada;
  }
  private aplicarRepeticion(): void {
    const movimiento=this.repeticion;if(!movimiento)return;
    this.monto=movimiento.monto==null?'':String(movimiento.monto);this.descripcion=movimiento.descripcion??'';this.nota=movimiento.notas??'';
    this.cuentaId=this.cuentas.find(c=>c.id===movimiento.cuentaId)?.id??null;
    this.categoriaId=this.categoriasDisponibles().find(c=>c.id===movimiento.categoriaId)?.id??null;
    this.destinoId=this.tipo==='TRANSFERENCIA'?(this.destinos().find(c=>c.id===movimiento.cuentaDestinoId)?.id??null):null;
    this.tasaCambio=this.tipo==='TRANSFERENCIA'&&this.distintaMoneda()?(movimiento.tasaCambio??null):null;
    if(this.cuentaId===null || (this.tipo==='TRANSFERENCIA' && this.destinoId===null))this.error.set('Una cuenta anterior ya no está disponible. Elige las cuentas antes de guardar.');
    else if(movimiento.categoriaId!=null && this.tipo!=='TRANSFERENCIA' && this.categoriaId===null)this.error.set('La categoría anterior ya no está disponible. Elige otra o guarda sin categoría.');
  }
  cuentasDisponibles(): Cuenta[] { return this.cuentas; }
  categoriasDisponibles(): Categoria[] { return this.categorias.filter(c => c.tipo === this.tipo); }
  categoriasRapidas(): Categoria[] {
    const disponibles=this.categoriasDisponibles();
    const ids=[...this.preferida.recientes(this.tipo),...disponibles.map(c=>c.id)];
    const recientes=[...new Set(ids)].map(id=>disponibles.find(c=>c.id===id)).filter((c):c is Categoria=>!!c).slice(0,4);
    const seleccionada=disponibles.find(c=>c.id===this.categoriaId);
    if(seleccionada && !recientes.some(c=>c.id===seleccionada.id))recientes.splice(3,1,seleccionada);
    return recientes;
  }
  hoyLocal(): string { const hoy=new Date();return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`; }
  private enfocarMonto(): void { setTimeout(()=>{if(this.open()&&!this.saving())this.document.getElementById('quick-entry-amount')?.focus({preventScroll:true});}); }
  private async cargarCatalogoLocal(version: number): Promise<void> {
    const usuario=this.usuarioRegistro;
    try {
      const catalogo=usuario===null?null:await this.offline.leerCatalogo(usuario);
      if (version!==this.catalogoVersion || usuario!==this.usuarioRegistro || usuario!==this.auth.currentUser()?.id) return;
      this.cuentas=catalogo?.cuentas.filter(c=>c.activo)??[];
      this.categorias=catalogo?.categorias.filter(c=>c.activo)??[];
      this.cambiarTipo(this.tipo);
      this.aplicarCategoriaSolicitada();
      this.error.set(this.cuentas.length?'':'Sin cuentas guardadas en este dispositivo. Abre el registro con conexión primero.');
      this.aplicarRepeticion();
    } catch { if(version===this.catalogoVersion){this.cuentas=[];this.error.set('No se pudieron cargar las cuentas. Cierra y vuelve a intentar.');} }
    finally { if(version===this.catalogoVersion && usuario===this.usuarioRegistro)this.loading.set(false); }
  }
  cuentaActual(): Cuenta | undefined { return this.cuentas.find(c => c.id === this.cuentaId); }
  categoriaActual(): Categoria | undefined { return this.categoriasDisponibles().find(c=>c.id===this.categoriaId); }
  cuentaDestino(): Cuenta | undefined { return this.cuentas.find(c => c.id === this.destinoId); }
  destinos(): Cuenta[] { return this.cuentas.filter(c => c.id !== this.cuentaId && !(this.cuentaActual()?.tipo === 'CREDITO' && c.tipo === 'CREDITO')); }
  ajustarDestino(): void { if (!this.destinos().some(c => c.id === this.destinoId)) this.destinoId = this.destinos().find(c => c.moneda === this.cuentaActual()?.moneda)?.id ?? this.destinos()[0]?.id ?? null; this.tasaCambio = null; }
  distintaMoneda(): boolean { return !!this.cuentaDestino() && this.cuentaActual()?.moneda !== this.cuentaDestino()?.moneda; }
  guardar(): void {
    if (this.saving() || this.loading()) return;
    const numero = Number(this.monto.trim().replace(',', '.'));
    if (!this.pendiente) {
      let etiquetas: string[];
      try { etiquetas = parsearEtiquetas(this.etiquetasTexto); } catch (error) { this.error.set((error as Error).message); return; }
      if (!this.cuentasDisponibles().some(c => c.id === this.cuentaId) || !Number.isFinite(numero) || numero <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(this.monto.trim()) || !/^\d{4}-\d{2}-\d{2}$/.test(this.fecha)) { this.error.set('Revisa el monto, la cuenta y la fecha.'); return; }
      if (this.tipo === 'TRANSFERENCIA' && (!this.destinos().some(c => c.id === this.destinoId) || (this.distintaMoneda() && (!this.tasaCambio || !Number.isFinite(this.tasaCambio) || this.tasaCambio <= 0)))) { this.error.set('Elige otra cuenta de destino y un tipo de cambio válido.'); return; }
      this.pendiente = { ...(this.listaRegistroId == null ? {} : { listaId: this.listaRegistroId }), ...(etiquetas.length ? { etiquetas } : {}), tipo: this.tipo, cuentaId: this.cuentaId!, monto: numero, fecha: this.fecha, descripcion: this.descripcion.trim() || this.categoriasDisponibles().find(c => c.id === this.categoriaId)?.nombre || (this.tipo === 'TRANSFERENCIA' ? 'Transferencia' : this.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'), notas: this.nota.trim() || null, categoriaId: this.tipo === 'TRANSFERENCIA' ? null : this.categoriaId, cuentaDestinoId: this.tipo === 'TRANSFERENCIA' ? this.destinoId : null, tasaCambio: this.tipo === 'TRANSFERENCIA' && this.distintaMoneda() ? this.tasaCambio : null };
    }
    this.saving.set(true); this.error.set('');
    if (!this.offline.conexion()) { void this.guardarLocal();return; }
    this.guardarSub = this.finanzas.crearTransaccion(this.pendiente, this.key).subscribe({
      next: resultado => {
        if (!resultado.success) { this.saving.set(false); this.pendiente = null; this.error.set(resultado.message || 'No se pudo guardar el movimiento.'); return; }
        this.preferida.recordar(this.tipo, this.categoriaId);
        this.recordarCuenta();
        this.saving.set(false); this.incierto = false; this.pendiente = null; this.cerrar();
        this.toast.success('Movimiento guardado'); this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-movimiento-guardado'));
      },
      error: err => {
        this.saving.set(false); this.incierto = err.status === 0 || err.status >= 500;
        if (!this.incierto) this.pendiente = null;
        this.error.set(this.incierto ? 'No se pudo confirmar el guardado. Reintenta aquí: no se duplicará el movimiento.' : err.error?.message || 'No se pudo guardar. Revisa los datos.');
      }
    });
  }
  cerrar(): void {
    if (this.saving()) return;
    this.open.set(false);
    this.catalogoVersion++;
    this.catalogoSub?.unsubscribe();
    this.presupuestoSub?.unsubscribe();
    this.presupuestoDisponible.set(null);
    this.focoAnterior?.focus();
  }
  private async guardarLocal(): Promise<void> {
    const usuario=this.usuarioRegistro;
    try {
      if (usuario===null || !this.pendiente) throw new Error('Abre de nuevo el registro.');
      await this.offline.guardarPendiente(usuario,this.key,this.pendiente);
      if(usuario!==this.usuarioRegistro || usuario!==this.auth.currentUser()?.id)return;
      this.preferida.recordar(this.tipo,this.categoriaId);this.recordarCuenta();
      this.saving.set(false);this.incierto=false;this.pendiente=null;this.cerrar();
      this.toast.info('Guardado en este dispositivo. Se enviará al volver la conexión.');
      if(this.offline.conexion())void this.offline.sincronizar();
    } catch (error) {
      if(usuario===this.usuarioRegistro){this.saving.set(false);this.incierto=true;this.error.set(error instanceof Error?error.message:'No se pudo guardar en el dispositivo.');}
    }
  }
  private recordarCuenta(): void { try {this.document.defaultView?.localStorage.setItem(`kaptal_cuenta_rapida_${this.auth.currentUser()?.id}_${this.tipo}`,String(this.cuentaId));}catch{/* Preferencia opcional. */} }
  voz(): void { this.cerrar(); this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat', { detail: {tipo: this.tipo} })); }
  avanzado(): void {
    let etiquetas: string[];
    try { etiquetas = parsearEtiquetas(this.etiquetasTexto); } catch (e) { this.error.set(e instanceof Error ? e.message : 'Revisa las etiquetas.'); return; }
    const borrador = { listaId: this.listaRegistroId, etiquetas, tipo: this.tipo, monto: Number(this.monto.replace(',', '.')) || null, cuentaId: this.cuentaId, cuentaDestinoId: this.destinoId, categoriaId: this.categoriaId, fecha: this.fecha, descripcion: this.descripcion, notas: this.nota || null, tasaCambio: this.tasaCambio };
    this.cerrar(); void this.router.navigate(['/transacciones']).then(() => this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-registro-manual', {detail:borrador})));
  }
  teclado(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.cerrar(); }
    if (event.key !== 'Tab') return;
    const elementos = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, input, select, a[href], summary')]
      .filter(elemento => !elemento.matches(':disabled') && elemento.tabIndex >= 0 && elemento.checkVisibility({ visibilityProperty: true }));
    const primero = elementos[0], ultimo = elementos.at(-1);
    if (event.shiftKey && this.document.activeElement === primero) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && this.document.activeElement === ultimo) { event.preventDefault(); primero?.focus(); }
  }
  ngOnDestroy(): void { this.catalogoSub?.unsubscribe(); this.guardarSub?.unsubscribe(); this.presupuestoSub?.unsubscribe(); }
}
