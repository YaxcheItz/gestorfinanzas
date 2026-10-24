import { DestroyRef, Injectable, InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { AuthService } from './auth.service';

export interface SharedNotice { id: string; text?: string; anotherUser?: boolean; }
interface SharedNoticeState { pending?: SharedNotice; error?: string; }
interface SharedNoticePlugin {
  read(options: { userId: number }): Promise<SharedNoticeState>;
  discard(options: { id?: string }): Promise<void>;
  addListener(event: 'changed', listener: () => void): Promise<PluginListenerHandle>;
}
export const SHARED_NOTICE_NATIVE = new InjectionToken<SharedNoticePlugin | null>('SharedNotice native', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android'
    ? registerPlugin<SharedNoticePlugin>('SharedNotice') : null,
});

@Injectable({ providedIn: 'root' })
export class SharedNoticeService {
  private readonly native = inject(SHARED_NOTICE_NATIVE);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<SharedNoticeState>({});
  private readonly loadedUser = signal(-1);
  private turn = 0;
  private destroyed = false;
  readonly pending = computed(() => this.loadedUser() === (this.auth.currentUser()?.id ?? 0)
    ? this.state().pending : undefined);
  readonly error = computed(() => this.loadedUser() === (this.auth.currentUser()?.id ?? 0)
    ? this.state().error ?? '' : '');

  constructor() {
    if (!this.native) return;
    let listener: PluginListenerHandle | undefined;
    this.destroyRef.onDestroy(() => { this.destroyed = true; this.turn++; void listener?.remove(); });
    void this.native.addListener('changed', () => void this.refresh()).then(handle => {
      if (this.destroyed) void handle.remove(); else listener = handle;
    }).catch(() => this.state.set({ error: 'No se pudo abrir la recepción de textos compartidos.' }));
    effect(() => { this.auth.currentUser(); void this.refresh(); });
  }

  async refresh(): Promise<void> {
    if (!this.native) return;
    const userId = this.auth.currentUser()?.id ?? 0;
    const turn = ++this.turn;
    try {
      const state = await this.native.read({ userId });
      if (this.destroyed || turn !== this.turn || (this.auth.currentUser()?.id ?? 0) !== userId) return;
      this.loadedUser.set(userId);
      this.state.set(state);
    } catch {
      if (!this.destroyed && turn === this.turn) {
        this.loadedUser.set(userId);
        this.state.set({ error: 'No se pudo leer el texto compartido. Vuelve a abrir la app.' });
      }
    }
  }

  isCurrent(id: string): boolean { return this.pending()?.id === id && !!this.pending()?.text; }

  async discard(id?: string): Promise<void> {
    await this.native?.discard({ id });
    await this.refresh();
  }
}
