import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AutomaticBankService, AutomaticRule, AutomaticState } from '../core/services/automatic-bank';
import { BankNotificationsService, NoticeApp } from '../core/services/bank-notifications';
import { FinanzasService } from '../core/services/finanzas.service';
import { Cuenta } from '../core/models/finanzas.models';
import { ListaFinanciera } from '../core/models/listas.models';
import { ApiResponse } from '../core/models/auth.models';
import { getApiBaseUrl } from '../core/services/api-base-url';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-automatic-bank',
  imports: [FormsModule],
  template: `
    @if (automatic.available) {
      <details (toggle)="opened($event)">
        <summary>Registrar compras automáticamente</summary>
        <p>Configura una vez cada cuenta. Las compras reconocidas se registrarán sin pedir confirmación, incluso en segundo plano. Sin internet, se conservará un envío cifrado para reintentarlo.</p>
        <p>Santander registra solo compras y gastos. Los avisos claros de depósitos, abonos e ingresos se ignoran en esta conexión.</p>
        <p>Se reconoce la compra autorizada de Sears Visa, «Gastaste … en … con tu tarjeta» y el aviso Santander «Compra con tarjeta en …» con importe MXN, tarjeta, fecha y hora. Los mensajes ambiguos y posibles duplicados necesitan revisión. Revolut requiere moneda explícita.</p>
        <p>Sears se detecta desde las notificaciones de tu app de SMS; actívalas en Android. Kaptal no lee el historial. Android puede ocultar contenido o detener la recepción por batería o cierre forzado.</p>
        @if (state(); as s) {
          <p role="status">Registro {{ s.active ? 'activo' : 'desactivado' }} · {{ s.queued }} envíos pendientes · {{ s.registered }} registrados recientes · {{ s.review }} para revisar.</p>
          @for (review of s.reviews ?? []; track review.eventoId) {
            <p>{{ review.fecha }} · {{ review.descripcion }} · {{ review.monto }} {{ review.moneda }}. Comprueba la bandeja de Avisos y tu banco antes de registrarlo manualmente.</p>
          }
          @if (s.full || s.error) { <p role="alert">Comprueba la conexión y los movimientos con tu banco antes de volver a activar.</p> }
        }
        <button type="button" (click)="load()" [disabled]="busy()">Actualizar configuración</button>
        @if (loaded()) {
          <fieldset [disabled]="busy()"><legend>Asocia cada app a su cuenta</legend>
            @for (profile of profiles; track profile.provider) {
              <label>{{ profile.name }}
                <select [(ngModel)]="profile.account" [attr.aria-label]="'Cuenta de ' + profile.name">
                  <option [ngValue]="null">No activar</option>
                  @for (account of accounts(); track account.id) {
                    @if (account.moneda === 'MXN' && account.tipo === profile.type) { <option [ngValue]="account.id">{{ account.nombre }}</option> }
                  }
                </select>
              </label>
              @if (profile.account) {
                <label>{{ profile.provider === 'SEARS' ? 'Terminaciones Sears (obligatorias)' : 'Últimos cuatro dígitos (opcionales)' }}
                  <input type="text" [attr.inputmode]="profile.provider === 'SEARS' ? 'text' : 'numeric'" [attr.maxlength]="profile.provider === 'SEARS' ? 58 : 4" autocomplete="off" [(ngModel)]="profile.suffix" />
                </label>
                @if(profile.provider === 'SEARS') { <p>Para la física y la digital, separa sus cuatro dígitos con una coma. Ambas se registrarán en esta misma cuenta.</p> }
              }
            }
            <label>App de mensajes para Sears
              <select [(ngModel)]="smsPackage"><option value="">Elige tu app</option>
                @for (app of smsApps(); track app.packageName) { <option [value]="app.packageName">{{ app.label }}</option> }
              </select>
            </label>
            <label>Remitente de Sears <input type="text" maxlength="40" autocomplete="off" [(ngModel)]="sender" /></label>
            <label>Lista de destino <select [(ngModel)]="listId"><option [ngValue]="null">Elige una lista</option>
              @for (list of lists(); track list.id) { <option [ngValue]="list.id">{{ list.nombre }}</option> }
            </select></label>
            <label><input type="checkbox" [(ngModel)]="consent" /> Quiero registrar directamente las compras reconocidas en estas cuentas.</label>
            <button type="button" (click)="connect()" [disabled]="!consent || busy() || !bank.current().granted">Activar registro automático</button>
          </fieldset>
        }
        <button type="button" (click)="disconnect()" [disabled]="busy()">Desconectar y borrar envíos locales pendientes</button>
        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (error()) { <p role="alert">{{ error() }}</p> }
      </details>
    }
  `,
  styles: `:host{display:block;margin:1rem 0}summary{font-weight:700;cursor:pointer;padding:.8rem 0}p{margin:.7rem 0}label{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin:.6rem 0}select,input,button{font:inherit;min-height:44px;max-width:100%}select,input{border:1px solid var(--border,#ccc);border-radius:.6rem;padding:.4rem}button{padding:.5rem .8rem;margin:.3rem;border:1px solid var(--border,#ccc);border-radius:.8rem}fieldset{min-width:0}`,
})
export class AutomaticBankComponent {
  readonly automatic = inject(AutomaticBankService);
  readonly bank = inject(BankNotificationsService);
  private readonly finance = inject(FinanzasService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly state = signal<AutomaticState | null>(null);
  readonly accounts = signal<Cuenta[]>([]);
  readonly lists = signal<ListaFinanciera[]>([]);
  readonly smsApps = signal<NoticeApp[]>([]);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly profiles = [
    { provider: 'SANTANDER', name: 'Santander', type: 'CREDITO', pkg: 'mx.bancosantander.supermovil', account: null as number | null, suffix: '' },
    { provider: 'REVOLUT', name: 'Revolut', type: 'DEBITO', pkg: 'com.revolut.revolut', account: null as number | null, suffix: '' },
    { provider: 'AMEX', name: 'American Express', type: 'CREDITO', pkg: 'com.americanexpress.android.acctsvcs.mx', account: null as number | null, suffix: '' },
    { provider: 'BBVA', name: 'BBVA', type: 'CREDITO', pkg: 'com.bancomer.mbanking', account: null as number | null, suffix: '' },
    { provider: 'SEARS', name: 'Sears Visa', type: 'CREDITO', pkg: '', account: null as number | null, suffix: '' },
  ];
  smsPackage = ''; sender = ''; listId: number | null = null; consent = false;
  opened(event: Event): void {
    if ((event.target as HTMLDetailsElement).open) void this.load();
    else { this.consent = false; this.loaded.set(false); this.state.set(null); this.sender = ''; for (const p of this.profiles) { p.suffix = ''; p.account = null; } }
  }
  async load(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.loaded.set(false);
    const userId = this.auth.currentUser()?.id;
    try {
      const [state, accounts, lists, apps] = await Promise.all([
        this.automatic.read(), firstValueFrom(this.finance.getCuentas()),
        firstValueFrom(this.http.get<ApiResponse<ListaFinanciera[]>>(`${getApiBaseUrl()}/listas`)), this.bank.apps(),
      ]);
      if (userId !== this.auth.currentUser()?.id) return;
      if (!state) throw new Error('Abre tu sesión de nuevo.');
      this.state.set(state); this.accounts.set(accounts.data.filter(a => a.activo));
      this.lists.set(lists.data.filter(l => !l.archivada && l.rol !== 'LECTOR' && l.moneda === 'MXN'));
      this.smsApps.set(apps.filter(a => ['com.google.android.apps.messaging', 'com.samsung.android.messaging', 'com.android.mms'].includes(a.packageName)));
      const rules = state.rules ?? [];
      const searsRules=rules.filter(r=>r.proveedor==='SEARS');
      const firstSears=searsRules[0];
      if(firstSears&&searsRules.some(r=>r.cuentaId!==firstSears.cuentaId||r.listaId!==firstSears.listaId
        ||r.paquete!==firstSears.paquete||r.remitente!==firstSears.remitente))throw new Error('Las tarjetas Sears usan distintas asociaciones.');
      for (const profile of this.profiles) {
        const rule = rules.find(r => r.proveedor === profile.provider);
        profile.account = rule?.cuentaId ?? null;
        profile.suffix = profile.provider==='SEARS'?searsRules.map(r=>r.terminacion??'').join(', '):rule?.terminacion??'';
      }
      const sears = rules.find(r => r.proveedor === 'SEARS');
      this.smsPackage = sears?.paquete ?? '';
      this.sender = sears?.remitente ?? '';
      this.listId = rules[0]?.listaId ?? null;
      this.loaded.set(true);
    } catch { this.error.set('No se pudo cargar la configuración. Comprueba sesión y conexión.'); }
    finally { this.busy.set(false); }
  }
  async connect(): Promise<void> {
    this.error.set(''); this.message.set('');
    const selected = this.profiles.filter(p => p.account);
    if (!this.consent || !this.listId || !selected.length || selected.some(p => {
      if(p.provider!=='SEARS')return !!p.suffix&&!/^[0-9]{4}$/.test(p.suffix);
      const cards=p.suffix.split(',').map(s=>s.trim());
      return !this.smsPackage||!this.sender.trim()||cards.some(s=>!/^[0-9]{4}$/.test(s))||new Set(cards).size!==cards.length;
    })) {
      this.error.set('Elige cuenta y lista; Sears necesita app de mensajes, remitente y terminaciones de cuatro dígitos sin repetir.'); return;
    }
    const rules: AutomaticRule[] = selected.flatMap(p => (p.provider==='SEARS'?p.suffix.split(',').map(s=>s.trim()):[p.suffix||null]).map(suffix=>({ id: crypto.randomUUID(), proveedor: p.provider,
      paquete: p.provider === 'SEARS' ? this.smsPackage : p.pkg,
      remitente: p.provider === 'SEARS' ? this.sender.trim() : null, terminacion: suffix,
      cuentaId: p.account!, listaId: this.listId!, categoriaId: null })));
    if(rules.length>10){this.error.set('Configura como máximo diez tarjetas y orígenes en este dispositivo.');return;}
    this.busy.set(true);
    try {
      await this.automatic.configure(rules, this.consent);
      this.state.set(await this.automatic.read()); this.consent = false;
      this.message.set('Registro automático activado. No se importan compras anteriores.');
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 404
        ? 'El servidor todavía no tiene disponible el registro automático. Hace falta publicar la actualización.'
        : 'No se pudo activar. Revisa acceso de Android, cuentas, conexión y envíos pendientes.');
    } finally { this.busy.set(false); }
  }
  async disconnect(): Promise<void> {
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { await this.automatic.disconnect(); this.state.set(await this.automatic.read()); this.message.set('Dispositivo desconectado.'); }
    catch { this.error.set('No se pudo revocar la conexión. Reintenta con internet o pausa la recepción local.'); }
    finally { this.busy.set(false); }
  }
}
