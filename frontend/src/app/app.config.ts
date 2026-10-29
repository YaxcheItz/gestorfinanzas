import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, inject, isDevMode } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';

// La estructura puede dibujarse mientras guard e interceptor esperan la misma renovación.
function renovarSiHaceFalta(): void {
  const auth = inject(AuthService);
  if (navigator.onLine === false || !auth.getToken() || !auth.tokenCaducado()) return;
  auth.renovarSesion().subscribe({ error: () => undefined });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    // El error global solo debe ver el resultado final, después del intento de renovación.
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    provideAppInitializer(renovarSiHaceFalta),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !Capacitor.isNativePlatform(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
