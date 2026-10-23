import { Component, inject, output, signal } from '@angular/core';
import { BankNotice, BankNotificationsService, NoticeApp } from '../core/services/bank-notifications';

@Component({
  selector: 'app-bank-notifications',
  imports: [],
  template: `
    @if (bank.available) {
      <details (toggle)="closeSettings($event)">
        <summary>Notificaciones bancarias en este Android</summary>
        <p>Recepción {{ bank.current().enabled ? 'activa' : 'desactivada' }} · Acceso de Android {{ bank.current().granted ? 'concedido' : 'sin conceder' }}.</p>
        <p>Android concede acceso amplio a las notificaciones. Kaptal filtra en el teléfono las apps que elijas y conserva hasta 20 avisos durante 24 horas. No recupera notificaciones anteriores ni garantiza detectar todas las compras.</p>
        <p>Revisarás cada aviso antes de enviar un resumen a tu cuenta. Recibirlo no registra dinero. Al pausar, revocar el acceso o cerrar sesión se borran la selección y la cola local.</p>
        <label><input type="checkbox" [checked]="consent()" (change)="consent.set($any($event.target).checked)" /> Entiendo el acceso y quiero configurar esta recepción.</label>
        <div class="actions">
          <button type="button" (click)="run('settings')" [disabled]="busy() || !consent()">Abrir acceso de Android</button>
          <button type="button" (click)="loadApps()" [disabled]="busy() || !consent()">Elegir aplicaciones</button>
          <button type="button" (click)="bank.refresh()" [disabled]="busy()">Actualizar estado</button>
        </div>
        @if (appsLoaded()) {
          <fieldset [disabled]="busy()"><legend>Selecciona solo tus apps bancarias (máximo 10)</legend>
            @for (app of apps(); track app.packageName) {
              <label><input type="checkbox" [checked]="selected().includes(app.packageName)" (change)="toggle(app.packageName, $any($event.target).checked)" /> {{ app.label }} <small>{{ app.packageName }}</small></label>
            }
          </fieldset>
          <button type="button" (click)="run('enable')" [disabled]="busy() || !consent() || !bank.current().granted || selected().length === 0 || selected().length > 10">Activar con estas apps</button>
        }
        <button type="button" (click)="run('pause')" [disabled]="busy()">Pausar y borrar recepción local</button>
        @if (message()) { <p role="status">{{ message() }}</p> }
      </details>
      @if (bank.error()) { <p role="alert">{{ bank.error() }}</p> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      @if (bank.current().omitted) { <p role="status">Se omitieron avisos por seguridad o límites de almacenamiento. Comprueba los movimientos con tu banco.</p> }
      @for (notice of bank.current().notices; track notice.id) {
        <div class="local-notice">
          <p>Notificación local de {{ notice.packageName }}. {{ notice.revision > 1 ? 'El contenido fue actualizado; revisa los datos de nuevo.' : '' }}</p>
          <button type="button" (click)="review.emit(notice)" [disabled]="busy()">Revisar notificación</button>
          <button type="button" (click)="discard(notice)" [disabled]="busy()">Descartar del teléfono</button>
        </div>
      }
    }
  `,
  styles: `:host{display:block;margin:1rem 0}summary{cursor:pointer;min-height:44px;padding:.6rem 0;font-weight:700}p{margin:.65rem 0}label{display:flex;align-items:center;gap:.6rem;min-height:44px;flex-wrap:wrap}small{overflow-wrap:anywhere}button{min-height:44px;border:1px solid var(--border,#ddd);border-radius:1rem;padding:.5rem .8rem;margin:.25rem;font:inherit}button:disabled{opacity:.5}.actions{display:flex;flex-wrap:wrap}fieldset{max-height:18rem;overflow:auto}.local-notice{border-top:1px solid var(--border,#ddd);padding:.6rem 0;overflow-wrap:anywhere}`,
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
}
