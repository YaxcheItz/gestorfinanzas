export type TipoCuenta = 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'AHORRO' | 'INVERSION';
export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
  saldoActual: number;
  moneda: string;
  descripcion?: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface CuentaPayload {
  nombre: string;
  tipo: TipoCuenta;
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
}

export interface Transaccion {
  id: number;
  cuentaId: number;
  cuentaNombre: string;
  cuentaDestinoId?: number | null;
  cuentaDestinoNombre?: string | null;
  categoriaId?: number | null;
  categoriaNombre?: string | null;
  categoriaIcono?: string | null;
  categoriaColor?: string | null;
  tipo: TipoTransaccion;
  monto: number;
  fecha: string;
  descripcion: string;
  notas?: string | null;
  fechaCreacion: string;
}

export interface TransaccionPayload {
  cuentaId: number;
  cuentaDestinoId?: number | null;
  categoriaId?: number | null;
  tipo: TipoTransaccion;
  monto: number;
  fecha: string;
  descripcion: string;
  notas?: string | null;
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
}

export interface DashboardGastoCategoria {
  categoriaId: number | null;
  categoriaNombre: string;
  categoriaColor?: string | null;
  monto: number;
}

export interface DashboardMes {
  anio: number;
  mes: number;
  ingresos: number;
  gastos: number;
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

