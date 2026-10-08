import { Pipe, PipeTransform, inject } from '@angular/core';
import { PrivacidadService } from '../services/privacidad.service';
/** Las respuestas financieras de texto también respetan el control de privacidad. */
@Pipe({ name: 'textoFinanciero', standalone: true, pure: false })
export class TextoFinancieroPipe implements PipeTransform {
  private readonly privacidad = inject(PrivacidadService);
  transform(value: string | null | undefined): string {
    const text = value ?? '';
    return this.privacidad.ocultarMontos() ? text.replace(/\d+(?:[.,]\d+)*/g, '•••') : text;
  }
}
