import { PeriodoConfig, TipoPeriodo, PERIODO_MENSUAL, resolverPeriodo, desplazarPeriodo, desplazarRangoLibre, validarRangoPeriodo, validarPeriodo, fechaCivilFinanciera } from '../../core/utils/periodo-financiero';
import { FeatureStylesService } from '../../core/services/feature-styles.service';
﻿import { TextoFinancieroPipe } from '../../core/pipes/texto-financiero.pipe';
import { MontoPrivadoDirective } from '../../shared/directives/monto-privado.directive';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
  effect,
  untracked
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PerfilService } from '../../core/services/perfil.service';
import { CategoriaSelectorComponent } from '../../shared/components/categoria-selector/categoria-selector.component';
import { CuentaSelectorComponent } from '../../shared/components/cuenta-selector/cuenta-selector.component';
import { MovimientoMobileCardComponent } from '../../shared/components/movimiento-mobile-card/movimiento-mobile-card.component';
import { FechaPickerComponent } from '../../shared/components/fecha-picker/fecha-picker.component';
import { CategoriaIconoComponent } from '../../shared/components/categoria-icono/categoria-icono.component';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { PrivacyToggleComponent } from '../../shared/components/privacy-toggle/privacy-toggle.component';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { PrivacidadService } from '../../core/services/privacidad.service';
import { MovimientosOfflineService, MovimientoPendiente } from '../../core/services/movimientos-offline.service';
import { nombreCuentaVisible, resumenCuentaSelector } from '../../core/utils/cuenta-financiera';
import {
  Categoria,
  Cuenta,
  DashboardResumen,
  DashboardGastoCategoria,
  FrecuenciaRecurrencia,
  PlantillaRecurrente,
  Presupuesto,
  PresupuestoResumen,
  TipoTransaccion,
  TransaccionPayload
} from '../../core/models/finanzas.models';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
interface CategoriaInicio extends DashboardGastoCategoria {
  icono: string | null | undefined;
  tono: string;
  altura: number;
  presupuesto?: Presupuesto;
}
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ FocusTrapDirective, TextoFinancieroPipe, MontoPrivadoDirective, CommonModule, FormsModule, CategoriaSelectorComponent, CuentaSelectorComponent, MovimientoMobileCardComponent, MontoPipe, FechaPickerComponent, CategoriaIconoComponent, PrivacyToggleComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly styleAssets = inject(FeatureStylesService).load('dashboard', 'home', 'activity');
  readonly nombreCuentaVisible = nombreCuentaVisible;
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly perfilService = inject(PerfilService);
  readonly privacidad = inject(PrivacidadService);
  private readonly categoriaPreferida = inject(CategoriaPreferidaService);
  readonly movimientosOffline = inject(MovimientosOfflineService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private analiticaSub?: Subscription;
  readonly vistaDetallada = signal(false);
  readonly inicioCompacto = signal(false);
  private observadorHero?: IntersectionObserver;
  @ViewChild('homeHero')
  set homeHero(element: ElementRef<HTMLElement> | undefined) {
    this.observadorHero?.disconnect();
    if (!element || typeof IntersectionObserver === 'undefined') return;
    this.observadorHero = new IntersectionObserver(([entry]) => {
      this.inicioCompacto.set(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { rootMargin: '-128px 0px 0px 0px', threshold: 0 });
    this.observadorHero.observe(element.nativeElement);
  }
  readonly gastosCategoria = signal<DashboardGastoCategoria[]>([]);
  readonly graficoLoading = signal(false);
  readonly graficoError = signal(false);
  readonly categoriaContextual = signal<CategoriaInicio | null>(null);
  private temporizadorCategoria?: ReturnType<typeof setTimeout>;
  private inicioPresionCategoria?: { x: number; y: number };
  private presionCategoriaConsumida = false;

  iniciarPresionCategoria(event: PointerEvent, categoria: CategoriaInicio): void {
    if (!event.isPrimary || event.button !== 0) return;
    this.cancelarPresionCategoria();
    this.presionCategoriaConsumida = false;
    this.inicioPresionCategoria = { x: event.clientX, y: event.clientY };
    this.temporizadorCategoria = setTimeout(() => {
      this.presionCategoriaConsumida = true;
      this.categoriaContextual.set(categoria);
    }, 500);
  }
  moverPresionCategoria(event: PointerEvent): void {
    const inicio = this.inicioPresionCategoria;
    if (inicio && Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y) > 8) this.cancelarPresionCategoria();
  }
  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  cancelarPresionCategoria(): void {
    clearTimeout(this.temporizadorCategoria);
    this.inicioPresionCategoria = undefined;
  }
  tocarCategoria(categoria: CategoriaInicio): void {
    if (this.presionCategoriaConsumida) { this.presionCategoriaConsumida = false; return; }
    this.irATransacciones(categoria.categoriaId);
  }
  readonly categoriasInicio = computed<CategoriaInicio[]>(() => {
    const gastos = this.gastosCategoria().filter(item => item.moneda === this.monedaResumen() && item.monto > 0)
      .sort((a, b) => b.monto - a.monto);
    const maximo = Math.max(...gastos.map(item => item.monto), 1);
    const tonos = ['#E7F6A5', '#FFD09C', '#C9E8F8', '#F7CBD5', '#DDD7FF', '#FFE38A'];
    return gastos.map(item => ({
      ...item,
      icono: this.categorias().find(cat => cat.id === item.categoriaId)?.icono,
      tono: tonos[(item.categoriaId ?? 0) % tonos.length],
      altura: this.privacidad.ocultarMontos() ? 0 : Math.max(12, item.monto / maximo * 100),
      presupuesto: this.esMesCalendario() ? this.presupuestosDashboard().find(p => p.categoriaId === item.categoriaId) : undefined
    }));
  });
  readonly resumenCuentaSelector = (cuenta: Cuenta) => resumenCuentaSelector(cuenta, this.privacidad.ocultarMontos());
  private monedaPreferidaAplicada = false;
  private accionRapidaPendiente: TipoTransaccion | null = null;
  private cuentasCargadasParaAccionRapida = false;
  private categoriasCargadasParaAccionRapida = false;
  private elementoConFocoPrevio: HTMLElement | null = null;
  private elementoDialogo: HTMLDivElement | null = null;

  @ViewChild('movementDialog')
  set movementDialog(element: ElementRef<HTMLDivElement> | undefined) {
    if (element) {
      this.elementoDialogo = element.nativeElement;
      const monto = element.nativeElement.querySelector<HTMLElement>('#monto');
      (monto ?? element.nativeElement).focus();
      return;
    }

    this.elementoDialogo = null;
    if (!this.modalAbierto()) {
      const previousFocus = this.elementoConFocoPrevio;
      this.elementoConFocoPrevio = null;
      if (previousFocus?.isConnected) previousFocus.focus();
    }
  }

  readonly fechaActual = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Estados reactivos con Signals
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  resumen = signal<DashboardResumen | null>(null);
  presupuestoResumen = signal<PresupuestoResumen | null>(null);
  presupuestoLoading = signal(false);
  presupuestoError = signal<string | null>(null);
  readonly plantillasRecurrentes = signal<PlantillaRecurrente[]>([]);
  readonly errorRecurrencias = signal<string | null>(null);
  readonly registrandoRecurrenciaId = signal<number | null>(null);
  readonly fechaHoy = signal(fechaCivilFinanciera());
  readonly fechaLimiteRecurrencias = computed(() => this.agregarDias(this.fechaHoy(), 7));
  readonly monedaResumen = signal('MXN');
  readonly periodoSeleccionado = signal(new Date(fechaCivilFinanciera().slice(0, 7) + '-01T12:00:00'));
  readonly periodoEsActual = computed(() => {
    if (this.tipoRango() === 'TODO' || this.fechasRango().hasta >= this.fechaHoy()) return true;
    if (this.tipoRango() !== 'PERSONALIZADO') return false;
    try { return desplazarRangoLibre(this.fechasRango(), 1).hasta > this.fechaHoy(); }
    catch { return true; }
  });
  readonly puedeRetroceder = computed(() => {
    if (this.tipoRango() === 'TODO') return false;
    try {
      if (this.tipoRango() === 'PERSONALIZADO') desplazarRangoLibre(this.fechasRango(), -1);
      else desplazarPeriodo(this.configuracionPeriodo(), this.fechasRango(), -1);
      return true;
    } catch { return false; }
  });
  readonly periodoResumen = computed(() => {
    const fecha = this.periodoSeleccionado();
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(fecha);
  });
  readonly monedasResumen = computed(() =>
    (this.resumen()?.resumenPorMoneda ?? []).map(item => item.moneda).sort()
  );
  readonly resumenMonedaSeleccionada = computed(() =>
    this.resumen()?.resumenPorMoneda.find(item => item.moneda === this.monedaResumen()) ?? null
  );
  readonly presupuestosDashboard = computed(() =>
    (this.presupuestoResumen()?.presupuestos ?? []).filter(p => p.moneda === this.monedaResumen())
  );
  readonly presupuestoMonedaSeleccionada = computed(() => this.presupuestoResumen()?.resumenPorMoneda?.find(p=>p.moneda===this.monedaResumen()) ?? null);
  readonly plantillasPorAtender = computed(() =>
    this.plantillasRecurrentes().filter(plantilla =>
      plantilla.activa
      && plantilla.siguienteFecha >= this.fechaHoy()
      && plantilla.siguienteFecha <= this.fechaLimiteRecurrencias()
    )
  );


  // ─── Time-Range Dropdown ─────────────────────────────────────────────────
  readonly tipoRango = signal<TipoPeriodo | 'PERSONALIZADO'>('MES');
  readonly configuracionPeriodo = signal<PeriodoConfig>({ ...PERIODO_MENSUAL });
  readonly referenciaPeriodo = signal(fechaCivilFinanciera());
  readonly rangoPersonalizado = signal<{ desde: string; hasta: string } | null>(null);
  readonly errorRango = signal('');
  readonly editandoRango = signal(false);
  readonly guardandoPeriodo = signal(false);
  readonly modalRangoAbierto = signal(false);
  readonly opcionesPeriodo: { tipo: TipoPeriodo; nombre: string; detalle: string }[] = [
    { tipo: 'MES', nombre: 'Mes', detalle: 'Inicio del mes a tu medida' },
    { tipo: 'SEMANA', nombre: 'Semana', detalle: '7 días desde el anclaje' },
    { tipo: 'CATORCENA', nombre: 'Cada 14 días', detalle: 'Bloques continuos de dos semanas' },
    { tipo: 'QUINCENA', nombre: 'Quincena', detalle: 'Dos inicios por mes' },
    { tipo: 'ANIO', nombre: 'Año', detalle: 'Enero a diciembre' },
    { tipo: 'TODO', nombre: 'Todo el historial', detalle: 'Todos los movimientos' },
    { tipo: 'HOY', nombre: 'Hoy', detalle: 'Movimientos del día' }
  ];
  borradorPeriodo: PeriodoConfig = { ...PERIODO_MENSUAL };
  guardarComoPredeterminado = false;
  borradorDesde = this.fechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  borradorHasta = fechaCivilFinanciera();
  private preferenciaPeriodoLeida = false;
  private periodoModificado = false;
  private dashboardVersion = 0;
  readonly fechasRango = computed(() => this.tipoRango() === 'PERSONALIZADO' && this.rangoPersonalizado()
    ? this.rangoPersonalizado()!
    : resolverPeriodo({ ...this.configuracionPeriodo(), tipo: this.tipoRango() as TipoPeriodo }, this.referenciaPeriodo()));
  readonly esMesCalendario = computed(() => this.tipoRango() === 'MES' && this.configuracionPeriodo().diaInicio === 1);
  readonly etiquetaRangoSeleccionado = computed(() => {
    if (this.tipoRango() === 'TODO') return 'Todo el historial';
    if (this.tipoRango() === 'HOY' && this.referenciaPeriodo() === this.fechaHoy()) return 'Hoy';
    if (this.esMesCalendario()) return this.periodoResumen();
    const rango = this.fechasRango();
    const formato = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short', year: '2-digit' });
    return `${formato.format(new Date(rango.desde + 'T12:00:00Z'))} – ${formato.format(new Date(rango.hasta + 'T12:00:00Z'))}`;
  });

  toggleModalRango(): void {
    if (this.modalRangoAbierto()) { this.cerrarModalRango(); return; }
    this.borradorPeriodo = { ...this.configuracionPeriodo() };
    this.guardarComoPredeterminado = false;
    if (this.tipoRango() === 'PERSONALIZADO') {
      this.editandoRango.set(true);
      this.borradorDesde = this.fechasRango().desde; this.borradorHasta = this.fechasRango().hasta;
    }
    this.errorRango.set('');
    this.modalRangoAbierto.set(true);
  }
  cerrarModalRango(): void { if (this.guardandoPeriodo()) return; this.modalRangoAbierto.set(false); this.editandoRango.set(false); }
  seleccionarRango(rango: TipoPeriodo | 'PERSONALIZADO'): void {
    if (rango === 'PERSONALIZADO') { this.editandoRango.set(true); this.errorRango.set(''); return; }
    this.aplicarConfiguracion({ ...this.configuracionPeriodo(), tipo: rango });
    this.periodoModificado = true;
    this.cerrarModalRango();
  }
  aplicarPeriodo(): void {
    try {
      const config = validarPeriodo(this.borradorPeriodo);
      resolverPeriodo(config, this.fechaHoy());
      this.errorRango.set('');
      if (!this.guardarComoPredeterminado) {
        this.aplicarConfiguracion(config); this.periodoModificado = true; this.cerrarModalRango(); return;
      }
      if (!this.perfilService.perfil()) { this.errorRango.set('Espera a que cargue tu perfil para guardar la preferencia.'); return; }
      const usuarioId = this.perfilService.perfil()!.id;
      this.guardandoPeriodo.set(true);
      this.perfilService.actualizarPeriodo(config).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: response => {
          this.guardandoPeriodo.set(false);
          if (this.perfilService.perfil()?.id !== usuarioId) return;
          if (!response.success) { this.errorRango.set('No se pudo guardar el periodo. Inténtalo otra vez.'); return; }
          this.periodoModificado = true; this.aplicarConfiguracion(config); this.cerrarModalRango();
          this.toastService.success('Periodo predeterminado guardado.');
        },
        error: () => { this.guardandoPeriodo.set(false); this.errorRango.set('No se pudo guardar. Revisa la conexión e inténtalo otra vez.'); }
      });
    } catch (error) { this.errorRango.set((error as Error).message); }
  }
  private aplicarConfiguracion(config: PeriodoConfig): void {
    const rango = resolverPeriodo(config, this.fechaHoy());
    this.configuracionPeriodo.set({ ...config });
    this.tipoRango.set(config.tipo);
    this.referenciaPeriodo.set(this.fechaHoy());
    this.actualizarMesPresupuesto(rango.desde);
    this.cargarDashboard();
  }
  private actualizarMesPresupuesto(desde: string): void {
    const [anio, mes] = desde.split('-').map(Number);
    // Todo el historial no tiene un mes propio: mostrar presupuesto del mes vigente.
    this.periodoSeleccionado.set(this.tipoRango() === 'TODO'
      ? new Date(Number(this.fechaHoy().slice(0, 4)), Number(this.fechaHoy().slice(5, 7)) - 1, 1)
      : new Date(anio, mes - 1, 1));
  }
  aplicarRangoPersonalizado(): void {
    try {
      const rango = validarRangoPeriodo({ desde: this.borradorDesde, hasta: this.borradorHasta });
      if (rango.hasta > this.fechaHoy()) throw new Error('Elige fechas no posteriores a hoy.');
      this.rangoPersonalizado.set(rango); this.tipoRango.set('PERSONALIZADO');
      this.actualizarMesPresupuesto(rango.desde);
      this.periodoModificado = true; this.errorRango.set(''); this.cerrarModalRango(); this.cargarDashboard();
    } catch (error) { this.errorRango.set((error as Error).message); }
  }

  // ─── Hero-Swipe Gesture Tracking ─────────────────────────────────────────
  private heroTouchStartX = 0;
  private heroTouchStartY = 0;
  private heroSwipeOffset = signal(0);
  readonly heroSwipeActive = signal(false);
  readonly heroSwipeTransform = computed(() => {
    const offset = this.heroSwipeOffset();
    return offset !== 0 ? `translateX(${offset}px)` : '';
  });

  onHeroTouchStart(event: TouchEvent): void {
    const t = event.touches[0];
    this.heroTouchStartX = t.clientX;
    this.heroTouchStartY = t.clientY;
    this.heroSwipeActive.set(true);
  }

  onHeroTouchMove(event: TouchEvent): void {
    if (!this.heroSwipeActive()) return;
    const t = event.touches[0];
    const dx = t.clientX - this.heroTouchStartX;
    const dy = t.clientY - this.heroTouchStartY;
    if (Math.abs(dy) > Math.abs(dx)) { this.heroSwipeActive.set(false); return; }
    event.preventDefault();
    this.heroSwipeOffset.set(Math.max(-120, Math.min(120, dx)));
  }

  onHeroTouchEnd(_event: TouchEvent): void {
    const offset = this.heroSwipeOffset();
    const THRESHOLD = 60;
    if (offset < -THRESHOLD) this.cambiarPeriodo(1);
    else if (offset > THRESHOLD) this.cambiarPeriodo(-1);
    this.heroSwipeOffset.set(0);
    this.heroSwipeActive.set(false);
  }

  readonly ultimosMovimientosLimitados = computed(() =>
    (this.resumen()?.ultimosMovimientos ?? []).filter(m => m.moneda === this.monedaResumen()).slice(0, this.vistaDetallada() ? 8 : 3)
  );

  cuentas = signal<Cuenta[]>([]);
  categorias = signal<Categoria[]>([]);

  // Estados del modal
  modalAbierto = signal<boolean>(false);
  submitting = signal<boolean>(false);
  modalError = signal<string | null>(null);
  dictadoActivo = signal(false);
  dictadoMensaje = signal<string | null>(null);
  falloDeRed = signal(false);
  private payloadParaReintento: TransaccionPayload | null = null;
  catalogoOfflineUsado = signal(false);
  fechaCatalogoOffline = signal('');
  private reconocimientoVoz: SpeechRecognitionLike | null = null;

  // Campos del formulario
  formTipo = signal<TipoTransaccion>('GASTO');
  formMonto: number | null = null;
  formCuentaId: number | null = null;
  formCuentaDestinoId: number | null = null;
  formTasaCambio: number | null = null;
  formCategoriaId: number | null = null;
  formFecha = new Date().toISOString().split('T')[0];
  formNotas = '';
  private formIdempotencyKey = '';
  movimientoRecurrente = false;
  esCompraMsi = false;
  formMsi: number | null = null;
  frecuenciaRecurrencia: FrecuenciaRecurrencia = 'MENSUAL';
  siguienteFechaRecurrencia = '';

  categoriasFiltradas = computed(() => {
    const tipo = this.formTipo();
    return this.categorias().filter(c => c.tipo === tipo);
  });

  esCuentaCredito(): boolean {
    return this.cuentas().find(cuenta => cuenta.id === this.formCuentaId)?.tipo === 'CREDITO';
  }

  monedaCuenta(id: number | null): string {
    return this.cuentas().find(cuenta => cuenta.id === id)?.moneda ?? 'MXN';
  }

  cuentasDestinoDisponibles(): Cuenta[] {
    const cuentaOrigen = this.cuentas().find(cuenta => cuenta.id === this.formCuentaId);
    return this.cuentas().filter(cuenta =>
      cuenta.id !== this.formCuentaId
      && !(cuentaOrigen?.tipo === 'CREDITO' && cuenta.tipo === 'CREDITO')
    );
  }

  cambiarCuentaOrigen(cuentaId: number | null): void {
    this.formCuentaId = cuentaId;
    const destinos = this.cuentasDestinoDisponibles();
    if (!destinos.some(cuenta => cuenta.id === this.formCuentaDestinoId)) {
      this.formCuentaDestinoId = destinos[0]?.id ?? null;
    }
    // Los MSI solo existen en tarjetas de crédito: si la cuenta cambia y ya no lo es,
    // dejarlo marcado solo produciría un error del servidor al guardar.
    if (!this.esCuentaCredito()) this.limpiarMsi();
  }

  /**
   * Repetir y MSI no pueden convivir. El servidor solo crea una plantilla por
   * movimiento, y con los dos datos en el request la de MSI se lleva el resto:
   * la periodicidad elegida se perdería sin avisar.
   */
  alternarRecurrente(valor: boolean): void {
    this.movimientoRecurrente = valor;
    if (valor) {
      this.esCompraMsi = false;
      this.formMsi = null;
      this.actualizarSiguienteFecha();
    }
  }

  alternarMsi(valor: boolean): void {
    if (valor && this.formTipo() !== 'GASTO') return;
    this.esCompraMsi = valor;
    if (valor) {
      this.movimientoRecurrente = false;
      this.siguienteFechaRecurrencia = '';
    }
  }

  limpiarMsi(): void {
    this.esCompraMsi = false;
    this.formMsi = null;
  }

  cambiarMoneda(moneda: string): void {
    this.monedaResumen.set(moneda);
  }

  @ViewChild('budgetScroller') budgetScroller?: ElementRef<HTMLDivElement>;

  constructor() {
    this.destroyRef.onDestroy(() => this.observadorHero?.disconnect());
    this.destroyRef.onDestroy(() => this.cancelarPresionCategoria());
    effect(() => {
      const perfil = this.perfilService.perfil();
      const monedasDisponibles = this.monedasResumen();
      if (this.monedaPreferidaAplicada || !perfil || monedasDisponibles.length === 0) return;
      const preferida = monedasDisponibles.includes(perfil.monedaPredeterminada)
        ? perfil.monedaPredeterminada
        : monedasDisponibles.includes('MXN') ? 'MXN' : monedasDisponibles[0];
      this.monedaResumen.set(preferida);
      this.monedaPreferidaAplicada = true;
    });
    effect(() => {
      const perfil = this.perfilService.perfil();
      if (!perfil || this.preferenciaPeriodoLeida) return;
      this.preferenciaPeriodoLeida = true;
      if (this.periodoModificado || !perfil.periodoPredeterminado) return;
      untracked(() => {
        try { this.aplicarConfiguracion(validarPeriodo(perfil.periodoPredeterminado!)); }
        catch { this.errorRango.set('No se pudo aplicar tu periodo guardado. Elige otro periodo.'); }
      });
    });
    let sincronizacionesObservadas = this.movimientosOffline.totalSincronizados();
    effect(() => {
      const total = this.movimientosOffline.totalSincronizados();
      if (total <= sincronizacionesObservadas) return;
      const nuevos = total - sincronizacionesObservadas;
      sincronizacionesObservadas = total;
      this.cargarDashboard();
      this.cargarCuentasYCategorias();
      this.toastService.success(`${nuevos} movimiento(s) sincronizado(s).`);
    });
  }

  ngOnInit(): void {
    const accion = this.router.parseUrl(this.router.url).queryParams['accion'];
    if (accion === 'nuevo-gasto') this.accionRapidaPendiente = 'GASTO';
    if (accion === 'nuevo-ingreso') this.accionRapidaPendiente = 'INGRESO';
    this.cargarDashboard();
    this.cargarCuentasYCategorias();
  }

  private abrirAccionRapidaCuandoListo(): void {
    if (!this.accionRapidaPendiente
      || !this.cuentasCargadasParaAccionRapida
      || !this.categoriasCargadasParaAccionRapida) return;
    const tipo = this.accionRapidaPendiente;
    this.accionRapidaPendiente = null;
    this.abrirChatRegistro(tipo);
  }

  abrirChatRegistro(tipo?: TipoTransaccion): void {
    window.dispatchEvent(new CustomEvent('kaptal-abrir-registro-rapido', { detail: { tipo } }));
  }

  cargarDashboard(): void {
    const hoy = fechaCivilFinanciera();
    if (this.referenciaPeriodo() === this.fechaHoy()) this.referenciaPeriodo.set(hoy);
    this.fechaHoy.set(hoy);
    this.actualizarMesPresupuesto(this.fechasRango().desde);
    const version = ++this.dashboardVersion;
    this.resumen.set(null);
    this.loading.set(true);
    this.error.set(null);
    this.cargarRecurrencias();
    const periodo = this.periodoSeleccionado();
    const mes = periodo.getMonth() + 1;
    const anio = periodo.getFullYear();
    this.cargarPresupuestos();

    const { desde, hasta } = this.fechasRango();
    this.analiticaSub?.unsubscribe();
    this.gastosCategoria.set([]);
    this.graficoLoading.set(true);
    this.graficoError.set(false);
    this.analiticaSub = this.finanzasService.getDashboardAnalitica(mes, anio, desde, hasta)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: respuesta => {
          if (version !== this.dashboardVersion) return;
          this.gastosCategoria.set(respuesta.success ? respuesta.data?.gastosPorCategoria ?? [] : []);
          this.graficoError.set(!respuesta.success);
          this.graficoLoading.set(false);
        },
        error: () => {
          if (version !== this.dashboardVersion) return;
          this.graficoError.set(true);
          this.graficoLoading.set(false);
        }
      });
    this.finanzasService.getDashboardResumen(mes, anio, desde, hasta).subscribe({
      next: (res) => {
        if (version !== this.dashboardVersion) return;
        if (res.success && res.data) {
          this.resumen.set(res.data);
          if (!res.data.resumenPorMoneda.some(item => item.moneda === this.monedaResumen())) {
            this.monedaResumen.set(
              res.data.resumenPorMoneda.find(item => item.moneda === 'MXN')?.moneda
                ?? res.data.resumenPorMoneda[0]?.moneda
                ?? 'MXN'
            );
          }
        }
        else this.error.set(res.message || 'No se pudo cargar el resumen financiero.');
        this.loading.set(false);
      },
      error: (_err) => {
        if (version !== this.dashboardVersion) return;
        this.error.set('No se pudo cargar tu resumen. Revisa la conexión e inténtalo de nuevo.');
        this.loading.set(false);
      }
    });


  }

  @HostListener('window:kaptal-movimiento-guardado')
  alGuardarDesdeCaptura(): void {
    this.cargarDashboard();
  }

  cargarPresupuestos(): void {
    const version = this.dashboardVersion;
    this.presupuestoResumen.set(null);
    const periodo = this.periodoSeleccionado();
    this.presupuestoLoading.set(true);
    this.presupuestoError.set(null);
    this.finanzasService.getPresupuestos(periodo.getMonth() + 1, periodo.getFullYear()).subscribe({
      next: response => {
        if (version !== this.dashboardVersion) return;
        if (!response.success || !response.data) {
          this.presupuestoError.set(response.message || 'No se pudieron cargar tus presupuestos.');
          this.presupuestoLoading.set(false);
          return;
        }
        this.presupuestoResumen.set(response.data);
        this.presupuestoLoading.set(false);
      },
      error: () => {
        if (version !== this.dashboardVersion) return;
        this.presupuestoError.set('No se pudieron cargar tus presupuestos.');
        this.presupuestoLoading.set(false);
      }
    });
  }

  anchoPresupuesto(presupuesto: Presupuesto): number {
    return Math.max(0, Math.min(100, presupuesto.porcentajeConsumido));
  }

  categoriaProgresoLimitado(presupuesto: Presupuesto): number {
    return Math.min(Math.max(0, presupuesto.montoGastado), presupuesto.montoLimite);
  }

  presupuestoGastadoLimitado(gastado: number, limite: number): number {
    return Math.min(Math.max(0, gastado), Math.max(0, limite));
  }

  porcentajePresupuesto(porcentaje: number): number {
    return Math.max(0, Math.min(100, porcentaje));
  }

  cambiarPeriodo(desplazamiento: number): void {
    if (this.tipoRango() === 'TODO' || (desplazamiento > 0 && this.periodoEsActual())) return;
    try {
      const rango = this.tipoRango() === 'PERSONALIZADO'
        ? desplazarRangoLibre(this.fechasRango(), desplazamiento < 0 ? -1 : 1)
        : desplazarPeriodo(this.configuracionPeriodo(), this.fechasRango(), desplazamiento);
      if (rango.desde > this.fechaHoy() || (this.tipoRango() === 'PERSONALIZADO' && rango.hasta > this.fechaHoy())) return;
      if (this.tipoRango() === 'PERSONALIZADO') this.rangoPersonalizado.set(rango);
      else this.referenciaPeriodo.set(rango.desde);
      this.actualizarMesPresupuesto(rango.desde);
      this.periodoModificado = true; this.cargarDashboard();
    } catch { this.errorRango.set('No hay más periodos dentro de 2000–2100.'); }
  }

  moverCarruselPresupuesto(direccion: number): void {
    const track = this.budgetScroller?.nativeElement;
    if (!track) return;
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direccion * Math.max(track.clientWidth * 0.85, 240), behavior: reducirMovimiento ? 'auto' : 'smooth' });
  }

  cargarRecurrencias(): void {
    this.errorRecurrencias.set(null);
    this.finanzasService.getPlantillasRecurrentes().subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorRecurrencias.set(response.message || 'No se pudieron cargar los próximos movimientos.');
          return;
        }
        this.plantillasRecurrentes.set(response.data);
      },
      error: err => {
        this.errorRecurrencias.set(err.error?.message || 'No se pudieron cargar los próximos movimientos.');
      }
    });
  }

  registrarRecurrente(plantilla: PlantillaRecurrente): void {
    if (this.registrandoRecurrenciaId() !== null) return;
    this.registrandoRecurrenciaId.set(plantilla.id);
    this.finanzasService.registrarMovimientoRecurrente(plantilla.id).subscribe({
      next: response => {
        this.registrandoRecurrenciaId.set(null);
        if (!response.success) {
          this.toastService.error(response.message || 'No se pudo confirmar el movimiento recurrente.');
          return;
        }
        this.toastService.success('Movimiento recurrente confirmado y registrado.');
        this.cargarDashboard();
        this.cargarCuentasYCategorias();
      },
      error: err => {
        this.registrandoRecurrenciaId.set(null);
        this.toastService.error(err.error?.message || 'No se pudo confirmar el movimiento recurrente.');
      }
    });
  }

  irAConfiguracion(): void {
    this.router.navigate(['/configuracion']);
  }

  irARecurrentes(): void {
    this.router.navigate(['/configuracion'], { fragment: 'recurring' });
  }

  irACuentas(): void {
    this.router.navigate(['/cuentas']);
  }

  irAPresupuestos(): void {
    this.router.navigate(['/presupuestos']);
  }

  irACategorias(): void {
    this.router.navigate(['/categorias']);
  }

  registrarPorVoz(): void {
    this.abrirChatRegistro('GASTO');
  }

  private fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private agregarDias(fechaISO: string, dias: number): string {
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    return this.fechaLocal(new Date(anio, mes - 1, dia + dias));
  }

  cargarCuentasYCategorias(): void {
    const usuario = this.authService.currentUser()?.id;
    const vigente = () => this.authService.currentUser()?.id === usuario;
    let cuentasListas=false,categoriasListas=false;
    const persistir=()=>{if(cuentasListas&&categoriasListas)void this.guardarCatalogoOffline();};
    this.finanzasService.getCuentas().subscribe({
      next: (res) => {
        if (!vigente()) return;
        if (res.success && res.data) {
          this.cuentas.set(res.data);
          this.catalogoOfflineUsado.set(false);
          cuentasListas=true;persistir();
          if (res.data.length > 0 && !res.data.some(cuenta => cuenta.id === this.formCuentaId)) {
            this.formCuentaId = res.data[0].id;
          }
          const destinos = this.cuentasDestinoDisponibles();
          if (!destinos.some(cuenta => cuenta.id === this.formCuentaDestinoId)) {
            this.formCuentaDestinoId = destinos[0]?.id ?? null;
          }
        }
        this.cuentasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      },
      error: () => { if (!vigente()) return; void this.restaurarCatalogoOffline('cuentas').finally(() => {
        if (!vigente()) return;
        this.cuentasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      }); }
    });

    this.finanzasService.getCategorias().subscribe({
      next: (res) => {
        if (!vigente()) return;
        if (res.success && res.data) {
          this.categorias.set(res.data);
          this.catalogoOfflineUsado.set(false);
          categoriasListas=true;persistir();
        }
        this.categoriasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      },
      error: () => { if (!vigente()) return; void this.restaurarCatalogoOffline('categorias').finally(() => {
        if (!vigente()) return;
        this.categoriasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      }); }
    });
  }

  private async guardarCatalogoOffline(): Promise<void> {
    const usuarioId = this.authService.currentUser()?.id;
    if (usuarioId == null) return;
    try {
      await this.movimientosOffline.guardarCatalogo(usuarioId, this.cuentas(), this.categorias());
    } catch {
      // La entrada online sigue funcionando aunque el navegador no permita IndexedDB.
    }
  }

  private async restaurarCatalogoOffline(seccion: 'cuentas' | 'categorias'): Promise<void> {
    const usuarioId = this.authService.currentUser()?.id;
    if (usuarioId == null) return;
    try {
      const catalogo = await this.movimientosOffline.leerCatalogo(usuarioId);
      if (!catalogo || this.authService.currentUser()?.id !== usuarioId) return;
      if (seccion === 'cuentas') this.cuentas.set(catalogo.cuentas);
      else this.categorias.set(catalogo.categorias);
      this.catalogoOfflineUsado.set(true);
      this.fechaCatalogoOffline.set(new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium', timeStyle: 'short'
      }).format(new Date(catalogo.actualizadoEn)));
      if (catalogo.cuentas.length > 0 && !catalogo.cuentas.some(cuenta => cuenta.id === this.formCuentaId)) {
        this.formCuentaId = catalogo.cuentas[0].id;
      }
    } catch {
      // El mensaje de almacenamiento local ya explica que el guardado offline no está disponible.
    }
  }

  abrirModal(params: TipoTransaccion | { tipo: TipoTransaccion; categoriaId?: number | null } = 'GASTO'): void {
    const tipo = typeof params === 'string' ? params : params.tipo;
    const catId = typeof params === 'object' ? params.categoriaId : null;

    const activeElement = this.document.activeElement;
    this.elementoConFocoPrevio = activeElement && typeof (activeElement as HTMLElement).focus === 'function'
      ? activeElement as HTMLElement
      : null;
    this.formTipo.set(tipo);
    this.modalError.set(null);
    this.formMonto = null;
    this.formNotas = '';
    this.formIdempotencyKey = '';
    this.dictadoMensaje.set(null);
    this.formFecha = new Date().toISOString().split('T')[0];
    this.movimientoRecurrente = false;
    this.esCompraMsi = false;
    this.formMsi = null;
    this.frecuenciaRecurrencia = 'MENSUAL';
    this.siguienteFechaRecurrencia = '';
    this.formTasaCambio = null;

    const listaCuentas = this.cuentas();
    if (listaCuentas.length > 0) {
      this.formCuentaId = listaCuentas[0].id;
      this.formCuentaDestinoId = this.cuentasDestinoDisponibles()[0]?.id ?? null;
    }

    if (catId !== null && catId !== undefined) {
      this.formCategoriaId = catId;
    } else {
      const cats = this.categoriasFiltradas();
      // Se abre con la categoria de la ultima vez, si sigue existiendo. Solo si no
      // hay memoria, o la memoria apunta a algo que ya no esta, se cae a la primera.
      const preferida = this.categoriaPreferida.preferida(tipo);
      this.formCategoriaId = cats.some(categoria => categoria.id === preferida)
        ? preferida
        : (cats[0]?.id ?? null);
    }

    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.reconocimientoVoz?.stop();
    this.reconocimientoVoz = null;
    this.dictadoActivo.set(false);
    this.modalAbierto.set(false);
    this.modalError.set(null);
  }

  hayConexion(): boolean {
    return this.document.defaultView?.navigator.onLine ?? true;
  }

  etiquetaTipo(tipo: TipoTransaccion): string {
    if (tipo === 'INGRESO') return 'Ingreso';
    if (tipo === 'TRANSFERENCIA') return 'Transferencia';
    return 'Gasto';
  }

  async sincronizarPendientes(): Promise<void> {
    await this.movimientosOffline.sincronizar();
  }

  revisarPendiente(pendiente: MovimientoPendiente): void {
    if (pendiente.estado !== 'REVISAR') {
      void this.sincronizarPendientes();
      return;
    }
    const payload = pendiente.payload;
    this.abrirModal(payload.tipo);
    this.formIdempotencyKey = this.crearIdempotencyKey();
    this.formMonto = payload.monto;
    this.formCuentaId = payload.cuentaId;
    this.formCuentaDestinoId = payload.cuentaDestinoId ?? null;
    this.formCategoriaId = payload.categoriaId ?? null;
    this.formTasaCambio = payload.tasaCambio ?? null;
    this.formFecha = payload.fecha;
    this.formNotas = payload.notas ?? '';
    this.movimientoRecurrente = payload.frecuenciaRecurrencia != null;
    this.frecuenciaRecurrencia = payload.frecuenciaRecurrencia ?? 'MENSUAL';
    this.siguienteFechaRecurrencia = payload.siguienteFechaRecurrencia ?? '';
    this.formMsi = payload.msi ?? null;
    this.esCompraMsi = payload.msi != null;
    this.modalError.set('Revisa Actividad antes de guardar otra solicitud. Esta corrección usará una clave nueva; el pendiente original se conserva. '+(pendiente.error ?? ''));
  }

  async eliminarPendiente(id: string): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      title: 'Eliminar solicitud local',
      message: 'Se elimina solo de este dispositivo. Si el servidor ya la recibió, el movimiento puede estar registrado.',
      confirmText: 'Eliminar solicitud',
    });
    if (!confirmado) return;
    try { await this.movimientosOffline.descartar(id); }
    catch { this.toastService.info('No se pudo eliminar. Espera a que termine la sincronización.'); }
  }

  async activarAvisosSincronizacion(): Promise<void> {
    await this.movimientosOffline.solicitarNotificaciones();
  }

  dictarMovimiento(): void {
    const vista = this.document.defaultView as SpeechRecognitionWindow | null;
    const Reconocimiento = vista?.SpeechRecognition ?? vista?.webkitSpeechRecognition;
    if (!Reconocimiento) {
      this.dictadoMensaje.set('Este navegador no ofrece dictado por voz. Escribe el movimiento en Notas.');
      return;
    }

      this.dictadoMensaje.set('Habla ahora. El reconocimiento depende del navegador y puede requerir conexión. Revisa los datos antes de guardar.');
    const reconocimiento = new Reconocimiento();
    reconocimiento.lang = 'es-MX';
    reconocimiento.continuous = false;
    reconocimiento.interimResults = false;
    reconocimiento.onresult = event => {
      const texto = event.results[0]?.[0]?.transcript?.trim();
      if (!texto) return;
      this.aplicarDictado(texto);
      this.dictadoMensaje.set(`Entendí: “${texto}â€. Revisa el formulario y guarda cuando esté correcto.`);
    };
    reconocimiento.onerror = () => this.dictadoMensaje.set('No pude reconocer la voz. Puedes intentarlo otra vez o escribirlo.');
    reconocimiento.onend = () => this.dictadoActivo.set(false);
    this.reconocimientoVoz = reconocimiento;
    this.dictadoActivo.set(true);
    try {
      reconocimiento.start();
    } catch {
      this.dictadoActivo.set(false);
      this.dictadoMensaje.set('No se pudo iniciar el micrófono. Revisa el permiso del navegador.');
    }
  }

  private aplicarDictado(texto: string): void {
    const textoNormalizado = texto.toLocaleLowerCase('es-MX');
    if (/\b(ingreso|recib[ií]|cobr[eé]|me pagaron)\b/.test(textoNormalizado)) this.cambiarTipo('INGRESO');
    else if (/\b(gasto|gast[eé]|compr[eé]|pagu[eé])\b/.test(textoNormalizado)) this.cambiarTipo('GASTO');

    const importe = texto.match(/(?:\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
    if (importe) this.formMonto = Number(importe[1].replace(',', '.'));
    const descripcion = texto
      .replace(/\b(registra|registrar|anota|anotar|gast[eé]|gasto|compr[eé]|compra|pagu[eé]|pago|recib[ií]|ingreso|cobr[eé]|me pagaron)\b/gi, '')
      .replace(/(?:\$\s*)?\d+(?:[.,]\d{1,2})?/g, '')
      .replace(/\b(en|de|por)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    this.formNotas = descripcion || texto;

    if (/\bayer\b/i.test(texto)) {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      this.formFecha = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
    } else if (/\bhoy\b/i.test(texto)) {
      const hoy = new Date();
      this.formFecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    }
  }

  @HostListener('document:keydown', ['$event'])
  manejarTecladoModal(event: KeyboardEvent): void {
    const dialog = this.elementoDialogo;
    if (!this.modalAbierto() || !dialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrarModal();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'
    )).filter(element =>
      !('disabled' in element && element.disabled)
      && element.tabIndex >= 0
      && !element.closest('[hidden], [aria-hidden="true"]')
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = this.document.activeElement;
    if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  cambiarTipo(tipo: TipoTransaccion): void {
    this.formTipo.set(tipo);
    if (tipo === 'TRANSFERENCIA') this.movimientoRecurrente = false;
    if (tipo !== 'GASTO') this.limpiarMsi();
    // Cambiar de pestaña también cambia de tipo, así que vale la memoria de ese tipo.
    const cats = this.categoriasFiltradas();
    const preferida = this.categoriaPreferida.preferida(tipo);
    this.formCategoriaId = cats.some(categoria => categoria.id === preferida)
      ? preferida
      : (cats[0]?.id ?? null);
  }

  actualizarSiguienteFecha(): void {
    if (!this.movimientoRecurrente || !this.formFecha) return;
    const [anio, mes, dia] = this.formFecha.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    if (this.frecuenciaRecurrencia === 'SEMANAL') {
      fecha.setDate(fecha.getDate() + 7);
    } else if (this.frecuenciaRecurrencia === 'QUINCENAL') {
      fecha.setDate(fecha.getDate() + 14);
    } else if (this.frecuenciaRecurrencia === 'ANUAL') {
      fecha.setFullYear(fecha.getFullYear() + 1);
    } else {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      fecha.setDate(1);
      fecha.setMonth(fecha.getMonth() + 1);
      const ultimoDiaSiguienteMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
      fecha.setDate(dia === ultimoDiaMes ? ultimoDiaSiguienteMes : Math.min(dia, ultimoDiaSiguienteMes));
    }
    this.siguienteFechaRecurrencia = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');
  }

  async guardarMovimiento(): Promise<void> {
    if (!this.formMonto || this.formMonto <= 0) {
      this.modalError.set('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!this.formCuentaId) {
      this.modalError.set('Selecciona una cuenta');
      return;
    }

    if (this.formTipo() !== 'TRANSFERENCIA' && this.formCategoriaId == null) {
      this.modalError.set('Crea una categoría para este tipo de movimiento y selecciónala.');
      return;
    }

    if (this.formTipo() === 'TRANSFERENCIA') {
      if (!this.formCuentaDestinoId) {
        this.modalError.set('Selecciona la cuenta de destino');
        return;
      }
      if (this.formCuentaDestinoId === this.formCuentaId) {
        this.modalError.set('La cuenta origen y destino deben ser distintas');
        return;
      }
      const origen = this.cuentas().find(cuenta => cuenta.id === this.formCuentaId);
      const destino = this.cuentas().find(cuenta => cuenta.id === this.formCuentaDestinoId);
      if (origen?.tipo === 'CREDITO' && destino?.tipo === 'CREDITO') {
        this.modalError.set('No se permiten transferencias entre tarjetas de crédito.');
        return;
      }
      if (this.monedaCuenta(this.formCuentaDestinoId) !== this.monedaCuenta(this.formCuentaId)
          && (!this.formTasaCambio || !Number.isFinite(this.formTasaCambio) || this.formTasaCambio <= 0)) {
        this.modalError.set('Ingresa una tasa de cambio mayor a 0 para transferir entre monedas distintas');
        return;
      }
    }

    if (this.esCompraMsi && (!this.formMsi || this.formMsi < 2)) {
      this.modalError.set('Selecciona los meses sin intereses');
      return;
    }

    const payload: TransaccionPayload = {
      cuentaId: this.formCuentaId,
      cuentaDestinoId: this.formTipo() === 'TRANSFERENCIA' ? this.formCuentaDestinoId : null,
      categoriaId: this.formTipo() !== 'TRANSFERENCIA' ? this.formCategoriaId : null,
      tipo: this.formTipo(),
      monto: this.formMonto,
      tasaCambio: this.formTipo() === 'TRANSFERENCIA'
        && this.monedaCuenta(this.formCuentaDestinoId) !== this.monedaCuenta(this.formCuentaId)
        ? this.formTasaCambio
        : null,
      fecha: this.formFecha,
      notas: this.formNotas.trim() || null,
      frecuenciaRecurrencia: this.movimientoRecurrente ? this.frecuenciaRecurrencia : null,
      siguienteFechaRecurrencia: this.movimientoRecurrente ? this.siguienteFechaRecurrencia : null,
      // Sin esto el servidor guardaba el gasto completo y sin cuotas: el MSI se perdía.
      msi: this.esCompraMsi ? this.formMsi : null
    };

    this.submitting.set(true);
    this.modalError.set(null);
    this.falloDeRed.set(false);

    if (!this.formIdempotencyKey) this.formIdempotencyKey = this.crearIdempotencyKey();
    if (!this.hayConexion()) {
      const usuarioId = this.authService.currentUser()?.id;
      if (usuarioId == null) {
        this.submitting.set(false);
        this.modalError.set('Inicia sesión para guardar movimientos sin conexión.');
        return;
      }
      try {
        await this.movimientosOffline.guardarPendiente(usuarioId, this.formIdempotencyKey, payload);
        if (this.authService.currentUser()?.id !== usuarioId) return;
        this.submitting.set(false);
        this.cerrarModal();
        this.toastService.info('Guardado en este dispositivo. Se sincronizará cuando vuelva la conexión.');
      } catch {
        this.submitting.set(false);
        this.modalError.set('No se pudo guardar en este dispositivo. El formulario sigue abierto; no se perdió lo que escribiste.');
      }
      return;
    }

    const usuarioSolicitud = this.authService.currentUser()?.id;
    const claveSolicitud = this.formIdempotencyKey;
    this.finanzasService.crearTransaccion(payload, claveSolicitud).subscribe({
      next: (res) => {
        if (this.authService.currentUser()?.id !== usuarioSolicitud) return;
        this.submitting.set(false);
        if (!res.success || !res.data) {
          this.modalError.set(res.message || 'El servidor no confirmó el registro. Conserva la solicitud antes de reintentar.');
          return;
        }
        void this.movimientosOffline.descartar(claveSolicitud).catch(() => undefined);
        this.formIdempotencyKey = '';
        this.payloadParaReintento = null;
        this.cerrarModal();
        this.cargarDashboard();
        this.cargarCuentasYCategorias();
        this.toastService.success('Movimiento registrado correctamente.');
      },
      error: (err) => {
        if (this.authService.currentUser()?.id !== usuarioSolicitud) return;
        this.submitting.set(false);
        if (err.status === 0 || err.status >= 500) {
          this.payloadParaReintento = payload;
          this.falloDeRed.set(true);
          this.modalError.set('No hubo respuesta del servidor. Puedes revisar la conexión y reintentar; Kaptal usará la misma clave para evitar duplicarlo si el servidor ya lo recibió.');
          void this.persistirSolicitudIncierta(payload, claveSolicitud, usuarioSolicitud);
          return;
        }
        const msg = err.error?.message || 'Error al guardar la transacción';
        this.modalError.set(msg);
      }
    });
  }

  async guardarPendienteActual(): Promise<void> {
    const usuarioId = this.authService.currentUser()?.id;
    const payload = this.payloadParaReintento;
    if (usuarioId == null || payload == null || !this.formIdempotencyKey) return;
    this.submitting.set(true);
    try {
      await this.movimientosOffline.guardarPendiente(usuarioId, this.formIdempotencyKey, payload);
      if (this.authService.currentUser()?.id !== usuarioId) return;
      this.submitting.set(false);
      this.falloDeRed.set(false);
      this.payloadParaReintento = null;
      this.cerrarModal();
      this.toastService.info('Guardado en este dispositivo. Se sincronizará cuando vuelva la conexión.');
    } catch {
      this.submitting.set(false);
      this.modalError.set('No se pudo guardar en este dispositivo. El formulario sigue abierto.');
    }
  }

  private async persistirSolicitudIncierta(payload: TransaccionPayload, id: string, usuarioId: number | undefined): Promise<void> {
    if (usuarioId == null) return;
    try {
      await this.movimientosOffline.guardarPendiente(usuarioId, id, payload);
      if (this.authService.currentUser()?.id !== usuarioId) return;
      this.falloDeRed.set(false);
      this.payloadParaReintento = null;
      this.cerrarModal();
      this.toastService.info('No llegó confirmación del servidor. Guardé la solicitud con la misma clave; al reintentar no se duplicará.');
      if (this.hayConexion()) void this.movimientosOffline.sincronizar();
    } catch {
      // Se conserva el formulario para que la persona pueda reintentar o copiar los datos.
    }
  }

  private crearIdempotencyKey(): string {
    const cryptoApi = this.document.defaultView?.crypto;
    if (cryptoApi && 'randomUUID' in cryptoApi) return cryptoApi.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, letra => {
      const aleatorio = Math.floor(Math.random() * 16);
      return (letra === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8).toString(16);
    });
  }

  irAReportes(): void {
    const rango = this.fechasRango();
    let anterior: { desde: string; hasta: string } | undefined;
    if (this.tipoRango() !== 'TODO') {
      try {
        anterior = this.tipoRango() === 'PERSONALIZADO'
          ? desplazarRangoLibre(rango, -1) : desplazarPeriodo(this.configuracionPeriodo(), rango, -1);
      } catch { /* El primer periodo admitido no tiene un anterior consultable. */ }
    }
    this.router.navigate(['/reportes'], { queryParams: {
      desde: rango.desde, hasta: rango.hasta,
      ...(anterior ? { desdeAnterior: anterior.desde, hastaAnterior: anterior.hasta } : {}),
      sinComparacion: !anterior ? 'true' : undefined
    } });
  }

  irATransacciones(categoriaId?: number | null): void {
    const { desde: fechaInicio, hasta: fechaFin } = this.fechasRango();
    this.router.navigate(['/transacciones'], { queryParams: { ...(categoriaId == null ? {} : { categoriaId }), fechaInicio, fechaFin } });
  }
  registrarCategoria(categoria: CategoriaInicio): void {
    this.categoriaContextual.set(null);
    this.document.defaultView?.dispatchEvent(new CustomEvent('kaptal-abrir-registro-rapido', { detail: { tipo: 'GASTO', categoriaId: categoria.categoriaId } }));
  }
  verDetalleMovimiento(id: number): void { void this.router.navigate(['/transacciones'],{queryParams:{detalle:id}}); }

  eliminarMovimiento(id: number): void {
    this.confirmDialog.confirm({
      title: 'Eliminar movimiento',
      message: 'Esta acción eliminará el movimiento y recalculará automáticamente los saldos de las cuentas involucradas. ¿Deseas continuar?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.finanzasService.eliminarTransaccion(id).subscribe({
        next: () => {
          this.toastService.success('Movimiento eliminado y saldos actualizados.');
          this.cargarDashboard();
          this.cargarCuentasYCategorias();
        },
        error: err => this.toastService.error(err.error?.message || 'No se pudo eliminar el movimiento.')
      });
    });
  }

  editarMovimiento(id: number): void {
    this.router.navigate(['/transacciones'], { queryParams: { editar: id } });
  }

}
