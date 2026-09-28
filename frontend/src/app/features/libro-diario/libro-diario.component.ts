import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsientoContable, PageResponse } from '../../core/models/finanzas.models';
import { FinanzasService } from '../../core/services/finanzas.service';

@Component({
  selector: 'app-libro-diario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:space-y-7 sm:px-6 sm:py-8">
      <header>
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Finanzas · Registro contable</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Libro diario</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Cada movimiento nuevo se refleja como un asiento de doble partida. Debe y Haber cuadran por separado
          para cada moneda; los saldos actuales de tus cuentas siguen calculándose con el sistema existente.
        </p>
      </header>

      <aside class="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        Este ledger empieza con los movimientos registrados después de activar esta versión.
        El historial anterior se conserva en Transacciones y en tus respaldos; no se migró ni modificó.
      </aside>

      @if (error()) {
        <div role="alert" class="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{{ error() }}</span>
          <button type="button" (click)="cargar()" class="self-start font-semibold underline sm:self-auto">Reintentar</button>
        </div>
      } @else if (cargando() && !pagina()) {
        <p role="status" class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Cargando asientos contables...
        </p>
      } @else if (pagina()?.empty) {
        <section class="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-10">
          <h2 class="text-lg font-semibold text-slate-900">Aún no hay asientos contables</h2>
          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Cuando registres un ingreso, gasto, transferencia o saldo inicial, verás aquí sus partidas de Debe y Haber.
          </p>
          <a routerLink="/transacciones" class="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Ver movimientos
          </a>
        </section>
      } @else {
        <section aria-label="Asientos contables" class="space-y-4">
          @for (asiento of pagina()?.content ?? []; track asiento.id) {
            <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <header class="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="break-words text-sm font-bold text-slate-900">{{ asiento.descripcion }}</h2>
                    <span [class]="claseEvento(asiento.tipoEvento)" class="rounded-full px-2 py-1 text-[11px] font-semibold">
                      {{ etiquetaEvento(asiento.tipoEvento) }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500">
                    Movimiento #{{ asiento.transaccionOrigenId }} · {{ asiento.fechaOperacion | date:'longDate' }}
                  </p>
                </div>
                @if (asiento.tasaCambio) {
                  <p class="shrink-0 text-xs text-slate-600">Tipo de cambio: {{ asiento.tasaCambio | number:'1.0-8' }}</p>
                }
              </header>

              <div class="overflow-x-auto">
                <table class="w-full min-w-[30rem] text-left text-sm">
                  <caption class="sr-only">Partidas contables del asiento {{ asiento.id }}</caption>
                  <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" class="px-4 py-3 font-semibold sm:px-5">Cuenta contable</th>
                      <th scope="col" class="px-4 py-3 text-right font-semibold">Debe</th>
                      <th scope="col" class="px-4 py-3 text-right font-semibold sm:px-5">Haber</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (linea of asiento.lineas; track linea.id) {
                      <tr>
                        <th scope="row" class="max-w-56 px-4 py-3 font-medium text-slate-800 sm:max-w-none sm:px-5">
                          <span class="block break-words">{{ linea.nombreCuenta }}</span>
                          <span class="mt-0.5 block text-[11px] font-normal text-slate-500">
                            {{ linea.codigoCuenta }} · {{ linea.moneda }}
                          </span>
                        </th>
                        <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800">
                          {{ linea.lado === 'DEBE' ? (linea.monto | currency:linea.moneda:'symbol':'1.2-2') : '—' }}
                        </td>
                        <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800 sm:px-5">
                          {{ linea.lado === 'HABER' ? (linea.monto | currency:linea.moneda:'symbol':'1.2-2') : '—' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </article>
          }
        </section>

        <nav aria-label="Paginación del libro diario" class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <button type="button" (click)="cambiarPagina(-1)" [disabled]="pagina()?.first || cargando()"
            class="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
            Anterior
          </button>
          <p class="text-center text-xs text-slate-600">
            Página {{ (pagina()?.number ?? 0) + 1 }} de {{ pagina()?.totalPages ?? 1 }}
          </p>
          <button type="button" (click)="cambiarPagina(1)" [disabled]="pagina()?.last || cargando()"
            class="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
            Siguiente
          </button>
        </nav>
      }
    </main>
  `
})
export class LibroDiarioComponent implements OnInit {
  private readonly finanzasService = inject(FinanzasService);

  readonly pagina = signal<PageResponse<AsientoContable> | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  private paginaSolicitada = 0;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    this.finanzasService.getLibroDiario(this.paginaSolicitada).subscribe({
      next: response => {
        this.cargando.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message || 'No se pudo cargar el libro diario.');
          return;
        }
        this.pagina.set(response.data);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el libro diario.');
      }
    });
  }

  cambiarPagina(cambio: number): void {
    const siguiente = this.paginaSolicitada + cambio;
    if (siguiente < 0 || siguiente >= (this.pagina()?.totalPages ?? 0)) return;
    this.paginaSolicitada = siguiente;
    this.cargar();
  }

  etiquetaEvento(evento: AsientoContable['tipoEvento']): string {
    switch (evento) {
      case 'CREACION': return 'Registro';
      case 'SALDO_INICIAL': return 'Saldo inicial';
      case 'ACTUALIZACION': return 'Corrección';
      case 'ELIMINACION': return 'Reversión';
    }
  }

  claseEvento(evento: AsientoContable['tipoEvento']): string {
    return evento === 'ELIMINACION'
      ? 'bg-rose-50 text-rose-700'
      : evento === 'ACTUALIZACION'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-emerald-50 text-emerald-700';
  }
}
