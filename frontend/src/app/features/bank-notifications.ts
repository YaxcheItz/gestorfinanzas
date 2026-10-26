import { Component, inject, output, signal } from '@angular/core';
import { BankNotice, BankNotificationsService, NoticeApp } from '../core/services/bank-notifications';
import { AutomaticBankComponent } from './automatic-bank';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-bank-notifications',
  imports: [AutomaticBankComponent, RouterLink],
  templateUrl: './bank-notifications.html',
  styleUrls: ['./bank-notice-controls.css', './bank-notifications.css'],
})
export class BankNotificationsComponent {
  readonly bank = inject(BankNotificationsService);
  readonly review = output<BankNotice>();
  readonly apps = signal<NoticeApp[]>([]);
  readonly appsLoaded = signal(false);
  readonly selected = signal<string[]>([]);
  readonly consent = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  bankName(pkg: string): string {
    return ({ 'mx.bancosantander.supermovil': 'Santander', 'com.revolut.revolut': 'Revolut',
      'com.americanexpress.android.acctsvcs.mx': 'American Express', 'com.bancomer.mbanking': 'BBVA',
      'com.google.android.apps.messaging': 'Mensaje bancario', 'com.samsung.android.messaging': 'Mensaje bancario',
      'com.android.mms': 'Mensaje bancario' } as Record<string,string>)[pkg] ?? 'Notificación bancaria';
  }
  statusLabel(status?: string): string {
    return ({ready:'Compra reconocida',queued:'Enviando',registered:'Gasto registrado',review:'Comprobar movimiento',
      card_mismatch:'Revisar tarjeta',inactive:'Registro desactivado'} as Record<string,string>)[status ?? ''] ?? 'Revisión manual';
  }
  automaticReason(status?: string,canRetry=false): string {
    if(status==='ready'&&canRetry)return 'Compra reconocida. Puedes registrar este aviso pendiente con la cuenta asociada.';
    const messages: Record<string,string> = {
      ready: 'Compra reconocida. Revisa los datos rellenados antes de guardarla.',
      inactive: 'El registro automático está desactivado o vencido en este teléfono.',
      app_not_linked: 'La aplicación que envió este aviso no está asociada al registro automático.',
      sender_mismatch: 'El remitente del aviso no coincide con el configurado para Sears.',
      format_or_card: 'El formato, la tarjeta, la moneda o la fecha no coinciden con una compra reconocida.',
      card_mismatch: 'La terminación del aviso no coincide con la tarjeta configurada. Revisa la cuenta y su terminación.',
      unsupported_format: 'El formato, importe, moneda o fecha del aviso necesita revisión.',
      ambiguous: 'Más de una cuenta coincide; revisa la cuenta antes de registrar.',
      queued: 'Esta compra ya está en la cola automática. No la guardes de nuevo.',
      registered: 'Esta compra ya se registró automáticamente. Compruébala en Movimientos.',
      review: 'El envío automático necesita revisión. Comprueba primero tus movimientos.',
      unavailable: 'No se pudo comprobar el registro automático. Conserva el aviso y vuelve a actualizar.',
    };
    return messages[status ?? ''] ?? 'Este aviso necesita revisión.';
  }
  readonly message = signal('');
  closeSettings(event: Event): void {
    if (!(event.target as HTMLDetailsElement).open) { this.apps.set([]); this.appsLoaded.set(false); this.consent.set(false); }
  }
  toggle(name: string, checked: boolean): void {
    this.selected.update(values => checked ? [...new Set([...values, name])] : values.filter(v => v !== name));
  }
  async loadApps(): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      this.apps.set((await this.bank.apps()).sort((a, b) => a.label.localeCompare(b.label)));
      this.selected.set([...this.bank.current().packages]); this.appsLoaded.set(true);
    } catch { this.error.set('No se pudieron listar las apps. Reintenta con la sesión abierta.'); }
    finally { this.busy.set(false); }
  }
  async run(action: 'settings' | 'enable' | 'pause'): Promise<void> {
    this.busy.set(true); this.error.set(''); this.message.set('');
    try {
      if (action === 'settings') await this.bank.settings();
      else {
        await this.bank.configure(action === 'enable', action === 'enable' ? this.selected() : [], this.consent());
        this.message.set(action === 'enable' ? 'Recepción activada para las apps elegidas.' : 'Recepción pausada y datos locales borrados. Puedes revocar también el acceso en Android.');
        if (action === 'pause') { this.selected.set([]); this.consent.set(false); }
      }
    } catch { this.error.set('No se pudo cambiar la recepción. Comprueba acceso, sesión y selección.'); }
    finally { this.busy.set(false); }
  }
  async discard(notice: BankNotice): Promise<void> {
    this.busy.set(true); this.error.set('');
    try { await this.bank.discard(notice); }
    catch { this.error.set('El aviso cambió o no se pudo borrar. Actualiza y vuelve a revisar.'); }
    finally { this.busy.set(false); }
  }
  async retry(notice: BankNotice): Promise<void> {
    this.busy.set(true);this.error.set('');
    try { await this.bank.retryAutomatic(notice); }
    catch { this.error.set('Actualiza el estado y comprueba tus movimientos antes de volver a intentar.'); }
    finally { this.busy.set(false); }
  }
}
