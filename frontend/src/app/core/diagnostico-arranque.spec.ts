import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { diagnosticoArranqueInterceptor } from './diagnostico-arranque';
import { getApiBaseUrl } from './services/api-base-url';

describe('medición HTTP de arranque', () => {
  beforeEach(() => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'isPluginAvailable').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(['/perfil', '/listas', '/dashboard/resumen'])(
    'mide la ruta permitida %s y conserva la respuesta', async path => {
      const clock = vi.spyOn(performance, 'now');
      const request = new HttpRequest('GET', getApiBaseUrl() + path + '?dato=sintetico');
      const response = new HttpResponse({ status: 200, body: { dato: 'ficticio' } });
      const result = firstValueFrom(diagnosticoArranqueInterceptor(request, () => of(response)));
      expect(clock).toHaveBeenCalledTimes(2);
      await expect(result).resolves.toBe(response);
    },
  );

  it('mide un fallo de renovación y conserva el error de la petición', async () => {
    const clock = vi.spyOn(performance, 'now');
    const request = new HttpRequest('POST', getApiBaseUrl() + '/auth/refresh', {});
    const error = new HttpErrorResponse({ status: 503, error: 'detalle ficticio' });
    const result = firstValueFrom(diagnosticoArranqueInterceptor(request, () => throwError(() => error)));
    expect(clock).toHaveBeenCalledTimes(2);
    await expect(result).rejects.toBe(error);
  });

  it('ignora orígenes ajenos, rutas no admitidas y la configuración normal', async () => {
    const clock = vi.spyOn(performance, 'now');
    const response = new HttpResponse({ status: 200 });
    const read = (url: string) => firstValueFrom(diagnosticoArranqueInterceptor(
      new HttpRequest('GET', url), () => of(response),
    ));
    await read('https://externo.example.test/api/perfil');
    await read(getApiBaseUrl() + '/listas/19');
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);
    await read(getApiBaseUrl() + '/perfil');
    expect(clock).not.toHaveBeenCalled();
  });
});
