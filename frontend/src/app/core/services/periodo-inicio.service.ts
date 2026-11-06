import { Injectable, signal } from '@angular/core';

@Injectable({providedIn:'root'})
export class PeriodoInicioService {
  readonly disponible = signal(false);
  readonly abierto = signal(false);
  readonly etiqueta = signal('');
}
