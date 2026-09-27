import { Component, Input } from '@angular/core';
import { colorIconoCategoria, esEmojiCategoria, normalizarIconoCategoria } from './categoria-iconos';

@Component({
  selector: 'app-categoria-icono',
  standalone: true,
  template: `
    @if (esEmoji) {
      <span [class]="clase" class="inline-flex items-center justify-center leading-none" aria-hidden="true">{{ nombreIcono }}</span>
    } @else {
      <svg [class]="clase" [style.color]="colorIcono" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <use [attr.href]="'category-icons.svg#' + nombreIcono"></use>
      </svg>
    }
  `
})
export class CategoriaIconoComponent {
  @Input() icono: string | null | undefined;
  @Input() tipo: string = 'GASTO';
  @Input() clase = 'h-5 w-5';

  get nombreIcono(): string {
    return normalizarIconoCategoria(this.icono, this.tipo);
  }

  get esEmoji(): boolean {
    return esEmojiCategoria(this.nombreIcono);
  }

  get colorIcono(): string {
    return colorIconoCategoria(this.nombreIcono, this.tipo);
  }
}
