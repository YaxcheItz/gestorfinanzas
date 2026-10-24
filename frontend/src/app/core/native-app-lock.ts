import { InjectionToken } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AppLockState { enabled: boolean; supported: boolean; available: boolean; }
export interface NativeAppLock {
  read(): Promise<AppLockState>;
  set(options: { enabled: boolean }): Promise<AppLockState>;
}
export const NATIVE_APP_LOCK = new InjectionToken<NativeAppLock | null>('Native app lock', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android'
    ? registerPlugin<NativeAppLock>('AppLock') : null,
});
