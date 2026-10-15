import { Component, Input } from '@angular/core';
import { emojiCategoria } from './categoria-iconos';

@Component({
  selector: 'app-categoria-icono',
  standalone: true,
  template: `<span [class]="clase" class="category-emoji inline-flex items-center justify-center leading-none" aria-hidden="true">{{ nombreIcono }}</span>`
})
export class CategoriaIconoComponent {
  @Input() icono: string | null | undefined;
  @Input() tipo: string = 'GASTO';
  @Input() clase = 'h-5 w-5';

  get nombreIcono(): string {
    return emojiCategoria(this.icono, this.tipo);
  }

}
