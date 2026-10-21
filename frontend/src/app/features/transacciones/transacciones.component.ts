import { ListaContextoService } from '../../core/services/lista-contexto.service';
import { parsearEtiquetas } from '../../core/utils/etiquetas';
import { FeatureStylesService } from '../../core/services/feature-styles.service';
import { TextoFinancieroPipe } from '../../core/pipes/texto-financiero.pipe';
import { crearIdSolicitud } from '../../core/utils/request-id';
import { MontoPrivadoDirective } from '../../shared/directives/monto-privado.directive';
import { Component, HostListener, OnDestroy, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { FinanzasService } from '../../core/services/finanzas.service';
import { CategoriaPreferidaService } from '../../core/services/categoria-preferida.service';
import { mensajeDeError } from '../../core/utils/mensaje-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { CategoriaSelectorComponent } from '../../shared/components/categoria-selector/categoria-selector.component';
import { CuentaSelectorComponent } from '../../shared/components/cuenta-selector/cuenta-selector.component';
import { MovimientoMobileCardComponent } from '../../shared/components/movimiento-mobile-card/movimiento-mobile-card.component';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { DialogViewportDirective } from '../../shared/directives/dialog-viewport.directive';
import { PrivacyToggleComponent } from '../../shared/components/privacy-toggle/privacy-toggle.component';
import { FechaPickerComponent } from '../../shared/components/fecha-picker/fecha-picker.component';
import { MontoPipe } from '../../core/pipes/monto.pipe';
import { nombreCuentaVisible } from '../../core/utils/cuenta-financiera';
import { firstValueFrom, Subscription, skip } from 'rxjs';
import {
  Categoria,
  Cuenta,
  FrecuenciaRecurrencia,
  PageResponse,
  TipoTransaccion,
  Transaccion,
  TransaccionFiltro,
  TransaccionPayload
} from '../../core/models/finanzas.models';

interface FilaImportacionCsv {
  numero: number;
  fecha: string;
  tipo: string;
  monto: number;
  moneda: string;
  cuenta: string;
  categoria: string;
  descripcion: string;
  notas: string;
  payload: TransaccionPayload | null;
  errores: string[];
  duplicadaEnArchivo: boolean;
  incluir: boolean;
  estado: 'PENDIENTE' | 'IMPORTADA' | 'ERROR';
  errorImportacion?: string;
}

interface FiltroVisible {
  clave: 'tipo' | 'cuenta' | 'categoria' | 'monto' | 'fechas' | 'busqueda' | 'movimiento' | 'autor' | 'moneda';
  id: string;
  etiqueta: string;
  categoriaId?: number;
}

@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [TextoFinancieroPipe, MontoPrivadoDirective, CommonModule, FormsModule, CategoriaSelectorComponent, CuentaSelectorComponent, MovimientoMobileCardComponent, FocusTrapDirective, MontoPipe, FechaPickerComponent, DialogViewportDirective, PrivacyToggleComponent],
  templateUrl: './transacciones.component.html'
})
export class TransaccionesComponent implements OnInit, OnDestroy {
  private readonly styleAssets = inject(FeatureStylesService).load('activity');
  readonly nombreCuentaVisible = nombreCuentaVisible;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly finanzasService = inject(FinanzasService);
  readonly contextoLista = inject(ListaContextoService);
  readonly filtroAutorId = signal<number | null>(null);
  readonly borradorAutorId = signal<number | null>(null);
  readonly soloPropios = signal(false);
  readonly filtroMoneda = signal<string | null>(null);
  private rutaSub?: Subscription;
  private evidenciaRevision = 0;
  private listaConsulta: number | null = null;
  formListaId: number | null = null;
  formEtiquetas = '';
  puedeModificar(movimiento: Transaccion): boolean { const lista = this.contextoLista.listas().find(l => l.id === movimiento.listaId); return !lista?.archivada && lista?.rol !== 'LECTOR' && (!movimiento.autorId || this.contextoLista.usuarioId() == null || movimiento.autorId === this.contextoLista.usuarioId()); }
  listasEditables() { return this.contextoLista.listas().filter(l => !l.archivada && l.rol !== 'LECTOR'); }
  constructor() {
    this.soloPropios.set(this.route.snapshot.queryParamMap.get('alcance') === 'propio');
    this.evidenciaRevision = this.contextoLista.seleccionVersion();
    this.contextoLista.solicitarDesdeRuta(Number(this.route.snapshot.queryParamMap.get('listaId')));
    let revisionObservada = this.contextoLista.seleccionVersion();
    let observada = this.contextoLista.activaId();
    const seleccionInicial = this.contextoLista.seleccionVersion();
    const listaExplicita = Number(this.route.snapshot.queryParamMap.get('listaId')) > 0;
    effect(() => {
      const id = this.contextoLista.activaId(), revision = this.contextoLista.seleccionVersion();
      if (id === observada && revision === revisionObservada) return;
      revisionObservada = revision;
      observada = id;
      if (this.soloPropios() && revision === this.evidenciaRevision) return;
      if (listaExplicita && this.contextoLista.seleccionVersion() === seleccionInicial) return;
      this.listaConsulta = id;
      untracked(() => { this.soloPropios.set(false); void this.router.navigate([], {relativeTo:this.route,queryParams:{listaId:id,alcance:null},queryParamsHandling:'merge',replaceUrl:true}); this.detalleMovimiento.set(null); this.pageData.set(null); this.filtroAutorId.set(null); this.paginaActual.set(0); this.cargarTransacciones(); });
    });
  }

