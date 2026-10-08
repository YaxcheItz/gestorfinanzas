export type TipoReparto = 'IGUAL' | 'PORCENTAJE' | 'EXACTO';

/**
 * Cada persona lleva sus totales ya resueltos por el servidor en vez de dejar que
 * la pantalla los calcule. Es lo que hace que la cifra que ve el usuario sea
 * siempre la misma que guardó el backend, y no un redondeo distinto hecho en el
 * navegador.
 */
export interface ParejaMiembro {
  id: number;
  nombre: string;
  email: string | null;
  aportado: number;
  consumido: number;
  pagado: number;
  cobrado: number;
  saldo: number;
}

export interface ParejaResumen {
  fondoDisponible: number;
  totalAportado: number;
  totalGastado: number;
  cantidadAportes: number;
  cantidadGastos: number;
  cantidadPagos: number;
  idQuienDebe: number | null;
  montoDeuda: number;
}

export interface ParejaParte {
  usuarioId: number;
  usuarioNombre: string;
  monto: number;
  porcentaje: number;
}

export interface ParejaAporte {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  monto: number;
  moneda: string;
  fecha: string;
  notas: string | null;
  fechaCreacion: string;
}

export interface ParejaGasto {
  id: number;
  pagadoPorId: number;
  pagadoPorNombre: string;
  monto: number;
  moneda: string;
  fecha: string;
  descripcion: string;
  tipoReparto: TipoReparto | null;
  repartos: ParejaParte[];
  miParte: number;
  fechaCreacion: string;
}

export interface ParejaPago {
  id: number;
  pagadorId: number;
  pagadorNombre: string;
  beneficiarioId: number;
  beneficiarioNombre: string;
  monto: number;
  moneda: string;
  fecha: string;
  notas: string | null;
  fechaCreacion: string;
  registradoPorId?: number | null;
}

export interface Pareja {
  id: number;
  moneda: string;
  fechaCreacion: string;
  yo: ParejaMiembro;
  pareja: ParejaMiembro;
  resumen: ParejaResumen;
  aportes: ParejaAporte[];
  gastos: ParejaGasto[];
  pagos: ParejaPago[];
  activa?: boolean;
}

export interface InvitacionPareja {
  id: number;
  remitenteNombre: string;
  remitenteEmail: string;
  destinatarioEmail: string;
  moneda: string;
  recibida: boolean;
  fechaCreacion: string;
}

export interface HistorialPareja {
  id: number;
  nombrePareja: string;
  moneda: string;
  importado: boolean;
  fechaCreacion: string;
}

export interface ParejaCrearPayload {
  email: string;
}

export interface AportacionParejaPayload {
  monto: number;
  fecha: string;
  notas?: string | null;
}

export interface GastoParejaPayload {
  monto: number;
  fecha: string;
  descripcion: string;
  tipoReparto: TipoReparto;
  porcentajePareja?: number | null;
  montoExactoPareja?: number | null;
}

export interface PagoParejaPayload {
  monto: number;
  fecha: string;
  pagadorId: number;
  beneficiarioId: number;
  notas?: string | null;
}
