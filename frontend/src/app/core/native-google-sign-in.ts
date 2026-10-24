import { InjectionToken } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeGoogleSignIn {
  signIn(options: { clientId: string }): Promise<{ credential: string }>;
}

export const NATIVE_GOOGLE_SIGN_IN = new InjectionToken<NativeGoogleSignIn | null>('Native Google sign-in', {
  providedIn: 'root', factory: () => Capacitor.getPlatform() === 'android'
    ? registerPlugin<NativeGoogleSignIn>('GoogleSignIn') : null,
});
