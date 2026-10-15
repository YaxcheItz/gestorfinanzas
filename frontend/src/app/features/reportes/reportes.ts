import { RangoPeriodo, validarRangoPeriodo } from '../../core/utils/periodo-financiero';
import { of } from 'rxjs';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { FinanzasService } from '../../core/services/finanzas.service';
import { PrivacidadService } from '../../core/services/privacidad.service';
import { DashboardAnalitica, DashboardComparacion, DashboardResumen } from '../../core/models/finanzas.models';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { PrivacyToggleComponent } from '../../shared/components/privacy-toggle/privacy-toggle.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, RouterLink, MontoPipe, PrivacyToggleComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes {
  private readonly route = inject(ActivatedRoute);
  readonly rangoConsulta = signal<RangoPeriodo | null>(null);
  private rangoAnterior?: RangoPeriodo;
  private sinComparacion = false;
  private readonly finanzas = inject(FinanzasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private usuarioId = this.auth.currentUser()?.id ?? null;
  readonly privacidad = inject(PrivacidadService);
  readonly periodo = signal(this.mesActual());
  readonly moneda = signal('MXN');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly resumen = signal<DashboardResumen | null>(null);
  readonly analitica = signal<DashboardAnalitica | null>(null);
  readonly comparacion = signal<DashboardComparacion | null>(null);
  readonly monedas = computed(() => this.resumen()?.resumenPorMoneda.map(item => item.moneda) ?? []);
  readonly seleccionado = computed(() => this.resumen()?.resumenPorMoneda.find(item => item.moneda === this.moneda()));
  readonly anterior = computed(() => this.comparacion()?.porMoneda.find(item => item.moneda === this.moneda()));
  readonly categorias = computed(() => (this.analitica()?.gastosPorCategoria ?? [])
    .filter(item => item.moneda === this.moneda()).sort((a, b) => b.monto - a.monto));
  readonly tendencia = computed(() => (this.analitica()?.ultimosSeisMeses ?? [])
    .filter(item => item.moneda === this.moneda()).sort((a, b) => a.anio - b.anio || a.mes - b.mes));
  readonly maximo = computed(() => Math.max(1, ...this.tendencia().flatMap(item => [item.ingresos, item.gastos])));
  private request?: Subscription;

  constructor() {
    const parametros = this.route.snapshot.queryParamMap;
    try {
      if (parametros.has('desde') || parametros.has('hasta')) {
        this.rangoConsulta.set(validarRangoPeriodo({ desde: parametros.get('desde') ?? '', hasta: parametros.get('hasta') ?? '' }));
        if (parametros.has('desdeAnterior') || parametros.has('hastaAnterior')) {
          this.rangoAnterior = validarRangoPeriodo({ desde: parametros.get('desdeAnterior') ?? '', hasta: parametros.get('hastaAnterior') ?? '' });
          if (this.rangoAnterior.hasta >= this.rangoConsulta()!.desde) throw new Error('Los periodos no pueden solaparse.');
        }
        this.sinComparacion = parametros.get('sinComparacion') === 'true';
        this.periodo.set(this.rangoConsulta()!.desde.slice(0, 7));
      }
      this.cargar();
    } catch { this.error.set('El rango del informe no es válido. Elige un mes para continuar.'); }
    effect(() => {
      const usuarioId = this.auth.currentUser()?.id ?? null;
      if (usuarioId === this.usuarioId) return;
      this.usuarioId = usuarioId;
      this.request?.unsubscribe();
      this.resumen.set(null);
      this.analitica.set(null);
      this.comparacion.set(null);
      this.error.set('');
      this.loading.set(false);
      if (usuarioId !== null) untracked(() => this.cargar());
    });
  }

  private mesActual(): string {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  }

  cambiarPeriodo(value: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    this.rangoConsulta.set(null); this.rangoAnterior = undefined; this.sinComparacion = false;
    this.periodo.set(value);
    this.cargar();
  }

  cargar(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.resumen.set(null);
    this.analitica.set(null);
    this.comparacion.set(null);
    const [anio, mes] = this.periodo().split('-').map(Number);
    const rango = this.rangoConsulta(), previo = this.rangoAnterior;
    this.request = forkJoin({
      resumen: this.finanzas.getDashboardResumen(mes, anio, rango?.desde, rango?.hasta),
      analitica: this.finanzas.getDashboardAnalitica(mes, anio, rango?.desde, rango?.hasta),
      comparacion: this.sinComparacion
        ? of({ success: true, data: { mes, anio, mesAnterior: mes, anioAnterior: anio, porMoneda: [] } })
        : this.finanzas.getDashboardComparacion(mes, anio, rango?.desde, rango?.hasta, previo?.desde, previo?.hasta)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.resumen.success || !response.analitica.success || !response.comparacion.success
          || !response.resumen.data || !response.analitica.data || !response.comparacion.data) {
          this.error.set('No pudimos cargar los reportes. Intenta de nuevo.');
          return;
        }
        this.resumen.set(response.resumen.data);
        this.analitica.set(response.analitica.data);
        this.comparacion.set(response.comparacion.data);
        if (!this.monedas().includes(this.moneda())) this.moneda.set(this.monedas()[0] ?? 'MXN');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No pudimos conectar. Los reportes necesitan conexión para mostrar datos actuales.');
      }
    });
  }

  ancho(valor: number, total: number): number {
    return this.privacidad.ocultarMontos() || total <= 0 ? 0 : Math.max(0, Math.min(100, valor / total * 100));
  }

  etiquetaMes(mes: number, anio: number): string {
    return new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(new Date(anio, mes - 1, 1));
  }
}
