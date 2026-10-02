import { CommonModule } from '@angular/common';
import { afterNextRender, Component, ElementRef, EventEmitter, inject, Injector, Input, Output, signal, ViewChild } from '@angular/core';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';

interface DiaCalendario {
  iso: string;
  numero: number;
  delMes: boolean;
  hoy: boolean;
}

@Component({
  selector: 'app-fecha-picker',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  template: `
    <button
      type="button"
      [attr.aria-label]="label + ': ' + fechaFormateada() + '. Cambiar fecha'"
      aria-haspopup="dialog"
      [attr.aria-expanded]="abierto()"
      (click)="abrir()"
      class="date-picker-input flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 shadow-xs transition hover:border-emerald-400 hover:bg-emerald-50/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30">
      <span class="truncate">{{ fechaFormateada() }}</span>
      <svg aria-hidden="true" class="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
    </button>

    @if (abierto()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm" (click)="cerrar()">
        <section appFocusTrap (focusTrapEscape)="cerrar()" tabindex="-1" role="dialog" aria-modal="true" [attr.aria-label]="'Calendario: ' + label" (click)="$event.stopPropagation()" class="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-zinc-950">
          <header class="bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white">
            <div class="flex items-center justify-between">
              <button type="button" (click)="cambiarMes(-1)" aria-label="Mes anterior" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/15 hover:text-white">
                <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.78 15.53a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06l5-5a.75.75 0 111.06 1.06L8.31 10l4.47 4.47a.75.75 0 010 1.06z" clip-rule="evenodd"/></svg>
              </button>
              <p class="text-base font-bold capitalize">{{ mesActual() }}</p>
              <button type="button" (click)="cambiarMes(1)" aria-label="Mes siguiente" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/15 hover:text-white">
                <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.22 4.47a.75.75 0 011.06 0l5 5a.75.75 0 010 1.06l-5 5a.75.75 0 11-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 010-1.06z" clip-rule="evenodd"/></svg>
              </button>
            </div>
            <p class="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald-100">{{ label }}</p>
            <p class="mt-1 text-2xl font-bold capitalize">{{ fechaFormateada() }}</p>
          </header>
          <div class="p-4 sm:p-5">
            <div class="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">
              @for (dia of diasSemana; track dia) { <span class="py-2">{{ dia }}</span> }
            </div>
            <div #calendarGrid class="grid grid-cols-7 gap-1" aria-label="Días del mes">
              @for (dia of diasMes(); track dia.iso) {
                <button type="button" [disabled]="min && dia.iso < min" [attr.tabindex]="dia.iso === fechaActiva() ? 0 : -1" [attr.data-date]="dia.iso" (keydown)="navegarFecha($event, dia.iso)" (click)="elegir(dia.iso)" [attr.aria-label]="fechaAccesible(dia.iso)" [attr.aria-pressed]="dia.iso === value" [class]="clasesDia(dia)" class="relative flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30">
                  {{ dia.numero }}
                  @if (dia.hoy && dia.iso !== value) { <span class="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500"></span> }
                </button>
              }
            </div>
            <footer class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <button type="button" (click)="elegir(hoyIso)" [disabled]="min && hoyIso < min" class="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-emerald-950">Hoy</button>
              <button type="button" (click)="cerrar()" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
            </footer>
          </div>
        </section>
      </div>
    }
  `
})
export class FechaPickerComponent {
  private readonly injector = inject(Injector);
  @ViewChild('calendarGrid') private calendarGrid?: ElementRef<HTMLElement>;
  @Input({ required: true }) id = 'fecha';
  @Input() label = 'Fecha';
  @Input() value = '';
  @Input() min = '';
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly abierto = signal(false);
  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  readonly hoyIso = this.aIso(new Date());
  readonly fechaEnFoco = signal<string | null>(null);
  private mesVisto = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  abrir(): void {
    let fecha = this.parsear(this.value) ?? new Date();
    if (this.min && this.aIso(fecha) < this.min) fecha = this.parsear(this.min) ?? fecha;
    this.mesVisto = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    this.fechaEnFoco.set(this.aIso(fecha));
    this.abierto.set(true);
    this.enfocarFechaDespuesDelRender(this.fechaEnFoco());
  }

