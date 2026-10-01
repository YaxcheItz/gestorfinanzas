import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { routes } from './app.routes';

/**
 * Al arrancar, si el access token guardado ya caducó, se renueva antes de que la
 * app pida nada.
 *
 * Sin esto, volver a la app (o abrirla desde el icono de la pantalla de inicio)
 * lanza de inmediato varias peticiones en paralelo, todas con un token de hace
 * más de 15 minutos, todas responden 401 y cada una empuja a /login. El
 * usuario ve el formulario de acceso aunque su sesión de 30 días siga perfectamente
 * viva. Renovando de entrada, las peticiones ya salen con un token válido.
 *
 * El fallo se traga a propósito: si la cookie de refresh tampoco sirve, la sesión
 * ya está limpia y el guard de cada ruta se encarga de mandar al login. Un error
 * aquí no debe impedir que la aplicación arranque.
 */
function renovarSiHaceFalta(): Promise<unknown> {
  const auth = inject(AuthService);
  if (!auth.getToken() || !auth.tokenCaducado()) return Promise.resolve();
  return firstValueFrom(auth.renovarSesion()).catch(() => undefined);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAppInitializer(renovarSiHaceFalta)
  ]
};