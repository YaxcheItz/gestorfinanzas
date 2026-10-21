import calendario from '../../../../../backend/src/main/resources/calendario-bancario-mx.json';

export interface AjustePagoMx { base: Date; fecha: Date; verificado: boolean; }

const anios: Record<string, string[]> = calendario.anios;

export function ajustarPagoMx(base: Date): AjustePagoMx {
  const fecha = new Date(base);
  while (anios[String(fecha.getFullYear())]) {
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6 && !anios[String(fecha.getFullYear())].includes(clave)) {
      return {base, fecha, verificado:true};
    }
    fecha.setDate(fecha.getDate()+1);
  }
  // No extender una fecha usando un calendario anual que todavía no se ha verificado.
  return {base, fecha:new Date(base), verificado:false};
}