  cerrar(): void { this.abierto.set(false); }

  cambiarMes(cantidad: number): void {
    const activa = this.parsear(this.fechaActiva()) ?? new Date();
    const primeroMesDestino = new Date(this.mesVisto.getFullYear(), this.mesVisto.getMonth() + cantidad, 1);
    const diaDestino = Math.min(activa.getDate(), new Date(
      primeroMesDestino.getFullYear(), primeroMesDestino.getMonth() + 1, 0
    ).getDate());
    let fechaDestino = new Date(primeroMesDestino.getFullYear(), primeroMesDestino.getMonth(), diaDestino);
    if (this.min && this.aIso(fechaDestino) < this.min) {
      fechaDestino = this.parsear(this.min) ?? fechaDestino;
    }
    this.mesVisto = new Date(fechaDestino.getFullYear(), fechaDestino.getMonth(), 1);
    this.fechaEnFoco.set(this.aIso(fechaDestino));
    this.enfocarFechaDespuesDelRender(this.fechaEnFoco());
  }

  mesActual(): string {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(this.mesVisto);
  }

  fechaFormateada(): string {
    const fecha = this.parsear(this.value);
    return fecha ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(fecha) : 'Selecciona una fecha';
  }

  diasMes(): DiaCalendario[] {
    const primero = new Date(this.mesVisto.getFullYear(), this.mesVisto.getMonth(), 1);
    const desplazamiento = (primero.getDay() + 6) % 7;
    const inicio = new Date(primero.getFullYear(), primero.getMonth(), 1 - desplazamiento);
    return Array.from({ length: 42 }, (_, indice) => {
      const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
      const iso = this.aIso(fecha);
      return { iso, numero: fecha.getDate(), delMes: fecha.getMonth() === this.mesVisto.getMonth(), hoy: iso === this.hoyIso };
    });
  }

  elegir(iso: string): void {
    if (this.min && iso < this.min) return;
    this.fechaEnFoco.set(iso);
    this.valueChange.emit(iso);
    this.cerrar();
  }

  fechaActiva(): string {
    const preferida = this.fechaEnFoco() ?? this.value;
    if (preferida && (!this.min || preferida >= this.min)) return preferida;
    return this.min || this.hoyIso;
  }

  navegarFecha(event: KeyboardEvent, iso: string): void {
    const movimientos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let destino: Date | null = null;
    const actual = this.parsear(iso);
    if (!actual) return;

    if (event.key in movimientos) {
      destino = new Date(actual.getFullYear(), actual.getMonth(), actual.getDate() + movimientos[event.key]);
    } else if (event.key === 'Home' || event.key === 'End') {
      const diaSemana = (actual.getDay() + 6) % 7;
      destino = new Date(actual.getFullYear(), actual.getMonth(), actual.getDate() + (event.key === 'Home' ? -diaSemana : 6 - diaSemana));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const cantidad = event.key === 'PageUp' ? -1 : 1;
      const mes = new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1);
      const dia = Math.min(actual.getDate(), new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate());
      destino = new Date(mes.getFullYear(), mes.getMonth(), dia);
    }
    if (!destino) return;

    const isoDestino = this.aIso(destino);
    if (this.min && isoDestino < this.min) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.fechaEnFoco.set(isoDestino);
    if (!this.diasMes().some(dia => dia.iso === isoDestino)) {
      this.mesVisto = new Date(destino.getFullYear(), destino.getMonth(), 1);
    }
    this.enfocarFechaDespuesDelRender(isoDestino);
  }

  private enfocarFechaDespuesDelRender(iso: string | null): void {
    if (!iso) return;
    afterNextRender(() => {
      this.calendarGrid?.nativeElement.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus();
    }, { injector: this.injector });
  }

  fechaAccesible(iso: string): string {
    const fecha = this.parsear(iso);
    return fecha ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(fecha) : iso;
  }

  clasesDia(dia: DiaCalendario): string {
    if (dia.iso === this.value) return 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700';
    if (!dia.delMes) return 'text-slate-300 hover:bg-slate-50 dark:text-slate-700 dark:hover:bg-slate-900';
    return 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-200';
  }

  private parsear(iso: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  }

  private aIso(fecha: Date): string {
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dia = `${fecha.getDate()}`.padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
