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
  readonly editingRule = signal<AutomaticRule | null>(null);
  readonly addingRule = signal(false);
  ruleConsent = false;
  private rulesAtEdit = '';
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
        this.editingRule.set(null); this.ruleConsent = false; this.rulesAtEdit = '';
        this.reconnectConsent = false;this.showEntries.set(false);
        this.sender = ''; this.smsPackage = ''; this.listId = null; this.revolutIncomeMxn = false;
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
  listName(id: number): string { return this.lists().find(l => l.id === id)?.nombre ?? 'Lista asociada'; }
  editAssociation(rule: AutomaticRule): void {
    this.error.set(''); this.message.set(''); this.ruleConsent = false; this.addingRule.set(false);
    this.rulesAtEdit=JSON.stringify(this.state()?.rules ?? []);
    this.editingRule.set({...rule});
  }
  addAssociation(): void {
    this.error.set(''); this.message.set(''); this.ruleConsent = false; this.addingRule.set(true);
    this.rulesAtEdit=JSON.stringify(this.state()?.rules ?? []);
    this.editingRule.set({id:crypto.randomUUID(),proveedor:'SANTANDER',paquete:'mx.bancosantander.supermovil',
      remitente:null,terminacion:null,cuentaId:null as unknown as number,listaId:this.listId as number,
      categoriaId:null,ingresosMxn:false});
  }
  setAssociationProvider(provider: string): void {
    const current=this.editingRule(), profile=this.profiles.find(p=>p.provider===provider);
    if (!current || !profile || !this.addingRule()) return;
    this.editingRule.set({...current,proveedor:provider,paquete:provider==='SEARS'?'':profile.pkg,
      remitente:null,terminacion:null,cuentaId:null as unknown as number,categoriaId:null,ingresosMxn:false});
  }
  async saveAssociation(): Promise<void> {
    const draft=this.editingRule(), state=this.state(), owner=this.auth.currentUser()?.id;
    if (this.busy() || !draft || !state || !owner || !this.ruleConsent) return;
    const profile=this.profiles.find(p=>p.provider===draft.proveedor);
    const account=this.accounts().find(a=>a.id===draft.cuentaId);
    const lista=this.lists().find(l=>l.id===draft.listaId);
    const suffix=(draft.terminacion ?? '').trim();
    const sender=(draft.remitente ?? '').trim();
    const sears=draft.proveedor==='SEARS';
    if (!profile || !account || !this.canUseAccount(profile,account) || !lista
        || (suffix!=='' && !/^[0-9]{4}$/.test(suffix))
        || (sears && (!suffix || !sender || !this.smsApps().some(a=>a.packageName===draft.paquete)))) {
      this.error.set('Revisa el banco, la cuenta, la lista y los datos del aviso.'); return;
    }
    if (state.queued) { this.error.set('Espera a que terminen los envíos pendientes antes de cambiar asociaciones.'); return; }
    const updated:AutomaticRule={...draft,paquete:sears?draft.paquete:profile.pkg,
      remitente:sears?sender:null,terminacion:suffix||null,ingresosMxn:draft.proveedor==='REVOLUT' && !!draft.ingresosMxn};
    const existing=state.rules ?? [];
    if (JSON.stringify(existing)!==this.rulesAtEdit) {
      this.error.set('Las asociaciones cambiaron. Actualiza la lista antes de guardar.'); return;
    }
    if (!this.addingRule() && !existing.some(r=>r.id===draft.id)) {
      this.error.set('La asociación cambió. Actualiza la lista e inténtalo de nuevo.'); return;
    }
    const others=existing.filter(r=>r.id!==draft.id);
    if (others.some(r=>r.paquete===updated.paquete && (r.remitente??'')===(updated.remitente??'')
        && (!(r.terminacion??'') || !updated.terminacion || r.terminacion===updated.terminacion))) {
      this.error.set('Esa aplicación ya tiene una asociación que podría coincidir con el mismo aviso.'); return;
    }
    const rules=this.addingRule()?[...existing,updated]:existing.map(r=>r.id===updated.id?updated:r);
    if (rules.length>10) { this.error.set('Configura como máximo diez asociaciones.'); return; }
    const previous=existing.find(r=>r.id===updated.id);
    const unchanged=!!(!this.addingRule() && previous
        && previous.proveedor===updated.proveedor && previous.paquete===updated.paquete
        && (previous.remitente??null)===(updated.remitente??null)
        && (previous.terminacion??null)===(updated.terminacion??null)
        && previous.cuentaId===updated.cuentaId && previous.listaId===updated.listaId
        && (previous.categoriaId??null)===(updated.categoriaId??null)
        && !!previous.ingresosMxn===!!updated.ingresosMxn);
    const manual=this.bank.current();
    const packages=new Set([...(manual.enabled ? manual.packages ?? [] : []),...rules.map(r=>r.paquete)]);
    if (packages.size>10) {
      this.error.set('Ya hay diez aplicaciones de avisos. Revisa la selección antes de añadir otra.'); return;
    }
    this.busy.set(true);this.error.set('');this.message.set('');
    try {
      const latest=await this.automatic.read();
      if(owner!==this.auth.currentUser()?.id)return;
      if(!latest || latest.queued || JSON.stringify(latest.rules ?? [])!==JSON.stringify(existing)) {
        this.error.set('Las asociaciones o los envíos cambiaron. Actualiza la lista antes de guardar.');
        return;
      }
      if(unchanged) {
        this.editingRule.set(null);this.ruleConsent=false;this.message.set('La asociación no tenía cambios.');return;
      }
      await this.automatic.configure(rules,true);
      if(owner!==this.auth.currentUser()?.id)return;
      const saved=await this.automatic.read();
      if(owner!==this.auth.currentUser()?.id)return;
      this.state.set(saved);
      this.editingRule.set(null);this.ruleConsent=false;
      this.message.set('Asociación guardada. Las demás asociaciones se conservaron.');
    } catch {
      if(owner===this.auth.currentUser()?.id)this.error.set('No se pudo guardar. Comprueba la conexión y los envíos pendientes.');
    } finally { this.busy.set(false); }
  }
  statusLabel(status: string): string { return ({queued:'Pendiente de envío',registered:'Registrado',review:'Revisar en Movimientos'} as Record<string,string>)[status] ?? 'Revisar'; }
  reason(): string {
    const s=this.state();
    if (!s) return this.summaryError() || 'Comprobando conexión…';
    if (s.reason === 'reconnect') {
      const detalle: Record<string,string> = {
        http_401: 'El servidor rechazó la credencial (401). Tus envíos siguen guardados.',
        http_403: 'El servidor rechazó el acceso (403). Tus envíos siguen guardados.',
        http_404: 'El servidor no encontró el servicio (404). Tus envíos siguen guardados.'
      };
      if (detalle[s.error]) return detalle[s.error];
    }
    return ({permission:'Concede acceso a las notificaciones en Android.',reconnect:'La conexión necesita restablecerse. Tus envíos siguen guardados.',
      expired:'La conexión venció. Restablécela para enviar las compras guardadas.',not_configured:'Asocia un banco para comenzar.',
      network:'Sin conexión. Las compras siguen guardadas y se reintentarán.',server:'El servidor no respondió correctamente. Puedes reintentar.',
      rate_limit:'El servidor pidió esperar. Se reintentará automáticamente.'} as Record<string,string>)[s.reason || s.error] ?? '';
  }
  canUseAccount(profile: {provider:string;type:string}, account: Cuenta): boolean {
    const types=profile.provider==='REVOLUT' ? ['DEBITO','AHORRO']
      : ['SANTANDER','BBVA'].includes(profile.provider) ? ['CREDITO','DEBITO'] : [profile.type];
    return account.moneda==='MXN' && types.includes(account.tipo);
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
  smsPackage = ''; sender = ''; listId: number | null = null; consent = false; revolutIncomeMxn = false;
  opened(event: Event): void {
    if ((event.target as HTMLDetailsElement).open) void this.load();
    else { this.consent = false; this.ruleConsent=false; this.editingRule.set(null); this.revolutIncomeMxn = false; this.loaded.set(false); this.sender = ''; for (const p of this.profiles) { p.suffix = ''; p.account = null; } }
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
      this.revolutIncomeMxn = rules.find(r => r.proveedor === 'REVOLUT')?.ingresosMxn === true;
      const searsRules=rules.filter(r=>r.proveedor==='SEARS');
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
    const existing=this.state()?.rules ?? [];
    const distinctLists=new Set(existing.map(r=>r.listaId));
    const unsupported=existing.some(r=>!this.profiles.some(p=>p.provider===r.proveedor));
    const repeated=existing.some((r,i)=>r.proveedor!=='SEARS'
      && existing.findIndex(other=>other.proveedor===r.proveedor)!==i);
    const sears=existing.filter(r=>r.proveedor==='SEARS'), first=sears[0];
    const variedSears=!!first && sears.some(r=>r.cuentaId!==first.cuentaId || r.listaId!==first.listaId
      || r.paquete!==first.paquete || r.remitente!==first.remitente);
    if (distinctLists.size>1 || unsupported || repeated || variedSears) {
      this.error.set('Esta configuración tiene varias asociaciones. Edítalas una por una para conservarlas.');
      return;
    }
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
      cuentaId: p.account!, listaId: this.listId!, categoriaId: null,
      ingresosMxn: p.provider === 'REVOLUT' && this.revolutIncomeMxn })));
    for (const rule of rules) {
      const saved = this.state()?.rules?.find(r => r.proveedor === rule.proveedor && r.paquete === rule.paquete
        && (r.remitente ?? null) === rule.remitente && (r.terminacion ?? null) === rule.terminacion
        && r.cuentaId === rule.cuentaId && r.listaId === rule.listaId);
      if (saved) { rule.id = saved.id; rule.categoriaId = saved.categoriaId ?? null; }
    }
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
