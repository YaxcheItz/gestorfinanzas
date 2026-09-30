import { CurrencyPipe } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { PrivacidadService } from '../services/privacidad.service';

/**
 * Muestra dinero igual que `CurrencyPipe`, o lo tapa si el usuario activo la
 * preferencia de privacidad.
 *
 * Acepta exactamente los mismos argumentos que `CurrencyPipe` y delega en el
 * cuando los montos estan visibles, para que el formato no cambie ni de un
 * decimal. Cuando estan ocultos devuelve los puntos suspensivos.
 *
 * IMPORTANTE: el pipe es impure a proposito. Como puro solo se recalcularia
 * cuando cambiaran sus argumentos, y el valor a formatear no cambia cuando lo
 * que cambia es la preferencia: la pantalla se quedaria con el monto ya
 * renderizado. No volverlo `pure: true` sin resolver eso antes.
 *
 * El `CurrencyPipe` se construye a mano en vez de inyectarse porque Angular no
 * lo declara `providedIn: 'root'`: es solo una declaracion de `CommonModule`, y
 * pedirlo por inyeccion lanza NG0201 en tiempo de ejecucion, no de compilacion.
 * `LOCALE_ID` si viene del inyector raiz, asi que el locale es el mismo que
 * usaba el pipe en las plantillas.
 */
@Pipe({ name: 'monto', pure: false })
export class MontoPipe implements PipeTransform {
  private readonly privacidad = inject(PrivacidadService);
  private readonly currencyPipe = new CurrencyPipe(inject(LOCALE_ID));

  transform(
    value: string | number | null | undefined,
    currencyCode?: string,
    display?: string | null,
    digitsInfo?: string | null
  ): string | null {
    // Un campo sin dato no se tapa: `CurrencyPipe` devuelve null y la plantilla
    // no imprime nada. Poner los puntos ahi sugeriría que si hay un valor que
    // solo se está escondiendo. El cero si se tapa, porque ese si es un monto.
    if (value === null || value === undefined || value === '') return null;
    if (this.privacidad.ocultarMontos()) return '•••';
    return this.currencyPipe.transform(value, currencyCode ?? 'USD', display ?? 'symbol', digitsInfo ?? '1.0-3');
  }
}
