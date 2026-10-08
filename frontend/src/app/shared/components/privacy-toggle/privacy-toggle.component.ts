import { Component, inject } from '@angular/core';
import { PerfilService } from '../../../core/services/perfil.service';
import { PrivacidadService } from '../../../core/services/privacidad.service';
@Component({ selector: 'app-privacy-toggle', standalone: true,
  template: `<button type="button" class="utility-button" (click)="perfil.alternarOcultarMontos()" [attr.aria-pressed]="privacidad.ocultarMontos()" [attr.aria-label]="privacidad.ocultarMontos() ? 'Mostrar montos' : 'Ocultar montos'" [title]="privacidad.ocultarMontos() ? 'Mostrar montos' : 'Ocultar montos'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if (privacidad.ocultarMontos()) {<path d="m3 3 18 18"/>}</svg></button>` })
export class PrivacyToggleComponent { readonly perfil = inject(PerfilService); readonly privacidad = inject(PrivacidadService); }