  private readonly categoriaPreferida = inject(CategoriaPreferidaService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  // Filtros Signals
  readonly filtroTipo = signal<TipoTransaccion | ''>('');
  readonly panelFiltrosAbierto = signal(false);
  readonly filtroCuentaId = signal<number | null>(null);
  readonly filtroCategoriaId = signal<number | null>(null);
  readonly filtroCategoriaIds = signal<number[]>([]);
  readonly filtroFechaInicio = signal<string>('');
  readonly filtroFechaFin = signal<string>('');
  readonly filtroBusqueda = signal<string>('');
  readonly filtroBusquedaInput = signal<string>('');
  readonly filtroMontoMin = signal<number | null>(null);
  readonly filtroMontoMax = signal<number | null>(null);
  readonly filtroMovimientoId = signal<number | null>(null);
  readonly detalleMovimiento = signal<Transaccion | null>(null);

  // Borrador del panel de filtros (se aplica al confirmar)
  readonly borradorTipo = signal<TipoTransaccion | ''>('');
  readonly borradorCuentaId = signal<number | null>(null);
  readonly borradorCategoriaIds = signal<number[]>([]);
  readonly borradorFechaInicio = signal<string>('');
  readonly borradorFechaFin = signal<string>('');
  readonly borradorMontoMin = signal<number | null>(null);
  readonly borradorMontoMax = signal<number | null>(null);

  private listadoSub?: Subscription;
  readonly tiposHistorial: {value: TipoTransaccion | ''; label: string}[] = [
    {value:'',label:'Todos'}, {value:'GASTO',label:'Gastos'}, {value:'INGRESO',label:'Ingresos'}, {value:'TRANSFERENCIA',label:'Transferencias'}
  ];
  readonly gruposHistorial = computed(() => {
    const grupos = new Map<string, Transaccion[]>();
    for (const movimiento of this.pageData()?.content ?? []) {
      const grupo = grupos.get(movimiento.fecha) ?? [];
      grupo.push(movimiento); grupos.set(movimiento.fecha, grupo);
    }
    return Array.from(grupos, ([fecha, movimientos]) => ({fecha, movimientos}));
  });
  totalesGrupo(movimientos: Transaccion[]): {moneda: string; monto: number}[] {
    const totales = new Map<string, number>();
    for (const movimiento of movimientos) {
      if (!['GASTO', 'INGRESO'].includes(movimiento.tipo)) continue;
      totales.set(movimiento.moneda, (totales.get(movimiento.moneda) ?? 0) + (movimiento.tipo === 'GASTO' ? -movimiento.monto : movimiento.monto));
    }
    return Array.from(totales, ([moneda, monto]) => ({moneda, monto}));
  }
  etiquetaDiaHistorial(fecha: string): string {
    const hoy = new Date(), ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()-1);
    if(fecha === this.fechaLocalIso(hoy)) return 'Hoy';
    if(fecha === this.fechaLocalIso(ayer)) return 'Ayer';
    const dia = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(dia.getTime()) ? fecha : new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric'}).format(dia);
  }
  private busquedaDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Paginación y Datos Signals
  readonly paginaActual = signal<number>(0);
  readonly tamanioPagina = signal<number>(15);
  readonly pageData = signal<PageResponse<Transaccion> | null>(null);
  readonly loading = signal<boolean>(false);
  readonly exportando = signal(false);
  readonly importadorAbierto = signal(false);
  readonly filasCsv = signal<FilaImportacionCsv[]>([]);
  readonly errorCsv = signal<string | null>(null);
  readonly importandoCsv = signal(false);
  readonly progresoImportacionCsv = signal('');
  readonly filasValidasCsv = computed(() => this.filasCsv().filter(fila => fila.errores.length === 0).length);
  readonly filasInvalidasCsv = computed(() => this.filasCsv().filter(fila => fila.errores.length > 0).length);
  readonly filasDuplicadasCsv = computed(() => this.filasCsv().filter(fila => fila.duplicadaEnArchivo).length);
  readonly filasSeleccionadasCsv = computed(() => this.filasCsv().filter(fila =>
    fila.incluir && fila.errores.length === 0 && fila.estado !== 'IMPORTADA'
  ).length);
  readonly error = signal<string | null>(null);

  // Auxiliares
  readonly cuentas = signal<Cuenta[]>([]);
  readonly categorias = signal<Categoria[]>([]);

  // Modal Signals
  readonly modalAbierto = signal<boolean>(false);
  readonly movimientoIncierto = signal(false);
  private claveMovimiento = '';
  private movimientoPendiente: TransaccionPayload | null = null;
  readonly formTipo = signal<TipoTransaccion>('GASTO');
  readonly modoEdicion = signal(false);
  readonly transaccionEditando = signal<Transaccion | null>(null);
  readonly submitting = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  formMonto: number | null = null;
  formCuentaId: number | null = null;
  formCuentaDestinoId: number | null = null;
  formTasaCambio: number | null = null;
  formCategoriaId: number | null = null;
  formFecha: string = '';
  formNotas: string = '';
  formDescripcion = '';
  movimientoRecurrente = false;
  esCompraMsi = false;
  formMsi: number | null = null;
  frecuenciaRecurrencia: FrecuenciaRecurrencia = 'MENSUAL';
  siguienteFechaRecurrencia = '';
  formModoEdicion: 'SOLO_ESTA' | 'ESTA_Y_SIGUIENTES' | 'TODA_LA_SERIE' = 'SOLO_ESTA';
  formFechaFinRecurrencia: string = '';

  readonly modoEdicionOpciones: { value: 'SOLO_ESTA' | 'ESTA_Y_SIGUIENTES' | 'TODA_LA_SERIE'; label: string; descripcion: string }[] = [
    { value: 'SOLO_ESTA', label: 'Solo este movimiento', descripcion: 'Los anteriores y posteriores no se tocan.' },
    { value: 'ESTA_Y_SIGUIENTES', label: 'Este y los siguientes', descripcion: 'Modifica desde este movimiento en adelante.' },
    { value: 'TODA_LA_SERIE', label: 'Toda la serie', descripcion: 'Actualiza categoría, notas, lista y etiquetas del historial. Los importes y cuentas anteriores se conservan.' },
  ];

  // Categorías filtradas por tipo para el modal
  readonly categoriasModal = computed(() => {
    return this.categorias().filter(c => c.tipo === this.formTipo());
  });
  esCuentaCredito(): boolean {
    return this.cuentas().find(cuenta => cuenta.id === this.formCuentaId)?.tipo === 'CREDITO';
  }

  /** Destinos válidos: nunca la misma cuenta, ni una tarjeta de crédito si el origen ya lo es. */
  cuentasDestinoDisponibles(): Cuenta[] {
    const origen = this.cuentas().find(cuenta => cuenta.id === this.formCuentaId);
    return this.cuentas().filter(cuenta =>
      cuenta.id !== this.formCuentaId
      && !(origen?.tipo === 'CREDITO' && cuenta.tipo === 'CREDITO')
    );
  }

