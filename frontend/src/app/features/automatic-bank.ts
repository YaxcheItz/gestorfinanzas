import { Component, effect, inject, output, signal } from '@angular/core';
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
import { MontoPipe } from '../core/pipes/monto.pipe';
import { TextoFinancieroPipe } from '../core/pipes/texto-financiero.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-automatic-bank',
  imports: [FormsModule, MontoPipe, TextoFinancieroPipe, RouterLink],
  templateUrl: './automatic-bank.html',
  styleUrls: ['./bank-notice-controls.css', './automatic-bank.css'],
})
export class AutomaticBankComponent {
  readonly changed = output<void>();
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
  readonly summaryError = signal('');
  readonly showEntries = signal(false);
  reconnectConsent = false;
  accountName(id: number): string { return this.accounts().find(a=>a.id===id)?.nombre ?? 'Cuenta asociada'; }
  async toggleEntries(): Promise<void> {
    this.showEntries.update(value=>!value);
    if(this.showEntries()) {
      const user=this.auth.currentUser()?.id;
      try {
        const response=await firstValueFrom(this.finance.getCuentas());
        if(user===this.auth.currentUser()?.id)this.accounts.set(response.data.filter(a=>a.activo));
      } catch { /* Queue details stay available offline. */ }
    }
  }
  private summaryTurn = 0;
  private summaryOwner: number | undefined;
  constructor() {
    effect(() => {
      const user = this.auth.currentUser()?.id;
      if (this.summaryOwner !== user) {
        this.summaryOwner = user; this.state.set(null); this.loaded.set(false); this.consent = false;
        this.reconnectConsent = false;this.showEntries.set(false);
        this.sender = ''; this.smsPackage = ''; this.listId = null;
        this.accounts.set([]); this.lists.set([]);
        for (const p of this.profiles) { p.account = null; p.suffix = ''; }
      }
      this.bank.current();
      void this.refreshSummary();
    });
  }
  async refreshSummary(): Promise<void> {
    const user = this.auth.currentUser()?.id;
    const turn = ++this.summaryTurn;
    try {
      const state = await this.automatic.read();
      if (turn !== this.summaryTurn || user !== this.auth.currentUser()?.id) return;
      const previous=this.state();
      this.state.set(state); this.summaryError.set(state ? '' : 'Abre tu sesión para comprobar el registro.');
      if(previous && state && (previous.registered!==state.registered || previous.review!==state.review))this.changed.emit();
    } catch {
      if (turn === this.summaryTurn) { this.state.set(null); this.summaryError.set('No se pudo comprobar el registro. Actualiza el estado.'); }
    }
  }
  ruleCount(provider: string): number { return this.state()?.rules?.filter(r => r.proveedor === provider).length ?? 0; }
  bankName(provider: string): string { return this.profiles.find(p => p.provider === provider)?.name ?? 'Compra bancaria'; }
  statusLabel(status: string): string { return ({queued:'Pendiente de envío',registered:'Registrado',review:'Revisar en Movimientos'} as Record<string,string>)[status] ?? 'Revisar'; }
  reason(): string {
    const s=this.state();
    if (!s) return this.summaryError() || 'Comprobando conexión…';
    return ({permission:'Concede acceso a las notificaciones en Android.',reconnect:'La conexión necesita restablecerse. Tus envíos siguen guardados.',
      expired:'La conexión venció. Restablécela para enviar las compras guardadas.',not_configured:'Asocia un banco para comenzar.',
      network:'Sin conexión. Las compras siguen guardadas y se reintentarán.',server:'El servidor no respondió correctamente. Puedes reintentar.',
      rate_limit:'El servidor pidió esperar. Se reintentará automáticamente.'} as Record<string,string>)[s.reason || s.error] ?? '';
  }
  canUseAccount(profile: {provider:string;type:string}, account: Cuenta): boolean {
    return account.moneda==='MXN' && (['SANTANDER','BBVA'].includes(profile.provider)
      ? ['CREDITO','DEBITO'].includes(account.tipo) : account.tipo===profile.type);
  }
  async recover(): Promise<void> {
    if (this.busy() || !this.reconnectConsent) return;
    this.busy.set(true);this.error.set('');this.message.set('');
    try {
      await this.automatic.reconnect(this.reconnectConsent);
      this.reconnectConsent=false;await this.refreshSummary();
      this.message.set('Conexión restablecida. Se conservan las cuentas y los envíos pendientes.');
    } catch { this.error.set('No se pudo restablecer. Comprueba sesión, internet y acceso de Android. Tus envíos se conservan.'); }
    finally { this.busy.set(false); }
  }
  async retry(): Promise<void> {
    if(this.busy())return;
    this.busy.set(true);this.error.set('');this.message.set('');
    try { await this.automatic.retry();await this.refreshSummary();this.message.set('Reintento solicitado. El resultado aparecerá aquí.'); }
    catch { this.error.set('No se pudo reintentar. Restablece la conexión si está desactivada.'); }
    finally { this.busy.set(false); }
  }
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
    else { this.consent = false; this.loaded.set(false); this.sender = ''; for (const p of this.profiles) { p.suffix = ''; p.account = null; } }
  }
  async load(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.loaded.set(false);
    const userId = this.auth.currentUser()?.id;
    try {
      const state = await this.automatic.read();
      if (userId !== this.auth.currentUser()?.id) return;
      this.state.set(state);
      const [accounts, lists, apps] = await Promise.all([
        firstValueFrom(this.finance.getCuentas()),
        firstValueFrom(this.http.get<ApiResponse<ListaFinanciera[]>>(`${getApiBaseUrl()}/listas`)), this.bank.apps().catch(() => []),
      ]);
      if (userId !== this.auth.currentUser()?.id) return;
      if (!state) throw new Error('Abre tu sesión de nuevo.');
      this.accounts.set(accounts.data.filter(a => a.activo));
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
