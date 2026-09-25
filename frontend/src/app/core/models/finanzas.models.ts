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