  cambiarCuentaOrigen(cuentaId: number | null): void {
    this.formCuentaId = cuentaId;
    const destinos = this.cuentasDestinoDisponibles();
    if (!destinos.some(cuenta => cuenta.id === this.formCuentaDestinoId)) {
      this.formCuentaDestinoId = destinos[0]?.id ?? null;
    }
    if (this.formTipo() !== 'TRANSFERENCIA') this.formCuentaDestinoId = null;
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

  monedaCuenta(id: number | null): string {
    return this.cuentas().find(cuenta => cuenta.id === id)?.moneda ?? 'MXN';
  }

  readonly resumenPaginaPorMoneda = computed(() => {
    const resumen = new Map<string, { ingresos: number; gastos: number }>();
    for (const transaccion of this.pageData()?.content || []) {
      if (transaccion.tipo !== 'INGRESO' && transaccion.tipo !== 'GASTO') continue;
      const totales = resumen.get(transaccion.moneda) ?? { ingresos: 0, gastos: 0 };
      if (transaccion.tipo === 'INGRESO') totales.ingresos += Number(transaccion.monto);
      else totales.gastos += Number(transaccion.monto);
      resumen.set(transaccion.moneda, totales);
    }
    return Array.from(resumen, ([moneda, totales]) => ({
      moneda,
      ingresos: totales.ingresos,
      gastos: totales.gastos,
      balance: totales.ingresos - totales.gastos
    }));
  });

  readonly tieneFiltrosActivos = computed(() => {
    return (
      this.filtroAutorId() !== null ||
      this.filtroTipo() !== '' ||
      this.filtroCuentaId() !== null ||
      this.filtroCategoriaId() !== null ||
      this.filtroCategoriaIds().length > 0 ||
      this.filtroFechaInicio() !== '' ||
      this.filtroFechaFin() !== '' ||
      this.filtroMontoMin() !== null ||
      this.filtroMontoMax() !== null ||
      this.filtroBusqueda().trim() !== '' ||
      this.filtroMovimientoId() !== null
    );
  });

  readonly tieneFiltrosAvanzadosActivos = computed(() =>
    this.filtroMoneda() !== null || this.filtroAutorId() !== null || this.filtroTipo() !== ''
    || this.filtroCuentaId() !== null
    || this.filtroCategoriaId() !== null
    || this.filtroCategoriaIds().length > 0
    || this.filtroFechaInicio() !== ''
    || this.filtroFechaFin() !== ''
    || this.filtroMontoMin() !== null
    || this.filtroMontoMax() !== null
  );

  readonly filtrosVisibles = computed(() => {
    const filtros: FiltroVisible[] = [];
    const agregar = (clave: FiltroVisible['clave'], etiqueta: string) => filtros.push({clave,id:clave,etiqueta});
    if (this.filtroMoneda()) agregar('moneda', 'Moneda: ' + this.filtroMoneda());
    if (this.filtroAutorId() != null) agregar('autor', 'Autor: ' + (this.contextoLista.activa()?.miembros.find(m => m.id === this.filtroAutorId())?.nombre ?? 'Participante'));
    const tipo = this.filtroTipo();
    if(tipo) agregar('tipo',this.etiquetaTipoDetalle(tipo));
    if(this.filtroCuentaId() !== null) agregar('cuenta','Cuenta: '+(this.cuentas().find(c=>c.id===this.filtroCuentaId())?.nombre ?? 'Cuenta'));
    const ids = new Set(this.filtroCategoriaIds());
    const categoria = this.filtroCategoriaId();
    if(categoria !== null) ids.add(categoria);
    for(const id of ids) filtros.push({clave:'categoria',id:`categoria-${id}`,categoriaId:id,etiqueta:this.categorias().find(c=>c.id===id)?.nombre ?? 'Categoría'});
    if(this.filtroMontoMin() !== null || this.filtroMontoMax() !== null) agregar('monto',`Monto: ${this.filtroMontoMin() ?? 'sin mínimo'} – ${this.filtroMontoMax() ?? 'sin máximo'}`);
    if(this.filtroFechaInicio() || this.filtroFechaFin()) agregar('fechas',`${this.filtroFechaInicio() || 'Sin inicio'} → ${this.filtroFechaFin() || 'Sin fin'}`);
    if(this.filtroBusqueda().trim()) agregar('busqueda',`Búsqueda: ${this.filtroBusqueda().trim()}`);
    if(this.filtroMovimientoId() !== null) agregar('movimiento',`Movimiento #${this.filtroMovimientoId()}`);
    return filtros;
  });

  quitarFiltro(filtro: FiltroVisible): void {
    let queryParams: Record<string,null> = {};
    switch(filtro.clave) {
      case 'moneda': this.filtroMoneda.set(null);queryParams={moneda:null};break;
      case 'tipo': this.filtroTipo.set('');break;
      case 'autor': this.filtroAutorId.set(null); break;
      case 'cuenta': this.filtroCuentaId.set(null);queryParams={cuentaId:null};break;
      case 'categoria':
        this.filtroCategoriaIds.update(ids=>ids.filter(id=>id!==filtro.categoriaId));
        if(this.filtroCategoriaId()===filtro.categoriaId) this.filtroCategoriaId.set(null);
        if(Number(this.route.snapshot.queryParamMap.get('categoriaId'))===filtro.categoriaId) queryParams={categoriaId:null};
        break;
      case 'monto': this.filtroMontoMin.set(null);this.filtroMontoMax.set(null);break;
      case 'fechas': this.filtroFechaInicio.set('');this.filtroFechaFin.set('');queryParams={fechaInicio:null,fechaFin:null};break;
      case 'busqueda': this.limpiarBusqueda();return;
      case 'movimiento': this.filtroMovimientoId.set(null);queryParams={movimientoId:null};break;
    }
    if(Object.keys(queryParams).some(param=>this.route.snapshot.queryParamMap.has(param))) {
      void this.router.navigate([],{relativeTo:this.route,queryParams,queryParamsHandling:'merge',replaceUrl:true});
    }
    this.paginaActual.set(0);this.cargarTransacciones();
  }

  abrirPanelFiltros(): void {
    this.borradorAutorId.set(this.filtroAutorId());
    this.borradorTipo.set(this.filtroTipo());
    this.borradorCuentaId.set(this.filtroCuentaId());
    const categoriasSeleccionadas = this.filtroCategoriaIds();
    const categoriaSeleccionada = this.filtroCategoriaId();
    this.borradorCategoriaIds.set(
      categoriasSeleccionadas.length
        ? [...categoriasSeleccionadas]
        : categoriaSeleccionada === null ? [] : [categoriaSeleccionada]
    );
    this.borradorFechaInicio.set(this.filtroFechaInicio());
    this.borradorFechaFin.set(this.filtroFechaFin());
    this.borradorMontoMin.set(this.filtroMontoMin());
    this.borradorMontoMax.set(this.filtroMontoMax());
    this.panelFiltrosAbierto.set(true);
  }

  cerrarPanelFiltros(): void {
    this.panelFiltrosAbierto.set(false);
  }

  resetearBorradorFiltros(): void {
    this.borradorAutorId.set(null);
    this.borradorTipo.set('');
    this.borradorCuentaId.set(null);
    this.borradorCategoriaIds.set([]);
    this.borradorFechaInicio.set('');
    this.borradorFechaFin.set('');
    this.borradorMontoMin.set(null);
    this.borradorMontoMax.set(null);
  }

  alternarCategoriaBorrador(categoriaId: number, seleccionada: boolean): void {
    const seleccion = new Set(this.borradorCategoriaIds());
    if (seleccionada) seleccion.add(categoriaId);
    else seleccion.delete(categoriaId);
    this.borradorCategoriaIds.set([...seleccion].sort((a, b) => a - b));
  }

  aplicarRangoRapidoBorrador(preset: 'ESTE_MES' | 'MES_PASADO' | 'ULTIMOS_30' | 'TODO'): void {
    const hoy = new Date();
    if (preset === 'TODO') {
      this.borradorFechaInicio.set('');
      this.borradorFechaFin.set('');
      return;
    }

    let inicio: Date;
    let fin: Date;
    if (preset === 'ESTE_MES') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else if (preset === 'MES_PASADO') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    } else {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30);
      fin = hoy;
    }

