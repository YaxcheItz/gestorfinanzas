import { Directive, ElementRef, Renderer2, effect, inject } from '@angular/core';
import { PrivacidadService } from '../../core/services/privacidad.service';
@Directive({ selector: 'input[appMontoPrivado]', standalone: true })
export class MontoPrivadoDirective {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly privacidad = inject(PrivacidadService);
  private readonly original = this.element.nativeElement.type;
  constructor() { effect(() => this.renderer.setProperty(this.element.nativeElement, 'type', this.privacidad.ocultarMontos() ? 'password' : this.original)); }
}
