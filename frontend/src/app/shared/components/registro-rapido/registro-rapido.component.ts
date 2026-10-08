import { TextoFinancieroPipe } from '../../../core/pipes/texto-financiero.pipe';
import { MontoPrivadoDirective } from '../../directives/monto-privado.directive';
import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, effect, inject, signal } from '@angular/core';
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

type TipoRegistro = 'GASTO' | 'INGRESO' | 'TRANSFERENCIA';
@Component({
  selector: 'app-registro-rapido', standalone: true,
  imports: [TextoFinancieroPipe, MontoPrivadoDirective, FormsModule, RouterLink, PrivacyToggleComponent],
  template: `@if (open()) {
    <div class="quick-entry-backdrop" (click)="cerrar()">
      <section class="quick-entry" role="dialog" aria-modal="true" aria-labelledby="quick-entry-title" (click)="$event.stopPropagation()" (keydown)="teclado($event)">
        <header><div><small>Un movimiento, en segundos</small><h2 id="quick-entry-title">Añadir movimiento</h2></div><app-privacy-toggle/><button type="button" class="utility-button" (click)="cerrar()" [disabled]="saving()" aria-label="Cerrar registro">×</button></header>
        <form (ngSubmit)="guardar()">
          <fieldset [disabled]="saving() || incierto || loading()">
            <div class="entry-types" aria-label="Tipo de movimiento">@for (opcion of tipos; track opcion.value) {<button type="button" [class.is-active]="tipo === opcion.value" [attr.aria-pressed]="tipo === opcion.value" (click)="cambiarTipo(opcion.value)">{{ opcion.label }}</button>}</div>
            <label class="entry-amount" for="quick-entry-amount">Monto <span>{{ cuentaActual()?.moneda || '' }}</span><input id="quick-entry-amount" name="monto" [type]="privacidad.ocultarMontos() ? 'password' : 'text'" inputmode="decimal" autocomplete="off" placeholder="0.00" [(ngModel)]="monto" required maxlength="18" /></label>
            @if (loading()) {<p role="status">Cargando cuentas y categorías…</p>}
            @else if (!cuentas.length) {<p>Necesitas una cuenta para registrar movimientos. <a routerLink="/cuentas" (click)="cerrar()">Crear cuenta</a></p>}
            @else {
              <div class="entry-accounts"><label>{{ tipo === 'TRANSFERENCIA' ? 'Desde' : 'Cuenta' }}<select name="cuenta" [(ngModel)]="cuentaId" (ngModelChange)="ajustarDestino()">@for (cuenta of cuentasDisponibles(); track cuenta.id) {<option [ngValue]="cuenta.id">{{ cuenta.nombre }} · {{ cuenta.moneda }}</option>}</select></label>
              @if (tipo === 'TRANSFERENCIA') {<label>Hacia<select name="destino" [(ngModel)]="destinoId">@for (cuenta of destinos(); track cuenta.id) {<option [ngValue]="cuenta.id">{{ cuenta.nombre }} · {{ cuenta.moneda }}</option>}</select></label>}</div>
              @if (tipo === 'TRANSFERENCIA' && distintaMoneda()) {<label>Tipo de cambio ({{ cuentaActual()?.moneda }} → {{ cuentaDestino()?.moneda }})<input appMontoPrivado name="tasa" type="number" inputmode="decimal" min="0.000001" step="any" [(ngModel)]="tasaCambio" required /></label>}
              @if (tipo !== 'TRANSFERENCIA') {
                <label>Categoría<select name="categoria" [(ngModel)]="categoriaId"><option [ngValue]="null">Sin categoría</option>@for (categoria of categoriasDisponibles(); track categoria.id) {<option [ngValue]="categoria.id">{{ categoria.nombre }}</option>}</select></label>
                <div class="entry-category-chips" aria-label="Categorías frecuentes">@for (categoria of categoriasDisponibles().slice(0, 4); track categoria.id) {<button type="button" [class.is-active]="categoriaId === categoria.id" [attr.aria-pressed]="categoriaId === categoria.id" (click)="categoriaId = categoria.id">{{ categoria.nombre }}</button>}</div>
              }
              <label>Descripción <span class="entry-optional">opcional</span><input name="descripcion" [(ngModel)]="descripcion" maxlength="200" placeholder="Ej. tacos, sueldo o ahorro" /></label>
              <details class="entry-details"><summary>Fecha, notas y más opciones</summary><label>Fecha<input name="fecha" type="date" [(ngModel)]="fecha" required /></label><label>Nota<input name="nota" [(ngModel)]="nota" maxlength="500" /></label><button type="button" class="entry-text-button" (click)="avanzado()">Opciones avanzadas: recurrentes y meses sin intereses</button></details>
            }
          </fieldset>
          @if (error()) {<p class="entry-error" role="alert">{{ (error()) | textoFinanciero }}</p>}
          <button type="submit" class="entry-save" [disabled]="saving() || loading() || !cuentas.length">{{ saving() ? 'Guardando…' : incierto ? 'Reintentar el mismo movimiento' : 'Guardar ' + (tipo === 'GASTO' ? 'gasto' : tipo === 'INGRESO' ? 'ingreso' : 'transferencia') }}</button>
          @if (!incierto) {<button type="button" class="entry-voice" (click)="voz()" [disabled]="saving()">Dictar o escribir una frase</button>}
        </form>
      </section>
    </div>
  }`
})
export class RegistroRapidoComponent implements OnDestroy {
  private readonly finanzas = inject(FinanzasService);
  private readonly preferida = inject(CategoriaPreferidaService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly privacidad = inject(PrivacidadService);
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
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
  private focoAnterior: HTMLElement | null = null;
  private usuarioRegistro: number | null = null;
  constructor() {
    effect(() => {
      const usuarioId = this.auth.currentUser()?.id;
      if (this.usuarioRegistro !== null && usuarioId !== this.usuarioRegistro) {
        this.catalogoSub?.unsubscribe(); this.guardarSub?.unsubscribe(); this.open.set(false); this.saving.set(false);
        this.incierto = false; this.pendiente = null; this.cuentas = []; this.categorias = []; this.usuarioRegistro = null;
      }
    });
  }

  @HostListener('window:kaptal-abrir-registro-rapido', ['$event']) abrir(event?: Event): void {
    if (this.open()) return;
    this.focoAnterior = this.document.activeElement as HTMLElement;
    if (this.incierto && this.pendiente) { this.open.set(true); return; }
    this.usuarioRegistro = this.auth.currentUser()?.id ?? null;
    const solicitado = (event as CustomEvent<{tipo?: TipoRegistro}> | undefined)?.detail?.tipo;
    this.tipo = solicitado === 'INGRESO' || solicitado === 'TRANSFERENCIA' ? solicitado : 'GASTO';
    this.monto = ''; this.descripcion = ''; this.nota = ''; this.tasaCambio = null;
    const hoy = new Date(); this.fecha = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    this.key = crypto.randomUUID(); this.pendiente = null; this.incierto = false;
    this.error.set(''); this.open.set(true); this.loading.set(true);
    this.catalogoSub?.unsubscribe();
    this.catalogoSub = forkJoin({ cuentas: this.finanzas.getCuentas(), categorias: this.finanzas.getCategorias() }).subscribe({
      next: data => {
        this.cuentas = data.cuentas.data.filter(c => c.activo); this.categorias = data.categorias.data.filter(c => c.activo);
        this.cambiarTipo(this.tipo); this.loading.set(false);
        setTimeout(() => this.document.getElementById('quick-entry-amount')?.focus());
      },
      error: () => { this.loading.set(false); this.cuentas = []; this.error.set('No se pudieron cargar las cuentas. Cierra y vuelve a intentar.'); }
    });
  }
  cambiarTipo(tipo: TipoRegistro): void {
    this.tipo = tipo;
    this.categoriaId = this.categoriasDisponibles().find(c => c.id === this.preferida.preferida(tipo))?.id ?? this.categoriasDisponibles()[0]?.id ?? null;
    let anterior: number | null = null;
    try { anterior = Number(this.document.defaultView?.localStorage.getItem(`kaptal_cuenta_rapida_${this.auth.currentUser()?.id}_${tipo}`)); } catch { /* Preferencia opcional. */ }
    this.cuentaId = this.cuentasDisponibles().find(c => c.id === anterior)?.id ?? this.cuentasDisponibles()[0]?.id ?? null;
    this.ajustarDestino();
  }
  cuentasDisponibles(): Cuenta[] { return this.cuentas; }
  categoriasDisponibles(): Categoria[] { return this.categorias.filter(c => c.tipo === this.tipo); }
  cuentaActual(): Cuenta | undefined { return this.cuentas.find(c => c.id === this.cuentaId); }
  cuentaDestino(): Cuenta | undefined { return this.cuentas.find(c => c.id === this.destinoId); }
  destinos(): Cuenta[] { return this.cuentas.filter(c => c.id !== this.cuentaId && !(this.cuentaActual()?.tipo === 'CREDITO' && c.tipo === 'CREDITO')); }
  ajustarDestino(): void { if (!this.destinos().some(c => c.id === this.destinoId)) this.destinoId = this.destinos().find(c => c.moneda === this.cuentaActual()?.moneda)?.id ?? this.destinos()[0]?.id ?? null; this.tasaCambio = null; }
  distintaMoneda(): boolean { return !!this.cuentaDestino() && this.cuentaActual()?.moneda !== this.cuentaDestino()?.moneda; }
  guardar(): void {
    if (this.saving() || this.loading()) return;
    const numero = Number(this.monto.trim().replace(',', '.'));
    if (!this.pendiente) {
      if (!this.cuentasDisponibles().some(c => c.id === this.cuentaId) || !Number.isFinite(numero) || numero <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(this.monto.trim()) || !/^\d{4}-\d{2}-\d{2}$/.test(this.fecha)) { this.error.set('Revisa el monto, la cuenta y la fecha.'); return; }
      if (this.tipo === 'TRANSFERENCIA' && (!this.destinos().some(c => c.id === this.destinoId) || (this.distintaMoneda() && (!this.tasaCambio || !Number.isFinite(this.tasaCambio) || this.tasaCambio <= 0)))) { this.error.set('Elige otra cuenta de destino y un tipo de cambio válido.'); return; }
      this.pendiente = { tipo: this.tipo, cuentaId: this.cuentaId!, monto: numero, fecha: this.fecha, descripcion: this.descripcion.trim() || this.categoriasDisponibles().find(c => c.id === this.categoriaId)?.nombre || (this.tipo === 'TRANSFERENCIA' ? 'Transferencia' : this.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'), notas: this.nota.trim() || null, categoriaId: this.tipo === 'TRANSFERENCIA' ? null : this.categoriaId, cuentaDestinoId: this.tipo === 'TRANSFERENCIA' ? this.destinoId : null, tasaCambio: this.tipo === 'TRANSFERENCIA' && this.distintaMoneda() ? this.tasaCambio : null };
    }
    this.saving.set(true); this.error.set('');
    this.guardarSub = this.finanzas.crearTransaccion(this.pendiente, this.key).subscribe({
      next: resultado => {
        if (!resultado.success) { this.saving.set(false); this.pendiente = null; this.error.set(resultado.message || 'No se pudo guardar el movimiento.'); return; }
        this.preferida.recordar(this.tipo, this.categoriaId);
        try { this.document.defaultView?.localStorage.setItem(`kaptal_cuenta_rapida_${this.auth.currentUser()?.id}_${this.tipo}`, String(this.cuentaId)); } catch { /* Preferencia opcional. */ }
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
  cerrar(): void { if (this.saving()) return; this.open.set(false); this.catalogoSub?.unsubscribe(); this.focoAnterior?.focus(); }
  voz(): void { this.cerrar(); this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat', { detail: {tipo: this.tipo} })); }
  avanzado(): void {
    const borrador = { tipo: this.tipo, monto: Number(this.monto.replace(',', '.')) || null, cuentaId: this.cuentaId, cuentaDestinoId: this.destinoId, categoriaId: this.categoriaId, fecha: this.fecha, notas: this.nota || this.descripcion, tasaCambio: this.tasaCambio };
    this.cerrar(); void this.router.navigate(['/transacciones']).then(() => this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-registro-manual', {detail:borrador})));
  }
  teclado(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.cerrar(); }
    if (event.key !== 'Tab') return;
    const elementos = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary')];
    const primero = elementos[0], ultimo = elementos.at(-1);
    if (event.shiftKey && this.document.activeElement === primero) { event.preventDefault(); ultimo?.focus(); }
    else if (!event.shiftKey && this.document.activeElement === ultimo) { event.preventDefault(); primero?.focus(); }
  }
  ngOnDestroy(): void { this.catalogoSub?.unsubscribe(); this.guardarSub?.unsubscribe(); }
}