    this.borradorFechaInicio.set(this.fechaLocalIso(inicio));
    this.borradorFechaFin.set(this.fechaLocalIso(fin));
  }

  aplicarPanelFiltros(): void {
    const minimo = this.borradorMontoMin();
    const maximo = this.borradorMontoMax();
    const fechaInicio = this.borradorFechaInicio();
    const fechaFin = this.borradorFechaFin();
    if (
      (minimo !== null && (!Number.isFinite(minimo) || minimo < 0))
      || (maximo !== null && (!Number.isFinite(maximo) || maximo < 0))
      || (minimo !== null && maximo !== null && minimo > maximo)
    ) {
      this.toastService.error('Revisa el rango: el monto mínimo debe ser menor o igual al máximo.');
      return;
    }
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      this.toastService.error('La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }

    this.filtroAutorId.set(this.borradorAutorId());
    this.filtroTipo.set(this.borradorTipo());
    this.filtroCuentaId.set(this.borradorCuentaId());
    this.filtroCategoriaId.set(null);
    this.filtroCategoriaIds.set([...this.borradorCategoriaIds()]);
    this.filtroFechaInicio.set(this.borradorFechaInicio());
    this.filtroFechaFin.set(this.borradorFechaFin());
    this.filtroMontoMin.set(minimo);
    this.filtroMontoMax.set(maximo);
    this.filtroMovimientoId.set(null);
    this.paginaActual.set(0);
    this.cerrarPanelFiltros();
    this.cargarTransacciones();
  }

  abrirDetalleMovimiento(transaccion: Transaccion): void {
    this.detalleMovimiento.set(transaccion);
  }

  puedeRepetirse(movimiento: Transaccion): boolean {
    return movimiento.tipo !== 'SALDO_INICIAL' && movimiento.cuentaId != null
      && (movimiento.tipo !== 'TRANSFERENCIA' || movimiento.cuentaDestinoId != null)
      && !movimiento.cashbackAutomatico && !movimiento.compraMsiId;
  }
  repetirMovimiento(movimiento: Transaccion): void {
    if(!this.puedeRepetirse(movimiento)) return;
    this.cerrarDetalleMovimiento();
    window.dispatchEvent(new CustomEvent('kaptal-abrir-registro-rapido',{detail:{repetir:{tipo:movimiento.tipo,monto:movimiento.monto,cuentaId:movimiento.cuentaId,categoriaId:movimiento.categoriaId??null,cuentaDestinoId:movimiento.cuentaDestinoId??null,tasaCambio:movimiento.tasaCambio??null,descripcion:movimiento.descripcion,notas:movimiento.notas??null}}}));
  }
  cerrarDetalleMovimiento(): void {
    this.detalleMovimiento.set(null);
    if(this.route.snapshot.queryParamMap.has('detalle'))void this.router.navigate([],{relativeTo:this.route,queryParams:{detalle:null},queryParamsHandling:'merge',replaceUrl:true});
  }

  etiquetaTipoDetalle(tipo: TipoTransaccion): string {
    switch (tipo) {
      case 'INGRESO': return 'Ingreso';
      case 'GASTO': return 'Gasto';
      case 'TRANSFERENCIA': return 'Transferencia';
      case 'SALDO_INICIAL': return 'Saldo inicial';
    }
  }

  fechaHoraExacta(transaccion: Transaccion): string {
    const fecha = new Date(transaccion.fechaCreacion);
    if (!transaccion.fechaCreacion || Number.isNaN(fecha.getTime())) {
      const soloFecha = new Date(`${transaccion.fecha}T12:00:00`);
      return Number.isNaN(soloFecha.getTime())
        ? transaccion.fecha
        : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(soloFecha);
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(fecha);
  }

  etiquetaMetodoCaptura(transaccion: Transaccion): string {
    const metodo = MovimientoMobileCardComponent.detectarMetodoCaptura(transaccion);
    if (metodo === 'VOZ') return 'Voz';
    if (metodo === 'WHATSAPP') return 'WhatsApp';
    return metodo === 'TEXTO' ? 'Texto' : 'No registrado';
  }

  notaDetalleVisible(transaccion: Transaccion): string {
    return transaccion.notas?.trim() ?? '';
  }

  ngOnInit(): void {
    const lista = Number(this.route.snapshot.queryParamMap.get('listaId'));
    this.listaConsulta = this.soloPropios() ? null : Number.isSafeInteger(lista) && lista > 0 ? lista : this.contextoLista.activaId();
    this.cargarCuentasYCategorias();
    const categoriaId = Number(this.route.snapshot.queryParamMap.get('categoriaId'));
    if (Number.isSafeInteger(categoriaId) && categoriaId > 0) {
      this.filtroCategoriaId.set(categoriaId);
    }
    const fechaInicio = this.route.snapshot.queryParamMap.get('fechaInicio');
    const fechaFin = this.route.snapshot.queryParamMap.get('fechaFin');
    if (fechaInicio && /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      this.filtroFechaInicio.set(fechaInicio);
    }
    if (fechaFin && /^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      this.filtroFechaFin.set(fechaFin);
    }
    const cuentaId = Number(this.route.snapshot.queryParamMap.get('cuentaId'));
    if (Number.isSafeInteger(cuentaId) && cuentaId > 0) {
      this.filtroCuentaId.set(cuentaId);
    }
    const movimientoId = Number(this.route.snapshot.queryParamMap.get('movimientoId'));
    if (Number.isSafeInteger(movimientoId) && movimientoId > 0) {
      this.filtroMovimientoId.set(movimientoId);
    }
    this.aplicarEvidencia(this.route.snapshot.queryParamMap);
    this.cargarTransacciones();
    this.rutaSub = this.route.queryParamMap?.pipe(skip(1)).subscribe(params => {
      if (this.aplicarEvidencia(params)) this.cargarTransacciones();
    });
    const editar = this.route.snapshot.queryParamMap.get('editar');
    const transaccionId = Number(editar ?? this.route.snapshot.queryParamMap.get('detalle'));
    if (Number.isSafeInteger(transaccionId) && transaccionId > 0) {
      this.finanzasService.getTransaccion(transaccionId).subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.toastService.error(response.message || 'No se pudo abrir este movimiento.');
            return;
          }
          if(editar)this.abrirModalEditar(response.data);else this.abrirDetalleMovimiento(response.data);
        },
        error: err => this.toastService.error(mensajeDeError(err, 'No se pudo abrir este movimiento.'))
      });
    }
  }

  ngOnDestroy(): void {
    this.rutaSub?.unsubscribe();
    this.listadoSub?.unsubscribe();
    if (this.busquedaDebounceTimer) clearTimeout(this.busquedaDebounceTimer);
  }

  private fechaLocalIso(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  aplicarEvidencia(params: ParamMap): boolean {
    if (params.get('alcance') !== 'propio') return false;
    const moneda = params.get('moneda'), tipo = params.get('tipo');
    const desde = params.get('fechaInicio'), hasta = params.get('fechaFin');
    if (!moneda || !/^[A-Z]{3}$/.test(moneda) || (tipo !== 'INGRESO' && tipo !== 'GASTO')
        || !desde || !hasta || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return false;
    this.evidenciaRevision = this.contextoLista.seleccionVersion();
    this.soloPropios.set(true);this.listaConsulta = null;
    this.filtroMoneda.set(moneda);this.filtroTipo.set(tipo);
    this.filtroFechaInicio.set(desde);this.filtroFechaFin.set(hasta);
    this.filtroAutorId.set(null);this.filtroCuentaId.set(null);this.filtroCategoriaId.set(null);this.filtroCategoriaIds.set([]);
    this.filtroMovimientoId.set(null);this.filtroBusqueda.set('');this.filtroBusquedaInput.set('');
    this.filtroMontoMin.set(null);this.filtroMontoMax.set(null);this.paginaActual.set(0);
    return true;
  }

  cargarCuentasYCategorias(): void {
    this.finanzasService.getCuentas().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.cuentas.set(res.data.filter(c => c.activo));
          if (this.modalAbierto() && !this.modoEdicion() && this.formCuentaId == null) {
            this.formCuentaId = this.cuentas()[0]?.id ?? null;
          }
        }
      }
    });

    this.finanzasService.getCategorias().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categorias.set(res.data);
          if (this.modalAbierto() && !this.modoEdicion() && this.formCategoriaId == null) {
            const preferida = this.categoriaPreferida.preferida(this.formTipo());
            this.formCategoriaId = this.categoriasModal().find(item => item.id === preferida)?.id
              ?? this.categoriasModal()[0]?.id ?? null;
          }
        }
      }
    });
  }

  cargarTransacciones(): void {
    this.listadoSub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    const filtros: TransaccionFiltro = {
      soloPropios: this.soloPropios(), moneda: this.filtroMoneda(),
      ...(this.listaConsulta == null ? {} : { listaId: this.listaConsulta }),
      ...(this.filtroAutorId() == null ? {} : { autorId: this.filtroAutorId() }),
      tipo: this.filtroTipo(),
      cuentaId: this.filtroCuentaId(),
      categoriaId: this.filtroCategoriaId(),
      fechaInicio: this.filtroFechaInicio() || null,
      fechaFin: this.filtroFechaFin() || null,
      busqueda: this.filtroBusqueda(),
      id: this.filtroMovimientoId(),
      categoriaIds: this.filtroCategoriaIds().length ? [...this.filtroCategoriaIds()] : undefined,
      montoMin: this.filtroMontoMin(),
      montoMax: this.filtroMontoMax()
    };

    this.listadoSub = this.finanzasService.getTransaccionesPaginadas(filtros, this.paginaActual(), this.tamanioPagina()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.pageData.set(res.data);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(mensajeDeError(err, 'Error al obtener transacciones'));
      }
    });
  }

  onBusquedaChange(val: string): void {
    this.filtroBusquedaInput.set(val);
    if (this.busquedaDebounceTimer) clearTimeout(this.busquedaDebounceTimer);
    this.busquedaDebounceTimer = setTimeout(() => {
      this.busquedaDebounceTimer = null;
      this.filtroBusqueda.set(val);
      this.paginaActual.set(0);
      this.cargarTransacciones();
    }, 300);
  }

  limpiarBusqueda(): void {
    if (this.busquedaDebounceTimer) clearTimeout(this.busquedaDebounceTimer);
    this.busquedaDebounceTimer = null;
    this.filtroBusquedaInput.set('');
    this.filtroBusqueda.set('');
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  setTipoFiltro(tipo: TipoTransaccion | ''): void {
    this.filtroTipo.set(tipo);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onCuentaChange(cuentaId: number | null): void {
    this.filtroCuentaId.set(cuentaId);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onCategoriaChange(categoriaId: number | null): void {
    this.filtroCategoriaId.set(categoriaId);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onFechaInicioChange(fecha: string): void {
    this.filtroFechaInicio.set(fecha);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  onFechaFinChange(fecha: string): void {
    this.filtroFechaFin.set(fecha);
    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  aplicarRangoRapido(preset: 'ESTE_MES' | 'MES_PASADO' | 'ULTIMOS_30' | 'TODO'): void {
    const hoy = new Date();
    if (preset === 'TODO') {
      this.filtroFechaInicio.set('');
      this.filtroFechaFin.set('');
    } else if (preset === 'ESTE_MES') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      this.filtroFechaInicio.set(inicio.toISOString().split('T')[0]);
      this.filtroFechaFin.set(fin.toISOString().split('T')[0]);
    } else if (preset === 'MES_PASADO') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      this.filtroFechaInicio.set(inicio.toISOString().split('T')[0]);
      this.filtroFechaFin.set(fin.toISOString().split('T')[0]);
    } else if (preset === 'ULTIMOS_30') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 30);
      this.filtroFechaInicio.set(inicio.toISOString().split('T')[0]);
      this.filtroFechaFin.set(hoy.toISOString().split('T')[0]);
    }

    this.paginaActual.set(0);
    this.cargarTransacciones();
  }

  limpiarFiltros(): void {
    this.soloPropios.set(false);this.filtroMoneda.set(null);this.listaConsulta = this.contextoLista.activaId();
    if (this.busquedaDebounceTimer) clearTimeout(this.busquedaDebounceTimer);
    this.busquedaDebounceTimer = null;
    this.filtroAutorId.set(null);
    this.filtroTipo.set('');
    this.filtroCuentaId.set(null);
    this.filtroCategoriaId.set(null);
    this.filtroCategoriaIds.set([]);
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
    this.filtroMontoMin.set(null);
    this.filtroMontoMax.set(null);
    this.filtroBusquedaInput.set('');
    this.filtroBusqueda.set('');
    this.filtroMovimientoId.set(null);
    this.paginaActual.set(0);
    if (['movimientoId', 'cuentaId', 'categoriaId', 'fechaInicio', 'fechaFin', 'alcance', 'moneda', 'tipo']
      .some(parametro => this.route.snapshot.queryParamMap.has(parametro))) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { movimientoId: null, cuentaId: null, categoriaId: null, fechaInicio: null, fechaFin: null, alcance: null, moneda: null, tipo: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
    this.cargarTransacciones();
  }

  exportarCsv(): void {
    const filtros: TransaccionFiltro = {
      soloPropios: this.soloPropios(), moneda: this.filtroMoneda(),
      ...(this.listaConsulta == null ? {} : { listaId: this.listaConsulta }),
      ...(this.filtroAutorId() == null ? {} : { autorId: this.filtroAutorId() }),
      tipo: this.filtroTipo(),
      cuentaId: this.filtroCuentaId(),
      categoriaId: this.filtroCategoriaId(),
      fechaInicio: this.filtroFechaInicio() || null,
      fechaFin: this.filtroFechaFin() || null,
      busqueda: this.filtroBusqueda(),
      categoriaIds: this.filtroCategoriaIds().length ? [...this.filtroCategoriaIds()] : undefined,
      montoMin: this.filtroMontoMin(),
      montoMax: this.filtroMontoMax()
    };
    this.exportando.set(true);
    this.finanzasService.exportarTransaccionesCsv(filtros).subscribe({
      next: respuesta => {
        this.exportando.set(false);
        if (!respuesta.body) {
          this.toastService.error('El servidor devolvió un archivo CSV vacío.');
          return;
        }
        const disposition = respuesta.headers.get('Content-Disposition');
        const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'movimientos.csv';
        const url = URL.createObjectURL(respuesta.body);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = filename;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: err => {
        this.exportando.set(false);
        this.toastService.error(mensajeDeError(err, 'No se pudieron exportar los movimientos.'));
      }
    });
  }

  alternarImportador(): void {
    this.importadorAbierto.update(abierto => !abierto);
    this.errorCsv.set(null);
  }

  descargarPlantillaCsv(): void {
    const contenido = '\uFEFFFecha,Tipo,Monto,Moneda,Cuenta,Categoría,Descripción,Notas\r\n';
    const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla-movimientos-kaptal.csv';
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async leerArchivoCsv(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.filasCsv.set([]);
    this.errorCsv.set(null);
    if (!archivo.name.toLowerCase().endsWith('.csv')) {
      this.errorCsv.set('Selecciona un archivo con extensión .csv.');
      input.value = '';
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.errorCsv.set('El archivo supera el límite de 5 MB.');
      input.value = '';
      return;
    }

    try {
      const registros = parsearRegistrosCsv((await archivo.text()).replace(/^\uFEFF/, ''));
      if (registros.length < 2) throw new Error('El CSV debe incluir encabezados y al menos una fila de datos.');
      if (registros.length > 501) throw new Error('El archivo supera el máximo de 500 movimientos.');

      const encabezados = registros[0].map(normalizarEncabezadoCsv);
      const columnas = new Map<string, number>();
      encabezados.forEach((encabezado, indice) => {
        if (encabezado && !columnas.has(encabezado)) columnas.set(encabezado, indice);
      });
      for (const [alias, nombre] of [['monto origen','monto'],['moneda origen','moneda'],['cuenta origen','cuenta']]) {
        if (!columnas.has(nombre) && columnas.has(alias)) columnas.set(nombre,columnas.get(alias)!);
      }
      const obligatorias = ['fecha', 'tipo', 'monto', 'moneda', 'cuenta'];
      const faltantes = obligatorias.filter(nombre => !columnas.has(nombre));
      if (faltantes.length) {
        throw new Error(`Faltan columnas obligatorias: ${faltantes.join(', ')}.`);
      }

      const duplicados = new Set<string>();
      const filas = registros.slice(1)
        .map((registro, indice) => ({ registro, numero: indice + 2 }))
        .filter(({ registro }) => registro.some(valor => valor.trim() !== ''))
        .map(({ registro, numero }) => {
          const valor = (nombre: string) => {
            const indice = columnas.get(nombre);
            return indice === undefined ? '' : (registro[indice] ?? '').trim();
          };
          const fechaOriginal = valor('fecha');
          const tipoOriginal = valor('tipo').toUpperCase();
          const montoOriginal = valor('monto');
          const moneda = valor('moneda').toUpperCase();
          const cuentaNombre = valor('cuenta');
          const categoriaNombre = valor('categoria');
          const descripcion = valor('descripcion');
          const notas = valor('notas');
          const errores: string[] = [];

          let etiquetas: string[] = [];
          try { etiquetas = parsearEtiquetas(valor('etiquetas')); } catch (error) { errores.push((error as Error).message); }
          const nombreLista = valor('lista');
          const listas = nombreLista ? this.listasEditables().filter(l => normalizarTextoCsv(l.nombre) === normalizarTextoCsv(nombreLista)) : [];
          const listaId = nombreLista ? listas[0]?.id : this.contextoLista.activaId();
          if (nombreLista && listas.length !== 1) errores.push('La lista no existe, no permite registro o coincide con varias opciones.');
          const fecha = parsearFechaCsv(fechaOriginal);
          if (!fecha) errores.push('La fecha debe ser válida (AAAA-MM-DD o DD/MM/AAAA).');

          const tipo = tipoOriginal === 'INGRESO' || tipoOriginal === 'GASTO' ? tipoOriginal : null;
          if (!tipo) errores.push('El tipo debe ser INGRESO o GASTO.');

          const monto = parsearMontoCsv(montoOriginal);
          if (monto === null || monto <= 0) errores.push('El monto debe ser un número mayor que cero.');

          if (!/^[A-Z]{3}$/.test(moneda)) errores.push('La moneda debe indicarse con un código de 3 letras, por ejemplo MXN.');

          const cuentasCoincidentes = this.cuentas().filter(cuenta =>
            cuenta.activo
            && normalizarTextoCsv(cuenta.nombre) === normalizarTextoCsv(cuentaNombre)
            && cuenta.moneda.toUpperCase() === moneda
          );
          const cuenta = cuentasCoincidentes.length === 1 ? cuentasCoincidentes[0] : null;
          if (!cuentaNombre) errores.push('Indica el nombre de la cuenta.');
          else if (cuentasCoincidentes.length === 0) errores.push('No se encontró una cuenta activa con ese nombre y moneda.');
          else if (cuentasCoincidentes.length > 1) errores.push('Hay varias cuentas con ese nombre y moneda; usa un nombre único.');

          let categoria: Categoria | null = null;
          if (categoriaNombre && tipo) {
            const categoriasCoincidentes = this.categorias().filter(item =>
              item.activo
              && item.tipo === tipo
              && normalizarTextoCsv(item.nombre) === normalizarTextoCsv(categoriaNombre)
            );
            categoria = categoriasCoincidentes.length === 1 ? categoriasCoincidentes[0] : null;
            if (categoriasCoincidentes.length === 0) errores.push('La categoría no existe o no corresponde al tipo indicado.');
            else if (categoriasCoincidentes.length > 1) errores.push('La categoría coincide con más de una opción; revisa su nombre.');
          }

          if (descripcion.length > 200) errores.push('La descripción supera los 200 caracteres.');
          if (notas.length > 500) errores.push('Las notas superan los 500 caracteres.');

          const payload: TransaccionPayload | null = fecha && tipo && monto !== null && cuenta && errores.length === 0
            ? { ...(listaId == null ? {} : { listaId }), etiquetas,
                fecha,
                tipo,
                monto,
                cuentaId: cuenta.id,
                categoriaId: categoria?.id ?? null,
                descripcion: descripcion || undefined,
                notas: notas || null
              }
            : null;
          const claveDuplicado = payload && monto !== null && cuenta
            ? [fecha, tipo, monto.toFixed(2), cuenta.id, categoria?.id ?? '', normalizarTextoCsv(descripcion)].join('|')
            : '';
          const duplicadaEnArchivo = !!claveDuplicado && duplicados.has(claveDuplicado);
          if (claveDuplicado) duplicados.add(claveDuplicado);

          return {
            numero, fecha: fechaOriginal, tipo: tipo ?? tipoOriginal, monto: monto ?? 0,
            moneda, cuenta: cuentaNombre, categoria: categoriaNombre, descripcion, notas,
            payload, errores, duplicadaEnArchivo, incluir: errores.length === 0 && !duplicadaEnArchivo,
            estado: 'PENDIENTE' as const
          };
        });

      if (!filas.length) throw new Error('No hay filas con movimientos para revisar.');
      this.filasCsv.set(filas);
    } catch (error) {
      this.errorCsv.set(error instanceof Error ? error.message : 'No se pudo leer el archivo CSV.');
    } finally {
      input.value = '';
    }
  }

  cambiarInclusionCsv(filaObjetivo: FilaImportacionCsv, incluir: boolean): void {
    this.filasCsv.update(filas => filas.map(fila =>
      fila.numero === filaObjetivo.numero ? { ...fila, incluir } : fila
    ));
  }

  limpiarImportacionCsv(): void {
    this.filasCsv.set([]);
    this.errorCsv.set(null);
    this.progresoImportacionCsv.set('');
  }

  async importarFilasCsv(): Promise<void> {
    const seleccionadas = this.filasCsv().filter(fila =>
      fila.incluir && fila.errores.length === 0 && fila.estado !== 'IMPORTADA' && fila.payload !== null
    );
    if (!seleccionadas.length || this.importandoCsv()) return;

    this.importandoCsv.set(true);
    let importadas = 0;
    let fallidas = 0;
    for (let indice = 0; indice < seleccionadas.length; indice++) {
      const fila = seleccionadas[indice];
      this.progresoImportacionCsv.set(`${indice + 1}/${seleccionadas.length}`);
      this.filasCsv.update(actuales => actuales.map(actual =>
        actual.numero === fila.numero ? { ...actual, errorImportacion: undefined } : actual
      ));
      try {
        const respuesta = await firstValueFrom(this.finanzasService.crearTransaccion(fila.payload!));
        if (!respuesta.success) throw new Error(respuesta.message || 'El servidor rechazó el movimiento.');
        importadas++;
        this.filasCsv.update(actuales => actuales.map(actual =>
          actual.numero === fila.numero ? { ...actual, estado: 'IMPORTADA' as const } : actual
        ));
      } catch (error) {
        fallidas++;
        const mensaje = mensajeDeError(error, 'No se pudo guardar este movimiento.');
        this.filasCsv.update(actuales => actuales.map(actual =>
          actual.numero === fila.numero
            ? { ...actual, estado: 'ERROR' as const, errorImportacion: mensaje, incluir: true }
            : actual
        ));
      }
    }
    this.importandoCsv.set(false);
    this.progresoImportacionCsv.set('');
    if (importadas > 0) {
      this.cargarTransacciones();
      this.cargarCuentasYCategorias();
      this.toastService.success(`${importadas} movimiento${importadas === 1 ? '' : 's'} importado${importadas === 1 ? '' : 's'}.`);
    }
    if (fallidas > 0) {
      this.toastService.error(`${fallidas} fila${fallidas === 1 ? '' : 's'} no se pudo${fallidas === 1 ? '' : 'ieron'} importar. Puedes revisar el error y reintentar.`);
    }
  }

  irAPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && (!this.pageData() || nuevaPagina < this.pageData()!.totalPages)) {
      this.paginaActual.set(nuevaPagina);
      this.cargarTransacciones();
    }
  }

  calcularLimiteSuperior(): number {
    if (!this.pageData()) return 0;
    return Math.min((this.paginaActual() + 1) * this.tamanioPagina(), this.pageData()!.totalElements);
  }

  async eliminarMovimiento(id: number): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: '\u00bfEliminar permanentemente?',
      message: '\u00bfEliminar permanentemente? Esta acci\u00f3n no se puede deshacer. Los saldos se recalcular\u00e1n autom\u00e1ticamente.',
      type: 'danger'
    });

    if (confirmed) {
      this.finanzasService.eliminarTransaccion(id).subscribe({
        next: () => {
          this.cargarTransacciones();
          this.cargarCuentasYCategorias();
          this.toastService.success('Movimiento eliminado correctamente');
        },
        error: (err) => {
          this.toastService.error('Error al eliminar: ' + (mensajeDeError(err, 'Desconocido')));
        }
      });
    }
  }

  // --- Modal Logic ---
  @HostListener('window:kaptal-movimiento-guardado')
  refrescarTrasRegistro(): void { this.cargarTransacciones(); this.cargarCuentasYCategorias(); }
  @HostListener('window:kaptal-abrir-registro-manual', ['$event'])
  abrirRegistroManual(event?: Event): void {
    if (this.submitting() || this.movimientoIncierto()) {
      this.modalAbierto.set(true);
      return;
    }
    const borrador = (event as CustomEvent<Partial<TransaccionPayload>> | undefined)?.detail;
    const tipo = borrador?.tipo;
    this.abrirModal(tipo === 'INGRESO' || tipo === 'TRANSFERENCIA' ? tipo : 'GASTO');
    if (borrador) {
      this.formMonto = borrador.monto ?? null;
      this.formCuentaId = borrador.cuentaId ?? this.formCuentaId;
      this.formCuentaDestinoId = borrador.cuentaDestinoId ?? this.formCuentaDestinoId;
      this.formCategoriaId = borrador.categoriaId ?? this.formCategoriaId;
      this.formFecha = borrador.fecha ?? this.formFecha;
      this.formNotas = borrador.notas ?? '';
      this.formListaId = borrador.listaId ?? this.formListaId; this.formEtiquetas = (borrador.etiquetas ?? []).map(e => '#' + e).join(' ');
      this.formDescripcion = borrador.descripcion ?? '';
      this.formTasaCambio = borrador.tasaCambio ?? null;
    }
    requestAnimationFrame(() => document.getElementById('monto')?.focus());
  }

  abrirCapturaChat(): void {
    window.dispatchEvent(new Event('kaptal-abrir-registro-rapido'));
  }

  abrirModal(tipo: TipoTransaccion): void {
    if (this.submitting()) return;
    if (this.movimientoIncierto() && this.movimientoPendiente) {
      this.modalError.set('Hay un movimiento pendiente de confirmar. Reintenta para evitar duplicados.');
      this.modalAbierto.set(true);
      return;
    }
    this.claveMovimiento = crearIdSolicitud();
    this.movimientoPendiente = null;
    this.modoEdicion.set(false);
    this.transaccionEditando.set(null);
    this.formTipo.set(tipo);
    this.formMonto = null;
    this.formNotas = ''; this.formEtiquetas = ''; this.formListaId = this.contextoLista.activaId();
    this.formDescripcion = '';
    this.movimientoRecurrente = false;
    this.esCompraMsi = false;
    this.formMsi = null;
    this.frecuenciaRecurrencia = 'MENSUAL';
    this.siguienteFechaRecurrencia = '';
    this.formFecha = this.fechaLocalIso(new Date());
    this.modalError.set(null);

    const lista = this.cuentas();
    this.formCuentaId = null;
    this.formTasaCambio = null;
    this.formCuentaDestinoId = null;
    if (lista.length > 0) {
      this.formCuentaId = lista[0].id;
      // El destino se recalcula desde la cuenta ya mise: si el origen es una tarjeta,
      // la lista se queda sin tarjetas de crédito.
      this.formCuentaDestinoId = this.cuentasDestinoDisponibles()[0]?.id ?? null;
    }

    const cats = this.categoriasModal();
    // Se abre con la categoria de la ultima vez de ese tipo, si sigue existiendo;
    // si no hay memoria, o apunta a algo que ya no esta, cae a la primera.
    const preferida = this.categoriaPreferida.preferida(tipo);
    this.formCategoriaId = cats.some(categoria => categoria.id === preferida)
      ? preferida
      : (cats[0]?.id ?? null);
    this.modalAbierto.set(true);
  }

  abrirModalEditar(transaccion: Transaccion): void {
    if (!this.puedeModificar(transaccion)) { this.toastService.error('Cada persona edita sus propios movimientos.'); return; }
    if (this.submitting() || this.movimientoIncierto()) return;
    if (transaccion.cuentaId == null
        || (transaccion.tipo === 'TRANSFERENCIA' && transaccion.cuentaDestinoId == null)) {
      this.toastService.error('No se puede editar un movimiento cuyo historial pertenece a una cuenta eliminada.');
      return;
    }

    if (transaccion.tipo === 'SALDO_INICIAL') return;
    this.modoEdicion.set(true);
    this.transaccionEditando.set(transaccion);
    this.formTipo.set(transaccion.tipo);
    this.formMonto = transaccion.monto;
    this.movimientoRecurrente = false;
    this.esCompraMsi = false;
    this.formMsi = null;
    this.formCuentaId = transaccion.cuentaId;
    this.formCuentaDestinoId = transaccion.cuentaDestinoId ?? null;
    this.formTasaCambio = transaccion.tasaCambio ?? null;
    this.formCategoriaId = transaccion.categoriaId ?? null;
    this.formFecha = transaccion.fecha;
    this.formNotas = transaccion.notas ?? '';
    this.formListaId = transaccion.listaId ?? this.contextoLista.activaId(); this.formEtiquetas = (transaccion.etiquetas ?? []).map(e => '#' + e).join(' ');
    this.formDescripcion = transaccion.descripcion ?? '';
    this.formModoEdicion = 'SOLO_ESTA';
    this.formFechaFinRecurrencia = '';
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.submitting()) return;
    this.modalAbierto.set(false);
    this.modalError.set(null);
    this.modoEdicion.set(false);
    this.transaccionEditando.set(null);
    if (this.route.snapshot.queryParamMap.has('editar')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editar: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  cambiarTipoModal(tipo: TipoTransaccion): void {
    if (this.submitting() || this.movimientoIncierto()) return;
    this.formTipo.set(tipo);
    if (tipo === 'TRANSFERENCIA') {
      this.movimientoRecurrente = false;
    }
    if (tipo !== 'GASTO') this.limpiarMsi();
    // Cambiar de pestaña tambien cambia de tipo, asi que la memoria es la de ese tipo.
    const cats = this.categoriasModal();
    const preferida = this.categoriaPreferida.preferida(tipo);
    this.formCategoriaId = cats.some(categoria => categoria.id === preferida)
      ? preferida
      : (cats[0]?.id ?? null);
    if (tipo === 'TRANSFERENCIA') {
      this.formCuentaDestinoId = this.cuentasDestinoDisponibles()[0]?.id ?? null;
    } else {
      this.formCuentaDestinoId = null;
      this.formTasaCambio = null;
    }
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
      fecha.setDate(1);
      fecha.setFullYear(fecha.getFullYear() + 1);
      const ultimoDia = new Date(fecha.getFullYear(), mes, 0).getDate();
      fecha.setDate(Math.min(dia, ultimoDia));
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

  guardarMovimiento(): void {
    if (this.submitting()) return;
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

    let etiquetas: string[];
    try { etiquetas = parsearEtiquetas(this.formEtiquetas); } catch (error) { this.modalError.set((error as Error).message); return; }
    const transaccionEditar = this.transaccionEditando();
    const esRecurrenteEnEdicion = this.modoEdicion() && transaccionEditar?.plantillaId != null;
    const payload: TransaccionPayload = this.movimientoPendiente ?? {
      ...(this.formListaId == null ? {} : { listaId: this.formListaId }),
      etiquetas,
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
      descripcion: this.formDescripcion.trim() || undefined,
      notas: this.formNotas.trim() || null,
      frecuenciaRecurrencia: this.movimientoRecurrente ? this.frecuenciaRecurrencia : null,
      siguienteFechaRecurrencia: this.movimientoRecurrente ? this.siguienteFechaRecurrencia : null,
      msi: this.esCompraMsi ? this.formMsi : null,
      ...(esRecurrenteEnEdicion ? { modoEdicionRecurrencia: this.formModoEdicion } : {}),
      ...(this.movimientoRecurrente && this.formFechaFinRecurrencia
        ? { fechaFinRecurrencia: this.formFechaFinRecurrencia }
        : {})
    };

    this.submitting.set(true);
    this.modalError.set(null);

    const transaccion = this.transaccionEditando();
    if (!transaccion) {
      this.claveMovimiento ||= crearIdSolicitud();
      this.movimientoPendiente = payload;
    }
    const request = transaccion
      ? this.finanzasService.actualizarTransaccion(transaccion.id, payload)
      : this.finanzasService.crearTransaccion(payload, this.claveMovimiento);
    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.movimientoIncierto.set(false);
        this.movimientoPendiente = null;
        this.cerrarModal();
        this.cargarTransacciones();
        this.cargarCuentasYCategorias();
        this.toastService.success(transaccion ? 'Movimiento actualizado correctamente.' : 'Movimiento registrado correctamente.');
      },
      error: (err) => {
        this.submitting.set(false);
        const incierto = !transaccion && (err.status === 0 || err.status >= 500);
        this.movimientoIncierto.set(incierto);
        if (!incierto) this.movimientoPendiente = null;
        this.modalError.set(incierto ? 'No se pudo confirmar el guardado. Reintenta el mismo movimiento; no se duplicará.'
          : mensajeDeError(err, 'Error al guardar la transacción'));
      }
    });
  }
}

