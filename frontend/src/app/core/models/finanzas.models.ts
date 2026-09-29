export type TipoCuenta = 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'AHORRO' | 'INVERSION';
export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | 'SALDO_INICIAL';
export type FrecuenciaRecurrencia = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'ANUAL';

export const MONEDAS_DISPONIBLES = [
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'CAD', nombre: 'Dólar canadiense' },
  { codigo: 'EUR', nombre: 'Euro' },
  { codigo: 'GBP', nombre: 'Libra esterlina' }
] as const;

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
  institucionFinanciera?: string | null;
  cashbackPorcentaje?: number | null;
  cashbackLimiteMensual?: number | null;
  limiteCredito?: number | null;
  diaCorte?: number | null;
  diaPago?: number | null;
  saldoActual: number;
  moneda: string;
  descripcion?: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface CuentaPayload {
  nombre: string;
  tipo: TipoCuenta;
  institucionFinanciera?: string;
  cashbackPorcentaje?: number;
  cashbackLimiteMensual?: number;
  limiteCredito?: number;
  diaCorte?: number;
  diaPago?: number;
  saldoInicial?: number;
  moneda?: string;
  descripcion?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  tipo: TipoTransaccion;
  icono?: string;
  color?: string;
  esPersonalizada: boolean;
  activo: boolean;
}

export interface CategoriaPayload {
  nombre: string;
  tipo: 'INGRESO' | 'GASTO';
  icono?: string;
  color?: string;
}

export interface Transaccion {
  id: number;
  cuentaId: number | null;
  cuentaNombre: string;
  cuentaDestinoId?: number | null;
  cuentaDestinoNombre?: string | null;
  categoriaId?: number | null;
  categoriaNombre?: string | null;
  categoriaIcono?: string | null;
  categoriaColor?: string | null;
  tipo: TipoTransaccion;
  monto: number;
  montoDestino?: number | null;
  tasaCambio?: number | null;
  moneda: string;
  monedaDestino?: string | null;
  fecha: string;
  descripcion: string;
  notas?: string | null;
  cashbackAutomatico?: boolean;
  fechaCreacion: string;
}

export interface AuditoriaTransaccion {
  id: number;
  transaccionId: number;
  accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR';
  antes: Transaccion | null;
  despues: Transaccion | null;
  fechaEvento: string;
}

export type LadoContable = 'DEBE' | 'HABER';

export interface LineaAsientoContable {
  id: number;
  codigoCuenta: string;
  nombreCuenta: string;
  monto: number;
  moneda: string;
  lado: LadoContable;
  cuentaFinancieraId: number | null;
  categoriaId: number | null;
}

export interface AsientoContable {
  id: number;
  transaccionOrigenId: number;
  tipoEvento: 'CREACION' | 'SALDO_INICIAL' | 'ACTUALIZACION' | 'ELIMINACION' | 'BACKFILL';
  fechaOperacion: string;
  descripcion: string;
  tasaCambio: number | null;
  fechaCreacion: string;
  lineas: LineaAsientoContable[];
}

export interface ConciliacionMoneda {
  debe: number;
  haber: number;
  diferencia: number;
}

export interface ConciliacionCuenta {
  cuentaId: number;
  cuentaNombre: string;
  moneda: string;
  saldoOperativo: number;
  saldoLibroProyectado: number;
  diferencia: number;
}

export interface BackfillLibroDiario {
  movimientosEncontrados: number;
  yaContabilizados: number;
  pendientes: number;
  omitidos: number;
  procesados: number;
  pendientesDespues: number;
  conciliacion: Record<string, ConciliacionMoneda>;
  conciliacionCuentas: ConciliacionCuenta[];
  motivosOmitidos: Record<string, number>;
}

export interface TransaccionPayload {
  cuentaId: number;
  cuentaDestinoId?: number | null;
  categoriaId?: number | null;
  tipo: TipoTransaccion;
  monto: number;
  tasaCambio?: number | null;
  fecha: string;
  descripcion?: string;
  notas?: string | null;
  frecuenciaRecurrencia?: FrecuenciaRecurrencia | null;
  siguienteFechaRecurrencia?: string | null;
}

export interface PlantillaRecurrente {
  id: number;
  cuentaId: number;
  cuentaNombre: string;
  categoriaId: number | null;
  categoriaNombre: string | null;
  tipo: TipoTransaccion;
  monto: number;
  moneda: string;
  notas: string | null;
  frecuencia: FrecuenciaRecurrencia;
  siguienteFecha: string;
  activa: boolean;
}

export interface DashboardResumen {
  balanceTotal: number;
  ingresosMes: number;
  gastosMes: number;
  balanceMes: number;
  tasaAhorro: number;
  totalCuentas: number;
  mes: number;
  anio: number;
  ultimosMovimientos: Transaccion[];
  resumenPorMoneda: DashboardMonedaResumen[];
}

export interface DashboardMonedaResumen {
  moneda: string;
  balanceTotal: number;
  ingresosMes: number;
  gastosMes: number;
  balanceMes: number;
  tasaAhorro: number;
  totalCuentas: number;
}

export interface DashboardComparacionMoneda {
  moneda: string;
  ingresosActuales: number;
  gastosActuales: number;
  ingresosAnteriores: number;
  gastosAnteriores: number;
  variacionGastos: number;
  variacionGastosPorcentaje: number | null;
}

export interface DashboardComparacion {
  mes: number;
  anio: number;
  mesAnterior: number;
  anioAnterior: number;
  porMoneda: DashboardComparacionMoneda[];
}

export interface DashboardGastoCategoria {
  categoriaId: number | null;
  categoriaNombre: string;
  categoriaColor?: string | null;
  monto: number;
  moneda: string;
}

export interface DashboardMes {
  anio: number;
  mes: number;
  ingresos: number;
  gastos: number;
  moneda: string;
}

export interface DashboardAnalitica {
  gastosPorCategoria: DashboardGastoCategoria[];
  ultimosSeisMeses: DashboardMes[];
}

export type EstadoPresupuesto = 'NORMAL' | 'ALERTA' | 'EXCEDIDO';

export interface Presupuesto {
  id: number;
  categoriaId: number;
  categoriaNombre: string;
  categoriaIcono?: string | null;
  categoriaColor?: string | null;
  montoLimite: number;
  moneda: string;
  montoGastado: number;
  montoDisponible: number;
  porcentajeConsumido: number;
  mes: number;
  anio: number;
  estado: EstadoPresupuesto;
}

export interface PresupuestoPayload {
  categoriaId: number;
  montoLimite: number;
  moneda: string;
  mes: number;
  anio: number;
}

export interface PresupuestoResumen {
  mes: number;
  anio: number;
  totalPresupuestado: number;
  totalGastado: number;
  totalDisponible: number;
  porcentajeConsumidoGlobal: number;
  presupuestos: Presupuesto[];
  resumenPorMoneda: PresupuestoMonedaResumen[];
}

export interface PresupuestoMonedaResumen {
  moneda: string;
  totalPresupuestado: number;
  totalGastado: number;
  totalDisponible: number;
  porcentajeConsumido: number;
}

export interface TransaccionFiltro {
  tipo?: TipoTransaccion | '';
  cuentaId?: number | null;
  categoriaId?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  busqueda?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
