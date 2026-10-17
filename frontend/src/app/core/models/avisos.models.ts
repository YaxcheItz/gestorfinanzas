export type ClaseAviso = 'COMPRA' | 'INGRESO' | 'DEVOLUCION' | 'TRANSFERENCIA' | 'PAGO_TARJETA' | 'AUTORIZACION' | 'SIN_CLASIFICAR';
export interface DatosAviso {
  cuentaId: number | null; cuentaDestinoId?: number | null; categoriaId?: number | null;
  listaId?: number | null; tipo: 'GASTO' | 'INGRESO' | 'TRANSFERENCIA';
  monto: number | null; tasaCambio?: number | null; fecha: string; descripcion: string; notas?: string;
}
export interface AvisoFinanciero {
  id: string; origen: string; resumen: string; clase: ClaseAviso;
  estado: 'PENDIENTE' | 'REGISTRADO' | 'DESCARTADO'; moneda: string; datos: DatosAviso | null;
  version: number; creadoEn: string; transaccionId: number | null; coincidencias: number[];
}
