import { Categoria, TipoTransaccion } from '../models/finanzas.models';

/** Preferencia para un ingreso nuevo; no modifica categorias ya elegidas. */
export function salarioPredeterminado(tipo: TipoTransaccion, categorias: Categoria[]): number | null {
  if (tipo !== 'INGRESO') return null;
  const salarios = categorias.filter(c => c.activo && c.tipo === 'INGRESO' && c.nombre.trim().toLocaleLowerCase() === 'salario');
  const personales = salarios.filter(c => c.esPersonalizada);
  return salarios.length === 1 ? salarios[0].id : personales.length === 1 ? personales[0].id : null;
}
