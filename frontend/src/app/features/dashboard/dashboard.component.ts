import { TextoFinancieroPipe } from '../../core/pipes/texto-financiero.pipe';
import { MontoPrivadoDirective } from '../../shared/directives/monto-privado.directive';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { PrivacidadService } from '../../core/services/privacidad.service';
import { MovimientosOfflineService, MovimientoPendiente } from '../../core/services/movimientos-offline.service';
import { nombreCuentaVisible, resumenCuentaSelector } from '../../core/utils/cuenta-financiera';
import {
  Categoria,
  Cuenta,
  DashboardAnalitica,
  DashboardGastoCategoria,
  DashboardResumen,
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
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TextoFinancieroPipe, MontoPrivadoDirective, CommonModule, FormsModule, CategoriaSelectorComponent, CuentaSelectorComponent, MovimientoMobileCardComponent, MontoPipe, FechaPickerComponent, CategoriaIconoComponent, PrivacyToggleComponent],
  template: `
    <div class="dashboard-screen">
      <header class="dashboard-screen__header">
        <div>
          <p class="dashboard-screen__eyebrow">{{ fechaActual }}</p>
          <div class="dashboard-screen__title-row">
            <h1 class="sr-only">Resumen financiero</h1>
            <button type="button" class="utility-button" (click)="cambiarPeriodo(-1)" aria-label="Mes anterior">‹</button>
            <button
              type="button"
              class="time-dropdown-btn"
              (click)="toggleModalRango()"
              aria-haspopup="dialog"
              [attr.aria-expanded]="modalRangoAbierto()">
              <svg class="time-dropdown-btn__cal" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{{ etiquetaRangoSeleccionado() }}</span>
              <svg class="time-dropdown-btn__chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button type="button" class="utility-button" (click)="cambiarPeriodo(1)" [disabled]="periodoEsActual()" aria-label="Mes siguiente">›</button>
          </div>
        </div>
        <div class="dashboard-utilities"><button type="button" class="dashboard-accounts-link" (click)="irACuentas()">Cuentas</button><app-privacy-toggle/><button type="button" class="utility-button" (click)="irAConfiguracion()" aria-label="Abrir ajustes" title="Configuración"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="navigation-icons.svg#settings"/></svg></button><button type="button" class="dashboard-screen__icon-button" (click)="cargarDashboard()" aria-label="Actualizar resumen" title="Actualizar">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg>
        </button></div>
      </header>

      <!-- Modal de Selección de Rango de Tiempo (Time Dropdown Modal) -->
      @if (modalRangoAbierto()) {
        <div class="time-dropdown-backdrop" (click)="cerrarModalRango()">
          <div class="time-dropdown-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Seleccionar rango de tiempo">
            <header class="time-dropdown-modal__head">
              <h3>Rango de Tiempo</h3>
              <button type="button" (click)="cerrarModalRango()" aria-label="Cerrar modal">×</button>
            </header>
            <div class="time-dropdown-modal__options">
              <button type="button" class="time-option-card" [class.is-active]="tipoRango() === 'MES'" (click)="seleccionarRango('MES')">
                <div class="time-option-card__info">
                  <strong>Mes Actual</strong>
                  <small>{{ periodoResumen() }}</small>
                </div>
                @if (tipoRango() === 'MES') { <span class="time-option-check" aria-hidden="true">✓</span> }
              </button>
              <button type="button" class="time-option-card" [class.is-active]="tipoRango() === 'SEMANA'" (click)="seleccionarRango('SEMANA')">
                <div class="time-option-card__info">
                  <strong>Semana</strong>
                  <small>Últimos 7 días</small>
                </div>
                @if (tipoRango() === 'SEMANA') { <span class="time-option-check" aria-hidden="true">✓</span> }
              </button>
              <button type="button" class="time-option-card" [class.is-active]="tipoRango() === 'HOY'" (click)="seleccionarRango('HOY')">
                <div class="time-option-card__info">
                  <strong>Hoy</strong>
                  <small>Movimientos de la fecha</small>
                </div>
                @if (tipoRango() === 'HOY') { <span class="time-option-check" aria-hidden="true">✓</span> }
              </button>
              <button type="button" class="time-option-card" [class.is-active]="tipoRango() === 'PERSONALIZADO'" (click)="seleccionarRango('PERSONALIZADO')">
                <div class="time-option-card__info">
                  <strong>Personalizado</strong>
                  <small>Elegir fechas de inicio y fin</small>
                </div>
                @if (tipoRango() === 'PERSONALIZADO') { <span class="time-option-check" aria-hidden="true">✓</span> }
              </button>
            </div>
            @if (editandoRango()) {
              <div class="time-dropdown-modal__nav">
                <form (ngSubmit)="aplicarRangoPersonalizado()" class="space-y-3">
                  <label class="block">Desde<input type="date" name="desde" required min="2000-01-01" [max]="fechaHoy()" [(ngModel)]="borradorDesde" class="block w-full rounded-lg border p-2" /></label>
                  <label class="block">Hasta<input type="date" name="hasta" required [min]="borradorDesde || '2000-01-01'" [max]="fechaHoy()" [(ngModel)]="borradorHasta" class="block w-full rounded-lg border p-2" /></label>
                  @if (errorRango()) { <p role="alert">{{ errorRango() }}</p> }
                  <button type="submit" class="min-h-11 rounded-lg bg-emerald-700 px-4 text-white">Aplicar fechas</button>
                </form>
              </div>
            }
          </div>
        </div>
      }

      @if (movimientosOffline.pendientes().length > 0) {
        <section class="dashboard-screen__notice dashboard-screen__notice--offline" aria-labelledby="offline-pendientes-title">
          <div><strong id="offline-pendientes-title">{{ movimientosOffline.pendientes().length }} movimientos sin sincronizar</strong><p>Guardados en este dispositivo.</p></div>
          <button type="button" (click)="sincronizarPendientes()" [disabled]="movimientosOffline.sincronizando() || !hayConexion()">{{ movimientosOffline.sincronizando() ? 'Sincronizando…' : 'Sincronizar' }}</button>
          <details><summary>Revisar</summary><ul>@for (pendiente of movimientosOffline.pendientes(); track pendiente.id) {<li><span>{{ etiquetaTipo(pendiente.payload.tipo) }} · {{ (pendiente.payload.notas || 'Sin nota') | textoFinanciero }} · {{ pendiente.payload.fecha }} @if (pendiente.error) {<span class="dashboard-screen__error">{{ pendiente.error }}</span>}</span><span><button type="button" (click)="revisarPendiente(pendiente)">Editar</button> <button type="button" (click)="eliminarPendiente(pendiente.id)">Eliminar</button></span></li>}</ul></details>
        </section>
      }
      @if (!hayConexion() && movimientosOffline.errorAlmacenamiento()) {
        <p class="dashboard-screen__notice dashboard-screen__notice--error" role="alert">{{ movimientosOffline.errorAlmacenamiento() }} El registro sin conexi&oacute;n necesita almacenamiento local.</p>
      }
      @if (catalogoOfflineUsado()) {
        <p class="dashboard-screen__notice dashboard-screen__notice--info" role="status">Usando cuentas y categor&iacute;as guardadas el {{ fechaCatalogoOffline() }}. Los saldos podr&iacute;an estar desactualizados.</p>
      }
      @if (error()) {
        <p class="dashboard-screen__notice dashboard-screen__notice--error" role="alert">{{ error() }} <button type="button" (click)="cargarDashboard()">Reintentar</button></p>
      }

      <!-- 2. Gestos sobre el Balance (Swipeable Hero Card) -->
      <section
        class="dashboard-screen__monthly dashboard-screen__monthly--swipeable"
        (touchstart)="onHeroTouchStart($event)"
        (touchmove)="onHeroTouchMove($event)"
        (touchend)="onHeroTouchEnd($event)"
        [style.transform]="heroSwipeTransform()"
        aria-labelledby="dashboard-balance-title">
        @if (resumenMonedaSeleccionada(); as moneda) {
          <div class="dashboard-screen__balance-head">
            <span id="dashboard-balance-title">Balance Total</span>

          </div>

          <div class="dashboard-screen__balance-value" aria-live="polite">
            @if (loading()) {
              <div class="dashboard-screen__amount-skeleton" role="status">Cargando balance</div>
            } @else {
              <p class="dashboard-screen__amount">{{ moneda.balanceTotal | monto:moneda.moneda:'symbol':'1.2-2' }}</p>
            }
          </div>

          <div class="dashboard-screen__monthly-stats dashboard-screen__monthly-stats--flow">
            <div class="dashboard-screen__flow-block">
              <div class="dashboard-screen__flow-label">
                <svg aria-hidden="true" viewBox="0 0 24 24" class="is-income"><path d="M12 19V5m0 0-5 5m5-5 5 5"/></svg>
                <span>Ingresos</span>
              </div>
              <strong>{{ moneda.ingresosMes | monto:moneda.moneda:'symbol':'1.2-2' }}</strong>
            </div>
            <div class="dashboard-screen__flow-divider" aria-hidden="true"></div>
            <div class="dashboard-screen__flow-block">
              <div class="dashboard-screen__flow-label">
                <svg aria-hidden="true" viewBox="0 0 24 24" class="is-expense"><path d="M12 5v14m0 0 5-5m-5 5-5-5"/></svg>
                <span>Gastos</span>
              </div>
              <strong>{{ moneda.gastosMes | monto:moneda.moneda:'symbol':'1.2-2' }}</strong>
            </div>
          </div>

          <div class="dashboard-screen__balance-bottom">
            <small>{{ moneda.totalCuentas }} {{ moneda.totalCuentas === 1 ? 'cuenta' : 'cuentas' }}</small>
            <label class="dashboard-screen__currency"><span class="sr-only">Moneda</span><select [ngModel]="monedaResumen()" (ngModelChange)="cambiarMoneda($event)" aria-label="Moneda del balance">@for (codigo of monedasResumen(); track codigo) {<option [value]="codigo">{{ codigo }}</option>}</select></label>
          </div>
          <div class="hero-swipe-indicator" aria-hidden="true">
            <span class="hero-swipe-dot"></span>
            <span class="hero-swipe-dot is-active"></span>
            <span class="hero-swipe-dot"></span>
          </div>
        } @else if (loading()) {
          <p class="dashboard-screen__loading" role="status">Cargando balance…</p>
        } @else {
          <div class="dashboard-screen__empty"><h2>Empieza con una cuenta</h2><p>Agrega efectivo, banco o tarjeta para ver aqu&iacute; tus gastos e ingresos.</p><button type="button" (click)="irACuentas()">Agregar cuenta</button></div>
        }
      </section>

      <section class="dashboard-screen__section dashboard-screen__budgets" aria-labelledby="dashboard-budgets-title">
        <div class="dashboard-screen__section-heading">
          <div class="dashboard-screen__title-with-icon"><span class="dashboard-screen__section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h17M8 16v-5m5 5V7m5 9V9"/></svg></span><div><p class="dashboard-screen__eyebrow">Límites por categoría</p><h2 id="dashboard-budgets-title">Presupuestos</h2></div></div>
          <div class="dashboard-screen__carousel-controls">
            @if (presupuestosDashboard().length > 1) {
              <button type="button" (click)="moverCarruselPresupuesto(-1)" aria-label="Presupuesto anterior"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
              <button type="button" (click)="moverCarruselPresupuesto(1)" aria-label="Siguiente presupuesto"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
            }
            <button type="button" class="dashboard-screen__text-link" (click)="irAPresupuestos()">Ver todos</button>
          </div>
        </div>
        @if (presupuestoLoading()) {<p class="dashboard-screen__muted" role="status">Cargando presupuestos…</p>}
        @else if (presupuestoError()) {<p class="dashboard-screen__muted" role="alert">{{ presupuestoError() }} <button type="button" class="dashboard-screen__text-link" (click)="cargarPresupuestos()">Reintentar</button></p>}
        @else if (presupuestosDashboard().length === 0) {
          <button type="button" class="dashboard-screen__budget-empty" (click)="irAPresupuestos()"><span>Define un límite para saber cuánto puedes gastar.</span><strong>Crear presupuesto <span aria-hidden="true">→</span></strong></button>
        } @else {
          <div #budgetScroller class="dashboard-screen__budget-carousel" aria-label="Presupuestos del mes" tabindex="0">
            @for (presupuesto of presupuestosDashboard(); track presupuesto.id) {
              <article class="dashboard-screen__budget-card">
                <div class="budget-pillar" role="progressbar"
                  [attr.aria-label]="'Presupuesto de ' + presupuesto.categoriaNombre"
                  aria-valuemin="0" [attr.aria-valuemax]="presupuesto.montoLimite"
                  [attr.aria-valuenow]="presupuestoGastadoLimitado(presupuesto.montoGastado, presupuesto.montoLimite)"
                  [style.--budget-fill]="porcentajePresupuesto(presupuesto.porcentajeConsumido) + '%'"
                  [style.--budget-tone]="presupuesto.categoriaColor || '#b9c3a6'">
                  <span class="budget-pillar__fill" aria-hidden="true"></span>
                  <div class="budget-pillar__content">
                    <app-categoria-icono [icono]="presupuesto.categoriaIcono" />
                    <strong>{{ presupuesto.montoGastado | monto:presupuesto.moneda:'symbol':'1.0-2' }}</strong>
                    <small>{{ presupuesto.porcentajeConsumido | number:'1.0-0' }}%</small>
                  </div>
                </div>
                <div class="budget-pillar__label">
                  <strong>{{ presupuesto.categoriaNombre }}</strong>
                  <small>de {{ presupuesto.montoLimite | monto:presupuesto.moneda:'symbol':'1.0-2' }}</small>
                  <small [class.is-over]="presupuesto.estado === 'EXCEDIDO'">{{ presupuesto.estado === 'EXCEDIDO' ? 'Excedido' : presupuesto.estado === 'ALERTA' ? 'Cerca del límite' : 'En control' }}</small>
                </div>
              </article>
            }
          </div>
          @if (presupuestosDashboard().length > 1) {<p class="dashboard-screen__swipe-hint">Desliza para ver tus otros presupuestos</p>}
        }
      </section>

      <section class="dashboard-screen__actions" aria-label="Registrar movimiento">
        <button type="button" class="dashboard-screen__action--chat" (click)="abrirChatRegistro()">
          <span class="dashboard-screen__chat-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>
          <span class="dashboard-screen__chat-copy"><strong>Registrar un movimiento</strong><small>Escribe o dicta el movimiento; tambi&eacute;n puedes pedir reportes.</small></span>
          <svg class="dashboard-screen__chat-arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </button>
      </section>

      @if (plantillasPorAtender().length > 0) {
        <section class="dashboard-screen__section dashboard-screen__upcoming" aria-labelledby="dashboard-upcoming-title">
          <div class="dashboard-screen__section-heading"><div class="dashboard-screen__title-with-icon"><span class="dashboard-screen__section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m-2 3h5"/></svg></span><div><p class="dashboard-screen__eyebrow">Pr&oacute;ximos 7 d&iacute;as</p><h2 id="dashboard-upcoming-title">Pagos programados</h2></div></div><button type="button" class="dashboard-screen__text-link" (click)="irARecurrentes()">Ver todos</button></div>
          @for (plantilla of plantillasPorAtender().slice(0, 3); track plantilla.id) {
            <article class="dashboard-screen__recurring"><div class="dashboard-screen__recurring-copy"><strong>{{ plantilla.categoriaNombre || (plantilla.tipo === 'INGRESO' ? 'Ingreso recurrente' : 'Gasto recurrente') }}</strong><span>{{ plantilla.siguienteFecha <= fechaHoy() ? 'Pendiente de confirmar' : plantilla.siguienteFecha }} · {{ nombreCuentaVisible(plantilla.cuentaNombre) }}</span></div><strong class="dashboard-screen__recurring-amount">{{ plantilla.monto | monto:plantilla.moneda:'symbol':'1.2-2' }}</strong>@if (plantilla.siguienteFecha <= fechaHoy()) {<button type="button" class="dashboard-screen__confirm" (click)="registrarRecurrente(plantilla)" [disabled]="registrandoRecurrenciaId() === plantilla.id">{{ registrandoRecurrenciaId() === plantilla.id ? 'Guardando…' : 'Confirmar' }}</button>}</article>
          }
          <p class="dashboard-screen__footnote">Kaptal te recuerda; no registra cargos autom&aacute;ticamente.</p>
        </section>
      }

      <!-- 4. Lista de Actividad Reciente con botón Ver Todo -->
      <section class="dashboard-screen__section dashboard-screen__activity dashboard-screen__recent" aria-labelledby="dashboard-recent-title">
        <div class="dashboard-screen__section-heading">
          <div>
            <p class="dashboard-screen__eyebrow">Actividad</p>
            <h2 id="dashboard-recent-title">Movimientos recientes</h2>
          </div>
          <button type="button" class="dashboard-screen__text-link" (click)="irATransacciones()">
            Historial completo <span aria-hidden="true">→</span>
          </button>
        </div>
        @if (loading()) {
          <p class="dashboard-screen__muted" role="status">Cargando movimientos…</p>
        } @else if ((ultimosMovimientosLimitados().length === 0)) {
          <div class="dashboard-screen__inline-empty">
            <p>Tu primer gasto o ingreso aparecer&aacute; aqu&iacute;.</p>
            <button type="button" (click)="abrirChatRegistro()">Registrar</button>
          </div>
        } @else {
          <div class="dashboard-screen__recent-list">
            @for (movimiento of ultimosMovimientosLimitados(); track movimiento.id) {
              <app-movimiento-mobile-card [movimiento]="movimiento" (editar)="editarMovimiento($event.id)" (eliminar)="eliminarMovimiento($event)" />
            }
          </div>
          <div class="dashboard-screen__view-all-wrap">
            <button type="button" class="dashboard-screen__view-all-btn" (click)="irATransacciones()">
              Ver Todo el Historial <span aria-hidden="true">→</span>
            </button>
          </div>
        }
      </section>

      <!-- 3. Gráfico de Resumen (Donut Chart Widget MonAi) -->
      @if (resumenMonedaSeleccionada()) {
        <section class="dashboard-screen__section dashboard-screen__donut-section" aria-labelledby="donut-chart-title">
          <div class="dashboard-screen__section-heading">
            <div class="dashboard-screen__title-with-icon">
              <span class="dashboard-screen__section-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              </span>
              <div>
                <p class="dashboard-screen__eyebrow">Distribución de gastos</p>
                <h2 id="donut-chart-title">Categorías Principales</h2>
              </div>
            </div>
            @if (categoriaDonutSeleccionada()) {
              <button type="button" class="dashboard-screen__text-link" (click)="resetearDonut()">Ver total</button>
            }
          </div>

          @if (donutCategorias().length === 0) {
            <div class="dashboard-screen__inline-empty">
              <p>No hay gastos registrados en este periodo para graficar.</p>
              <button type="button" (click)="abrirChatRegistro()">Registrar gasto</button>
            </div>
          } @else {
            <div class="donut-widget">
              <!-- Gráfico circular Donut SVG -->
              <div class="donut-widget__chart-wrap">
                <svg class="donut-widget__svg" viewBox="0 0 160 160" width="160" height="160">
                  <circle cx="80" cy="80" r="64" class="donut-widget__track" />
                  @for (item of donutCategorias(); track item.id) {
                    <circle
                      cx="80"
                      cy="80"
                      r="64"
                      class="donut-widget__segment"
                      [class.is-active]="categoriaDonutSeleccionada()?.id === item.id"
                      [attr.stroke]="item.color"
                      [attr.stroke-dasharray]="item.strokeDasharray"
                      [attr.stroke-dashoffset]="item.strokeDashoffset"
                      (click)="seleccionarCategoriaDonut(item)"
                      (keydown.enter)="seleccionarCategoriaDonut(item)"
                      (keydown.space)="$event.preventDefault(); seleccionarCategoriaDonut(item)"
                      tabindex="0"
                      role="button"
                      [attr.aria-label]="item.nombre + ': ' + item.porcentaje + '%'"
                    />
                  }
                </svg>

                <!-- Centro interactivo Donut Hole -->
                 <div class="donut-widget__center" role="button" tabindex="0" aria-label="Mostrar total de gastos" (click)="resetearDonut()" (keydown.enter)="resetearDonut()" (keydown.space)="$event.preventDefault(); resetearDonut()">
                  @if (categoriaDonutSeleccionada(); as sel) {
                    <span class="donut-widget__center-tag" [style.color]="sel.color">{{ sel.nombre }}</span>
                    <strong class="donut-widget__center-val">{{ sel.monto | monto:monedaResumen():'symbol':'1.0-2' }}</strong>
                    <small class="donut-widget__center-sub">{{ sel.porcentaje }}% del total</small>
                  } @else {
                    <span class="donut-widget__center-tag">Total Gastos</span>
                    <strong class="donut-widget__center-val">{{ totalGastosPeriodo() | monto:monedaResumen():'symbol':'1.0-2' }}</strong>
                    <small class="donut-widget__center-sub">{{ donutCategorias().length }} categorías</small>
                  }
                </div>
              </div>

              <!-- Leyenda interactiva de categorías -->
              <div class="donut-widget__legend">
                @for (item of donutCategorias(); track item.id) {
                  <button
                    type="button"
                    class="donut-legend-item"
                    [class.is-selected]="categoriaDonutSeleccionada()?.id === item.id"
                    (click)="seleccionarCategoriaDonut(item)">
                    <span class="donut-legend-item__color" [style.background-color]="item.color"></span>
                    <div class="donut-legend-item__info">
                      <span class="donut-legend-item__name">{{ item.nombre }}</span>
                      <strong class="donut-legend-item__val">{{ item.monto | monto:monedaResumen():'symbol':'1.0-2' }}</strong>
                    </div>
                    <span class="donut-legend-item__percent">{{ item.porcentaje }}%</span>
                  </button>
                }
              </div>
            </div>
          }
        </section>
      }


    </div>

    <!-- Modal Interactivo 'Nuevo Movimiento' -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-900/60 px-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xs sm:items-center sm:p-4">
        <div #movementDialog tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="dashboard-movement-title" class="dashboard-motion-scope dashboard-movement-dialog flex h-full max-h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:h-[min(90dvh,48rem)] sm:max-h-[min(90dvh,48rem)] sm:max-w-lg sm:rounded-3xl">

          <!-- Encabezado del Modal con Selector de Tipo -->
          <div class="shrink-0 border-b border-slate-100 p-4 sm:p-6">
            <div class="flex items-center justify-between gap-3 pb-4">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kaptal</p>
                <h2 id="dashboard-movement-title" class="text-base font-bold text-slate-900 sm:text-lg">Registrar Movimiento</h2>
              </div>
              <button
                type="button"
                (click)="cerrarModal()"
                aria-label="Cerrar formulario de movimiento"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Selector de Tipo de Transacción: Segmented Control con color semántico -->
            <div role="group" aria-label="Tipo de movimiento" class="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 text-[11px] font-semibold sm:text-xs">
              <button
                type="button"
                (click)="cambiarTipo('GASTO')"
                [attr.aria-pressed]="formTipo() === 'GASTO'"
                [class]="formTipo() === 'GASTO'
                  ? 'bg-white text-rose-600 shadow-sm ring-1 ring-rose-100'
                  : 'text-slate-500 hover:text-slate-700'"
                class="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer sm:min-h-11">
                <span aria-hidden="true" class="text-base leading-none">↓</span> Gasto
              </button>
              <button
                type="button"
                (click)="cambiarTipo('INGRESO')"
                [attr.aria-pressed]="formTipo() === 'INGRESO'"
                [class]="formTipo() === 'INGRESO'
                  ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100'
                  : 'text-slate-500 hover:text-slate-700'"
                class="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer sm:min-h-11">
                <span aria-hidden="true" class="text-base leading-none">↑</span> Ingreso
              </button>
              <button
                type="button"
                (click)="cambiarTipo('TRANSFERENCIA')"
                [attr.aria-pressed]="formTipo() === 'TRANSFERENCIA'"
                [class]="formTipo() === 'TRANSFERENCIA'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-500 hover:text-slate-700'"
                class="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer sm:min-h-11">
                <span aria-hidden="true" class="text-base leading-none">⇄</span> Transf.<span class="sr-only">Transferencia</span>
              </button>
            </div>
          </div>

          <!-- Formulario estructurado con secciones visuales -->
          <form (ngSubmit)="guardarMovimiento()" class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-8">

            <!-- Alertas -->
            @if (modalError()) {
              <div role="alert" class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div class="flex-1">
                  {{ modalError() }}
                  @if (falloDeRed()) {
                    <button type="button" (click)="guardarPendienteActual()" [disabled]="submitting()"
                      class="mt-2 block min-h-10 rounded-lg border border-rose-300 bg-white px-3 py-2 font-semibold text-rose-800">
                      Guardar pendiente en este dispositivo
                    </button>
                  }
                </div>
              </div>
            }
            @if (!hayConexion() && cuentas().length === 0) {
              <p class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="status">
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Aún no hay una lista local de cuentas. Conéctate y abre Kaptal una vez para habilitar el registro sin conexión.
              </p>
            }

            <!-- SECCIÓN: Monto -->
            <div>
              <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">¿Cuánto?</p>
              <div class="rounded-2xl border-2 bg-white px-4 py-3 shadow-sm transition-colors"
                   [class]="formTipo() === 'GASTO' ? 'border-rose-100' : formTipo() === 'INGRESO' ? 'border-emerald-100' : 'border-blue-100'">
                <div class="relative flex items-center justify-center">
                  <span class="absolute left-0 text-xl font-bold text-slate-400">
                    {{ monedaCuenta(formCuentaId) }}
                  </span>
                  <input appMontoPrivado
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    inputmode="decimal"
                    [(ngModel)]="formMonto"
                    name="monto"
                    placeholder="0.00"
                    [attr.aria-label]="'Monto a registrar en ' + monedaCuenta(formCuentaId)"
                    class="w-full bg-transparent py-1 pl-9 pr-2 text-center text-3xl font-black text-slate-900 placeholder:font-bold placeholder:text-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            <!-- SECCIÓN: Cuenta(s) -->
            <div>
              <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formTipo() === 'TRANSFERENCIA' ? '¿Entre qué cuentas?' : '¿En qué cuenta?' }}
              </p>
              @if (formTipo() === 'TRANSFERENCIA') {
                <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div class="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-start gap-1.5">
                    <app-cuenta-selector
                      [cuentas]="cuentas()"
                      [selectedId]="formCuentaId"
                      label="De"
                      idBase="cuentaId"
                      [compacto]="true"
                      (selectedIdChange)="cambiarCuentaOrigen($event)" />

                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"
                         class="mt-5 h-4 w-4 shrink-0 justify-self-center text-slate-400 dark:text-slate-500">
                      <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h9.19L10.72 7.03a.75.75 0 111.06-1.06l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.22-2.22H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
                    </svg>

                    <app-cuenta-selector
                      [cuentas]="cuentasDestinoDisponibles()"
                      [selectedId]="formCuentaDestinoId"
                      label="Para"
                      idBase="cuentaDestinoId"
                      [compacto]="true"
                      [alinearPanelDerecha]="true"
                      (selectedIdChange)="formCuentaDestinoId = $event" />
                  </div>

                  @if (cuentasDestinoDisponibles().length === 0) {
                    <p class="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                      No puedes transferir entre dos tarjetas de crédito. Elige una cuenta que no sea de crédito.
                    </p>
                  }
                </div>
              } @else {
                <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <app-cuenta-selector
                    [cuentas]="cuentas()"
                    [selectedId]="formCuentaId"
                    label="Cuenta"
                    [etiquetaVisible]="false"
                    idBase="cuentaId"
                    (selectedIdChange)="cambiarCuentaOrigen($event)" />
                </div>
              }
            </div>

            <!-- SECCIÓN: Categoría (no aplica en Transferencia) -->
            @if (formTipo() !== 'TRANSFERENCIA') {
              <div>
                <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">¿En qué categoría?</p>
                <div class="min-w-0">
                  @defer (on immediate) {
                    <app-categoria-selector
                      [categorias]="categorias()"
                      [tipo]="formTipo()"
                      [selectedId]="formCategoriaId"
                      (selectedIdChange)="formCategoriaId = $event"
                      (categoriasChange)="categorias.set($event)" />
                  } @placeholder {
                    <div class="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"></div>
                  }
                </div>
              </div>
            }

            <!-- SECCIÓN: Fecha y Notas / Tasa de cambio -->
            <div>
              <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">¿Cuándo? · Notas</p>
              <div class="grid grid-cols-2 gap-2">
                <div class="min-w-0">
                  <label for="fecha" class="sr-only">Fecha del movimiento</label>
                  <app-fecha-picker id="fecha" label="Fecha del movimiento" [value]="formFecha" (valueChange)="formFecha = $event; actualizarSiguienteFecha()" />
                </div>

                @if (formTipo() === 'TRANSFERENCIA') {
                  @if (monedaCuenta(formCuentaId) !== monedaCuenta(formCuentaDestinoId)) {
                    <div class="min-w-0">
                      <label for="tasaCambio" class="sr-only">Tasa de cambio</label>
                      <input appMontoPrivado
                        id="tasaCambio"
                        type="number"
                        name="tasaCambio"
                        min="0.00000001"
                        step="0.00000001"
                        required
                        inputmode="decimal"
                        [(ngModel)]="formTasaCambio"
                        [attr.aria-label]="'Tasa de cambio de ' + monedaCuenta(formCuentaId) + ' a ' + monedaCuenta(formCuentaDestinoId)"
                        class="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        placeholder="Ej. 17.25"
                      />
                      <p class="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        1 {{ monedaCuenta(formCuentaId) }} = ? {{ monedaCuenta(formCuentaDestinoId) }}
                        @if (formMonto && formTasaCambio && formTasaCambio > 0) {
                          · llegan {{ formMonto * formTasaCambio | monto:monedaCuenta(formCuentaDestinoId):'symbol':'1.2-2' }}
                        }
                      </p>
                    </div>
                  }
                } @else {
                  <div class="flex min-w-0 gap-2">
                    <label for="notas" class="sr-only">Notas adicionales (opcional)</label>
                    <input
                      id="notas"
                      type="text"
                      maxlength="500"
                      [(ngModel)]="formNotas"
                      name="notas"
                      placeholder="Notas opcionales…"
                      class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                    <button type="button" (click)="dictarMovimiento()" [disabled]="dictadoActivo()"
                      [attr.aria-pressed]="dictadoActivo()" [attr.aria-label]="dictadoActivo() ? 'Escuchando movimiento' : 'Dictar movimiento por voz'"
                      title="El navegador procesa el dictado. Confirma el resultado antes de guardar."
                      class="min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-800 disabled:text-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {{ dictadoActivo() ? '🎙 …' : '🎙 Voz' }}
                    </button>
                  </div>
                  @if (dictadoMensaje()) {
                    <p class="col-span-2 text-xs text-slate-500" role="status">{{ dictadoMensaje() }}</p>
                  }
                }
              </div>
            </div>

            <!-- Notas para Transferencia -->
            @if (formTipo() === 'TRANSFERENCIA') {
              <div>
                <label for="notas-transferencia" class="sr-only">Notas adicionales (opcional)</label>
                <input
                  id="notas-transferencia"
                  type="text"
                  maxlength="500"
                  [(ngModel)]="formNotas"
                  name="notas"
                  placeholder="Notas opcionales…"
                  class="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            }

            <!-- SECCIÓN: Opciones adicionales (colapsable) -->
            @if (formTipo() !== 'TRANSFERENCIA') {
              <details class="rounded-xl border border-slate-200 px-3 dark:border-slate-700">
                <summary class="flex min-h-11 cursor-pointer select-none list-none items-center justify-between py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span>Opciones adicionales</span>
                  <svg class="h-4 w-4 text-slate-400 transition-transform [[open]_&]:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                </summary>
                <div class="space-y-3 pb-3">
                  <div class="grid grid-cols-2 gap-2">
                    <label
                      class="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-emerald-500"
                      [class]="movimientoRecurrente
                        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'">
                      <input type="checkbox" name="movimientoRecurrente" class="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                             [ngModel]="movimientoRecurrente" (ngModelChange)="alternarRecurrente($event)" />
                      <span class="min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Repetir<span class="sr-only"> este movimiento</span>
                      </span>
                    </label>

                    @if (formTipo() === 'GASTO' && esCuentaCredito()) {
                      <label
                        class="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-emerald-500"
                        [class]="esCompraMsi
                          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'">
                        <input type="checkbox" name="esCompraMsi" class="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                               [ngModel]="esCompraMsi" (ngModelChange)="alternarMsi($event)" />
                        <span class="min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          MSI<span class="sr-only">: compra a meses sin intereses</span>
                        </span>
                      </label>
                    }
                  </div>

                  @if (movimientoRecurrente) {
                    <div class="grid grid-cols-2 gap-2">
                      <label class="min-w-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Frecuencia
                        <select name="frecuenciaRecurrencia" [(ngModel)]="frecuenciaRecurrencia"
                                (ngModelChange)="actualizarSiguienteFecha()"
                                class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                          <option value="SEMANAL">Cada semana</option>
                          <option value="QUINCENAL">Cada dos semanas</option>
                          <option value="MENSUAL">Cada mes</option>
                          <option value="ANUAL">Cada año</option>
                        </select>
                      </label>
                      <label class="min-w-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Siguiente cargo
                        <app-fecha-picker id="siguienteFechaRecurrencia" label="Siguiente cargo" [value]="siguienteFechaRecurrencia" [min]="formFecha" (valueChange)="siguienteFechaRecurrencia = $event" />
                      </label>
                    </div>
                  } @else if (esCompraMsi) {
                    <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Plazo en meses
                      <select name="formMsi" [(ngModel)]="formMsi" required
                              class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                        <option [ngValue]="null" disabled>Selecciona el plazo</option>
                        <option [ngValue]="3">3 meses sin intereses</option>
                        <option [ngValue]="6">6 meses sin intereses</option>
                        <option [ngValue]="9">9 meses sin intereses</option>
                        <option [ngValue]="12">12 meses sin intereses</option>
                        <option [ngValue]="18">18 meses sin intereses</option>
                        <option [ngValue]="24">24 meses sin intereses</option>
                      </select>
                    </label>
                  }
                </div>
              </details>
            }

            <!-- Botones de Acción -->
            <div class="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:flex sm:items-center sm:justify-end sm:space-x-3">
              <button
                type="button"
                (click)="cerrarModal()"
                class="min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer sm:w-auto">
                Cancelar
              </button>

              <button
                type="submit"
                [disabled]="submitting()"
                [class]="formTipo() === 'GASTO'
                  ? 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700 active:bg-rose-800'
                  : formTipo() === 'INGRESO'
                    ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 active:bg-emerald-800'
                    : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800'"
                class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer sm:w-auto">
                @if (submitting()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                } @else {
                  <span>Guardar {{ formTipo() === 'GASTO' ? 'Gasto' : formTipo() === 'INGRESO' ? 'Ingreso' : 'Transferencia' }}</span>
                }
              </button>
            </div>

          </form>

        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  readonly nombreCuentaVisible = nombreCuentaVisible;
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly finanzasService = inject(FinanzasService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly perfilService = inject(PerfilService);
  private readonly privacidad = inject(PrivacidadService);
  private readonly categoriaPreferida = inject(CategoriaPreferidaService);
  readonly movimientosOffline = inject(MovimientosOfflineService);
  private readonly document = inject(DOCUMENT);
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
  readonly fechaHoy = signal(this.fechaLocal(new Date()));
  readonly fechaLimiteRecurrencias = computed(() => this.agregarDias(this.fechaHoy(), 7));
  readonly monedaResumen = signal('MXN');
  readonly periodoSeleccionado = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly periodoEsActual = computed(() => {
    const periodo = this.periodoSeleccionado();
    const ahora = new Date();
    return periodo.getFullYear() === ahora.getFullYear() && periodo.getMonth() === ahora.getMonth();
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
  readonly plantillasPorAtender = computed(() =>
    this.plantillasRecurrentes().filter(plantilla =>
      plantilla.activa
      && plantilla.siguienteFecha >= this.fechaHoy()
      && plantilla.siguienteFecha <= this.fechaLimiteRecurrencias()
    )
  );

  // ─── Donut Category Item interface ───────────────────────────────────────
  // Declared here so template @for can use it without a separate model import.

  // ─── Time-Range Dropdown ─────────────────────────────────────────────────
  readonly tipoRango = signal<'MES' | 'SEMANA' | 'HOY' | 'PERSONALIZADO'>('MES');
  readonly rangoPersonalizado = signal<{ desde: string; hasta: string } | null>(null);
  readonly errorRango = signal('');
  readonly editandoRango = signal(false);
  borradorDesde = this.fechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  borradorHasta = this.fechaLocal(new Date());
  private dashboardVersion = 0;
  readonly fechasRango = computed(() => {
    const hoy = this.fechaHoy();
    if (this.tipoRango() === 'HOY') return { desde: hoy, hasta: hoy };
    if (this.tipoRango() === 'SEMANA') return { desde: this.agregarDias(hoy, -6), hasta: hoy };
    if (this.tipoRango() === 'PERSONALIZADO' && this.rangoPersonalizado()) return this.rangoPersonalizado()!;
    const mes = this.periodoSeleccionado();
    return { desde: this.fechaLocal(mes), hasta: this.fechaLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 0)) };
  });
  readonly modalRangoAbierto = signal(false);
  readonly etiquetaRangoSeleccionado = computed(() => {
    switch (this.tipoRango()) {
      case 'MES': return this.periodoResumen();
      case 'SEMANA': return 'Últimos 7 días';
      case 'HOY': return 'Hoy';
      case 'PERSONALIZADO': {
        const rango = this.rangoPersonalizado();
        if (!rango) return this.periodoResumen();
        const formato = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', ...(rango.desde.slice(0,4) !== rango.hasta.slice(0,4) ? {year: '2-digit' as const} : {}) });
        const desde = formato.format(new Date(`${rango.desde}T12:00:00`));
        const hasta = formato.format(new Date(`${rango.hasta}T12:00:00`));
        return `${desde} – ${hasta}`;
      }
    }
  });

  toggleModalRango(): void { this.modalRangoAbierto.update(v => !v); }
  cerrarModalRango(): void { this.modalRangoAbierto.set(false); this.editandoRango.set(false); }
  seleccionarRango(rango: 'MES' | 'SEMANA' | 'HOY' | 'PERSONALIZADO'): void {
    if (rango === 'PERSONALIZADO') {
      this.editandoRango.set(true);
      this.errorRango.set('');
      return;
    }
    this.tipoRango.set(rango);
    this.periodoSeleccionado.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    this.cerrarModalRango();
    this.cargarDashboard();
  }

  aplicarRangoPersonalizado(): void {
    const desde = this.borradorDesde;
    const hasta = this.borradorHasta;
    if (!desde || !hasta || desde < '2000-01-01' || desde > hasta || hasta > this.fechaLocal(new Date())) {
      this.errorRango.set('Elige fechas válidas, ordenadas y no posteriores a hoy.');
      return;
    }
    this.rangoPersonalizado.set({ desde, hasta });
    this.tipoRango.set('PERSONALIZADO');
    const [anio, mes] = hasta.split('-').map(Number);
    this.periodoSeleccionado.set(new Date(anio, mes - 1, 1));
    this.errorRango.set('');
    this.cerrarModalRango();
    this.cargarDashboard();
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

  // ─── Donut Chart ─────────────────────────────────────────────────────────
  private readonly DONUT_PALETTE = [
    '#6366F1', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'
  ];

  readonly analitica = signal<DashboardAnalitica | null>(null);

  /** Computed: categorías de gasto para el donut (top 4, en moneda seleccionada). */
  readonly donutCategorias = computed(() => {
    const rawCats: DashboardGastoCategoria[] =
      this.analitica()?.gastosPorCategoria ?? [];
    const moneda = this.monedaResumen();
    const gastos = rawCats.filter(c => c.moneda === moneda && c.monto > 0);
    const ordenados = gastos.slice().sort((a, b) => b.monto - a.monto);
    const top4 = ordenados.slice(0, 4);
    const otros = ordenados.slice(4).reduce((s, c) => s + c.monto, 0);
    if (otros > 0) top4.push({ categoriaId: -1, categoriaNombre: 'Otros', categoriaColor: '#94a3b8', monto: otros, moneda });
    const total = gastos.reduce((s, c) => s + c.monto, 0);
    const CIRCUM = 2 * Math.PI * 64; // r=64

    let offsetAcum = 0;
    return top4.map((cat, idx) => {
      const fraction = total > 0 ? cat.monto / total : 0;
      const dash = fraction * CIRCUM;
      const gap = CIRCUM - dash;
      const offset = CIRCUM - offsetAcum;
      offsetAcum += dash;
      return {
        id: cat.categoriaId ?? -2,
        nombre: cat.categoriaNombre,
        monto: cat.monto,
        porcentaje: Math.round(fraction * 100),
        color: cat.categoriaColor ?? this.DONUT_PALETTE[idx % this.DONUT_PALETTE.length],
        strokeDasharray: `${dash} ${gap}`,
        strokeDashoffset: offset
      };
    });
  });

  readonly totalGastosPeriodo = computed(() =>
    this.donutCategorias().reduce((s, c) => s + c.monto, 0)
  );

  readonly categoriaDonutSeleccionada = signal<ReturnType<typeof this.donutCategorias>[number] | null>(null);

  seleccionarCategoriaDonut(item: ReturnType<typeof this.donutCategorias>[number]): void {
    this.categoriaDonutSeleccionada.update(prev => prev?.id === item.id ? null : item);
  }

  resetearDonut(): void { this.categoriaDonutSeleccionada.set(null); }

  // ─── Actividad Reciente limitada ─────────────────────────────────────────
  readonly ultimosMovimientosLimitados = computed(() =>
    (this.resumen()?.ultimosMovimientos ?? []).slice(0, 8)
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
    this.resetearDonut();
    this.monedaResumen.set(moneda);
  }

  @ViewChild('budgetScroller') budgetScroller?: ElementRef<HTMLDivElement>;

  constructor() {
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
    window.dispatchEvent(new CustomEvent('kaptal-abrir-captura-chat', { detail: { tipo } }));
  }

  cargarDashboard(): void {
    this.fechaHoy.set(this.fechaLocal(new Date()));
    const version = ++this.dashboardVersion;
    this.resetearDonut();
    this.analitica.set(null);
    this.resumen.set(null);
    this.loading.set(true);
    this.error.set(null);
    this.cargarRecurrencias();
    const periodo = this.periodoSeleccionado();
    const mes = periodo.getMonth() + 1;
    const anio = periodo.getFullYear();
    this.cargarPresupuestos();

    const { desde, hasta } = this.fechasRango();
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
        this.error.set('No se pudo cargar el resumen financiero. Verifica que el backend esté en ejecución.');
        this.loading.set(false);
      }
    });

    // Cargar analítica de categorías para el gráfico donut
    this.finanzasService.getDashboardAnalitica(mes, anio, desde, hasta).subscribe({
      next: (res) => { if (version === this.dashboardVersion && res.success && res.data) this.analitica.set(res.data); },
      error: () => { if (version === this.dashboardVersion) this.toastService.error('No se pudo cargar el gráfico de gastos.'); }
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
    const actual = this.periodoSeleccionado();
    const siguiente = new Date(actual.getFullYear(), actual.getMonth() + desplazamiento, 1);
    if (siguiente.getTime() > new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()) return;
    this.periodoSeleccionado.set(siguiente);
    this.tipoRango.set('MES');
    this.cargarDashboard();
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
    this.finanzasService.getCuentas().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.cuentas.set(res.data);
          this.catalogoOfflineUsado.set(false);
          void this.guardarCatalogoOffline();
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
      error: () => void this.restaurarCatalogoOffline('cuentas').finally(() => {
        this.cuentasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      })
    });

    this.finanzasService.getCategorias().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categorias.set(res.data);
          this.catalogoOfflineUsado.set(false);
          void this.guardarCatalogoOffline();
        }
        this.categoriasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      },
      error: () => void this.restaurarCatalogoOffline('categorias').finally(() => {
        this.categoriasCargadasParaAccionRapida = true;
        this.abrirAccionRapidaCuandoListo();
      })
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
      if (!catalogo) return;
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
    const payload = pendiente.payload;
    this.abrirModal(payload.tipo);
    this.formIdempotencyKey = pendiente.id;
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
    this.modalError.set(pendiente.error ?? null);
  }

  async eliminarPendiente(id: string): Promise<void> {
    await this.movimientosOffline.descartar(id);
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
        this.submitting.set(false);
        this.cerrarModal();
        this.toastService.info('Guardado en este dispositivo. Se sincronizará cuando vuelva la conexión.');
      } catch {
        this.submitting.set(false);
        this.modalError.set('No se pudo guardar en este dispositivo. El formulario sigue abierto; no se perdió lo que escribiste.');
      }
      return;
    }

    this.finanzasService.crearTransaccion(payload, this.formIdempotencyKey).subscribe({
      next: (res) => {
        this.submitting.set(false);
        void this.movimientosOffline.descartar(this.formIdempotencyKey).catch(() => undefined);
        this.formIdempotencyKey = '';
        this.payloadParaReintento = null;
        this.cerrarModal();
        this.cargarDashboard();
        this.cargarCuentasYCategorias();
        this.toastService.success('Movimiento registrado correctamente.');
      },
      error: (err) => {
        this.submitting.set(false);
        if (err.status === 0 || err.status >= 500) {
          this.payloadParaReintento = payload;
          this.falloDeRed.set(true);
          this.modalError.set('No hubo respuesta del servidor. Puedes revisar la conexión y reintentar; Kaptal usará la misma clave para evitar duplicarlo si el servidor ya lo recibió.');
          void this.persistirSolicitudIncierta(payload, this.formIdempotencyKey);
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

  private async persistirSolicitudIncierta(payload: TransaccionPayload, id: string): Promise<void> {
    const usuarioId = this.authService.currentUser()?.id;
    if (usuarioId == null) return;
    try {
      await this.movimientosOffline.guardarPendiente(usuarioId, id, payload);
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

  irATransacciones(categoriaId?: number | null): void {
    if (categoriaId == null) {
      this.router.navigate(['/transacciones']);
      return;
    }
    const { desde: fechaInicio, hasta: fechaFin } = this.fechasRango();
    this.router.navigate(['/transacciones'], { queryParams: { categoriaId, fechaInicio, fechaFin } });
  }

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