function normalizarTextoCsv(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-MX');
}

function normalizarEncabezadoCsv(valor: string): string {
  return normalizarTextoCsv(valor).replace(/\s+/g, ' ');
}

function parsearFechaCsv(valor: string): string | null {
  let anio: number;
  let mes: number;
  let dia: number;
  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (iso) {
    anio = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else if (local) {
    dia = Number(local[1]);
    mes = Number(local[2]);
    anio = Number(local[3]);
  } else {
    return null;
  }
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return `${anio.toString().padStart(4, '0')}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

function parsearMontoCsv(valor: string): number | null {
  let limpio = valor.replace(/[\s\u00a0]/g, '').replace(/[^\d,.-]/g, '');
  if (!limpio || !/^-?\d[\d.,]*$/.test(limpio)) return null;
  const coma = limpio.lastIndexOf(',');
  const punto = limpio.lastIndexOf('.');
  if (coma >= 0 && punto >= 0) {
    limpio = coma > punto ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/,/g, '');
  } else if (coma >= 0) {
    limpio = limpio.replace(',', '.');
  }
  const monto = Number(limpio);
  if (!Number.isFinite(monto) || Math.abs(monto) > 9_999_999_999_999.99) return null;
  if (Math.abs(monto * 100 - Math.round(monto * 100)) > 0.00001) return null;
  return monto;
}

function parsearRegistrosCsv(contenido: string): string[][] {
  const delimitador = detectarDelimitadorCsv(contenido);
  const registros: string[][] = [];
  let registro: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let indice = 0; indice < contenido.length; indice++) {
    const caracter = contenido[indice];
    if (caracter === '"') {
      if (entreComillas && contenido[indice + 1] === '"') {
        campo += '"';
        indice++;
      } else if (entreComillas) {
        entreComillas = false;
      } else if (campo.length === 0) {
        entreComillas = true;
      } else {
        campo += caracter;
      }
    } else if (caracter === delimitador && !entreComillas) {
      registro.push(campo);
      campo = '';
    } else if ((caracter === '\n' || caracter === '\r') && !entreComillas) {
      if (caracter === '\r' && contenido[indice + 1] === '\n') indice++;
      registro.push(campo);
      if (registro.some(valor => valor.trim() !== '')) registros.push(registro);
      registro = [];
      campo = '';
    } else {
      campo += caracter;
    }
  }
  if (entreComillas) throw new Error('El archivo contiene comillas sin cerrar.');
  registro.push(campo);
  if (registro.some(valor => valor.trim() !== '')) registros.push(registro);
  return registros;
}

function detectarDelimitadorCsv(contenido: string): ',' | ';' {
  let entreComillas = false;
  let comas = 0;
  let puntosYComas = 0;
  for (let indice = 0; indice < contenido.length; indice++) {
    const caracter = contenido[indice];
    if (caracter === '"') {
      if (entreComillas && contenido[indice + 1] === '"') indice++;
      else entreComillas = !entreComillas;
    } else if (!entreComillas && (caracter === '\n' || caracter === '\r')) {
      break;
    } else if (!entreComillas && caracter === ',') {
      comas++;
    } else if (!entreComillas && caracter === ';') {
      puntosYComas++;
    }
  }
  return puntosYComas > comas ? ';' : ',';
}
