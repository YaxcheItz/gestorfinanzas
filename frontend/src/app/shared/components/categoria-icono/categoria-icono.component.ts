import { Component, Input } from '@angular/core';
import {
  LucideBriefcaseBusiness,
  LucideBusFront,
  LucideCar,
  LucideCirclePlus,
  LucideCoffee,
  LucideFuel,
  LucideGift,
  LucideGraduationCap,
  LucideHeartPulse,
  LucideHouse,
  LucidePawPrint,
  LucidePlane,
  LucideReceipt,
  LucideShoppingCart,
  LucideTrendingUp,
  LucideUtensils,
  LucideWallet
} from '@lucide/angular';
import { normalizarIconoCategoria } from './categoria-iconos';

@Component({
  selector: 'app-categoria-icono',
  standalone: true,
  imports: [
    LucideBriefcaseBusiness,
    LucideBusFront,
    LucideCar,
    LucideCirclePlus,
    LucideCoffee,
    LucideFuel,
    LucideGift,
    LucideGraduationCap,
    LucideHeartPulse,
    LucideHouse,
    LucidePawPrint,
    LucidePlane,
    LucideReceipt,
    LucideShoppingCart,
    LucideTrendingUp,
    LucideUtensils,
    LucideWallet
  ],
  template: `
    @switch (nombreIcono) {
      @case ('briefcase-business') { <svg lucideBriefcaseBusiness [class]="clase" aria-hidden="true"></svg> }
      @case ('bus-front') { <svg lucideBusFront [class]="clase" aria-hidden="true"></svg> }
      @case ('car') { <svg lucideCar [class]="clase" aria-hidden="true"></svg> }
      @case ('circle-plus') { <svg lucideCirclePlus [class]="clase" aria-hidden="true"></svg> }
      @case ('coffee') { <svg lucideCoffee [class]="clase" aria-hidden="true"></svg> }
      @case ('fuel') { <svg lucideFuel [class]="clase" aria-hidden="true"></svg> }
      @case ('gift') { <svg lucideGift [class]="clase" aria-hidden="true"></svg> }
      @case ('graduation-cap') { <svg lucideGraduationCap [class]="clase" aria-hidden="true"></svg> }
      @case ('heart-pulse') { <svg lucideHeartPulse [class]="clase" aria-hidden="true"></svg> }
      @case ('house') { <svg lucideHouse [class]="clase" aria-hidden="true"></svg> }
      @case ('paw-print') { <svg lucidePawPrint [class]="clase" aria-hidden="true"></svg> }
      @case ('plane') { <svg lucidePlane [class]="clase" aria-hidden="true"></svg> }
      @case ('shopping-cart') { <svg lucideShoppingCart [class]="clase" aria-hidden="true"></svg> }
      @case ('trending-up') { <svg lucideTrendingUp [class]="clase" aria-hidden="true"></svg> }
      @case ('utensils') { <svg lucideUtensils [class]="clase" aria-hidden="true"></svg> }
      @case ('wallet') { <svg lucideWallet [class]="clase" aria-hidden="true"></svg> }
      @default { <svg lucideReceipt [class]="clase" aria-hidden="true"></svg> }
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
}
