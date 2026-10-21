export type AccionCaptura = 'nuevo-gasto' | 'nuevo-ingreso' | 'dictar';

/** Solo acciones locales conocidas; nunca aceptar una URL de retorno externa. */
export function accionCaptura(valor: unknown): AccionCaptura | null {
  return valor === 'nuevo-gasto' || valor === 'nuevo-ingreso' || valor === 'dictar' ? valor : null;
}
