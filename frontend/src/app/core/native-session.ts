import { Capacitor, registerPlugin } from '@capacitor/core';
import { Observable, from, of } from 'rxjs';

interface NativeSessionPlugin {
  read(): Promise<{ closed: boolean; userId: number }>;
  update(options: { closed: boolean; userId: number }): Promise<void>;
}
const native = registerPlugin<NativeSessionPlugin>('NativeSession');
export const nativeSessionBridge: NativeSessionPlugin = {
  read: () => native.read(), update: options => native.update(options),
};

export function persistNativeSession(closed: boolean, userId = 0): Observable<void> {
  return Capacitor.getPlatform() === 'android' ? from(nativeSessionBridge.update({ closed, userId })) : of(undefined);
}

export async function prepareNativeSession(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const state = await nativeSessionBridge.read();
  let userId = 0;
  try { userId = JSON.parse(localStorage.getItem('finanzas_user') ?? 'null')?.id ?? 0; } catch { /* Estado incompleto. */ }
  // WebView puede recuperar escrituras antiguas si Android mata el proceso inmediatamente.
  if (state.closed || (state.userId > 0 && state.userId !== userId)) {
    localStorage.removeItem('finanzas_user');
    localStorage.removeItem('finanzas_token');
  }
}
