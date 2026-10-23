import { DestroyRef, Injectable, InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { AuthService } from './auth.service';

export interface BankNotice { id: string; text: string; packageName: string; revision: number; at: number; }
export interface NoticeApp { packageName: string; label: string; }
interface NoticeState { granted: boolean; enabled: boolean; packages: string[]; notices: BankNotice[]; omitted: number; }
interface BankNotificationsPlugin {
  read(options: { userId: number }): Promise<NoticeState>;
  apps(options: { userId: number }): Promise<{ apps: NoticeApp[] }>;
  settings(options: { userId: number }): Promise<void>;
  configure(options: { userId: number; enabled: boolean; packages: string[]; consent: boolean }): Promise<void>;
  discard(options: { userId: number; id: string; revision: number }): Promise<void>;
}
export const BANK_NOTIFICATIONS_NATIVE = new InjectionToken<BankNotificationsPlugin | null>('BankNotifications native', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android'
    ? registerPlugin<BankNotificationsPlugin>('BankNotifications') : null,
});
const empty = (): NoticeState => ({ granted: false, enabled: false, packages: [], notices: [], omitted: 0 });

@Injectable({ providedIn: 'root' })
export class BankNotificationsService {
  private readonly native = inject(BANK_NOTIFICATIONS_NATIVE);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<NoticeState>(empty());
  private readonly loadedUser = signal(-1);
  private turn = 0;
  private destroyed = false;
  readonly available = !!this.native;
  readonly error = signal('');
  readonly current = computed(() => this.loadedUser() === (this.auth.currentUser()?.id ?? 0) ? this.state() : empty());

  constructor() {
    if (!this.native) return;
    effect(() => { this.auth.currentUser(); void this.refresh(); });
    // Solo consulta estado local mientras la bandeja está visible; no transmite contenido.
    const timer = setInterval(() => {
      if (this.document.visibilityState === 'visible') void this.refresh();
    }, 3000);
    const visibility = () => { this.state.set(empty()); if (!this.document.hidden) void this.refresh(); };
    this.document.addEventListener('visibilitychange', visibility);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true; this.turn++; clearInterval(timer);
      this.document.removeEventListener('visibilitychange', visibility);
    });
  }

  async refresh(): Promise<boolean> {
    if (!this.native) return false;
    const userId = this.auth.currentUser()?.id ?? 0;
    const turn = ++this.turn;
    try {
      const state = await this.native.read({ userId });
      if (this.destroyed || turn !== this.turn || userId !== (this.auth.currentUser()?.id ?? 0)) return false;
      this.loadedUser.set(userId); this.state.set(state); this.error.set('');
      return true;
    } catch {
      if (!this.destroyed && turn === this.turn) {
        this.state.set(empty()); this.error.set('No se pudo leer la recepción local. Reintenta.');
      }
      return false;
    }
  }

  isCurrent(notice: BankNotice): boolean {
    return this.current().notices.some(n => n.id === notice.id && n.revision === notice.revision && n.text === notice.text);
  }
  async apps(): Promise<NoticeApp[]> {
    const userId = this.auth.currentUser()?.id ?? 0;
    const result = await this.native?.apps({ userId });
    return userId === (this.auth.currentUser()?.id ?? 0) ? result?.apps ?? [] : [];
  }
  async settings(): Promise<void> { await this.native?.settings({ userId: this.auth.currentUser()?.id ?? 0 }); }
  async configure(enabled: boolean, packages: string[], consent: boolean): Promise<void> {
    await this.native?.configure({ userId: this.auth.currentUser()?.id ?? 0, enabled, packages, consent });
    await this.refresh();
  }
  async discard(notice: BankNotice): Promise<void> {
    if (!this.isCurrent(notice)) throw new Error('Aviso actualizado.');
    await this.native?.discard({ userId: this.auth.currentUser()?.id ?? 0, id: notice.id, revision: notice.revision });
    await this.refresh();
  }
}
