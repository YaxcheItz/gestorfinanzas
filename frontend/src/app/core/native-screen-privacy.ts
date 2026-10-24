import { InjectionToken } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeScreenPrivacy {
  read(): Promise<{ enabled: boolean }>;
  set(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
}

export const NATIVE_SCREEN_PRIVACY = new InjectionToken<NativeScreenPrivacy | null>('Native screen privacy', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android'
    ? registerPlugin<NativeScreenPrivacy>('ScreenPrivacy') : null,
});
