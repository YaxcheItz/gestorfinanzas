import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { AuthService } from './auth.service';

export interface SharedNotice { id: string; text?: string; anotherUser?: boolean; }
interface SharedNoticeState { pending?: SharedNotice; error?: string; }
interface SharedNoticePlugin {
  read(options: { userId: number }): Promise<SharedNoticeState>;
  discard(options: { id?: string }): Promise<void>;
  addListener(event: 'changed', listener: () => void): Promise<PluginListenerHandle>;
}
const native = registerPlugin<SharedNoticePlugin>('SharedNotice');

@Injectable({ providedIn: 'root' })
export class SharedNoticeService {
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
    if (Capacitor.getPlatform() !== 'android') return;
    let listener: PluginListenerHandle | undefined;
    this.destroyRef.onDestroy(() => { this.destroyed = true; this.turn++; void listener?.remove(); });
    void native.addListener('changed', () => void this.refresh()).then(handle => {
      if (this.destroyed) void handle.remove(); else listener = handle;
    }).catch(() => this.state.set({ error: 'No se pudo abrir la recepción de textos compartidos.' }));
    effect(() => { this.auth.currentUser(); void this.refresh(); });
  }

  async refresh(): Promise<void> {
    const userId = this.auth.currentUser()?.id ?? 0;
    const turn = ++this.turn;
    try {
      const state = await native.read({ userId });
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
    await native.discard({ id });
    await this.refresh();
  }
}
