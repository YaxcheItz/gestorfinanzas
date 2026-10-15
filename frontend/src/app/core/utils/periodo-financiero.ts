export type TipoPeriodo = 'MES' | 'SEMANA' | 'CATORCENA' | 'QUINCENA' | 'ANIO' | 'TODO' | 'HOY';
export interface PeriodoConfig { tipo: TipoPeriodo; ancla: string; diaInicio: number; diaQuincena: number; }
export interface RangoPeriodo { desde: string; hasta: string; }
export const PERIODO_MENSUAL: PeriodoConfig = { tipo: 'MES', ancla: '2026-01-05', diaInicio: 1, diaQuincena: 16 };
const DIA = 86_400_000;
const fecha = (valor: string) => new Date(`${valor}T00:00:00Z`);
const iso = (valor: Date) => valor.toISOString().slice(0, 10);
export const sumarDiasPeriodo = (valor: string, dias: number) => iso(new Date(fecha(valor).getTime() + dias * DIA));

export function fechaCivilFinanciera(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
  const parte = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export function validarRangoPeriodo(rango: RangoPeriodo): RangoPeriodo {
  for (const valor of [rango.desde, rango.hasta]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(fecha(valor).getTime()) || iso(fecha(valor)) !== valor
        || valor < '2000-01-01' || valor > '2100-12-31') throw new Error('Elige fechas válidas entre 2000 y 2100.');
  }
  if (rango.desde > rango.hasta) throw new Error('La fecha inicial debe ser anterior a la final.');
  return rango;
}

export function validarPeriodo(config: PeriodoConfig): PeriodoConfig {
  validarRangoPeriodo({ desde: config.ancla, hasta: config.ancla });
  if (!['MES', 'SEMANA', 'CATORCENA', 'QUINCENA', 'ANIO', 'TODO', 'HOY'].includes(config.tipo)
      || !Number.isInteger(config.diaInicio) || config.diaInicio < 1 || config.diaInicio > 31
      || !Number.isInteger(config.diaQuincena) || config.diaQuincena < 1 || config.diaQuincena > 31
      || (config.tipo === 'QUINCENA' && (config.diaInicio > 27 || config.diaQuincena <= config.diaInicio))) {
    throw new Error('Elige dos días distintos y ordenados; el primero debe estar entre 1 y 27.');
  }
  return { ...config };
}

/** Misma aritmética civil y fixtures que PeriodoFinanciero.java; UTC sólo evita cambios de horario. */
export function resolverPeriodo(config: PeriodoConfig, referencia: string): RangoPeriodo {
  validarPeriodo(config);
  validarRangoPeriodo({ desde: referencia, hasta: referencia });
  const actual = fecha(referencia), anio = actual.getUTCFullYear(), mes = actual.getUTCMonth();
  const dia = (desplazamiento: number, numero: number) => iso(new Date(Date.UTC(anio, mes + desplazamiento, Math.min(numero, new Date(Date.UTC(anio, mes + desplazamiento + 1, 0)).getUTCDate()))));
  let desde: string, siguiente: string;
  switch (config.tipo) {
    case 'TODO': return { desde: '2000-01-01', hasta: '2100-12-31' };
    case 'HOY': return { desde: referencia, hasta: referencia };
    case 'ANIO': return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    case 'SEMANA': case 'CATORCENA': {
      const dias = config.tipo === 'SEMANA' ? 7 : 14;
      const bloque = Math.floor((actual.getTime() - fecha(config.ancla).getTime()) / DIA / dias);
      desde = sumarDiasPeriodo(config.ancla, bloque * dias);
      siguiente = sumarDiasPeriodo(desde, dias); break;
    }
    case 'QUINCENA': {
      const primero = dia(0, config.diaInicio), segundo = dia(0, config.diaQuincena);
      if (referencia < primero) { desde = dia(-1, config.diaQuincena); siguiente = primero; }
      else if (referencia < segundo) { desde = primero; siguiente = segundo; }
      else { desde = segundo; siguiente = dia(1, config.diaInicio); }
      break;
    }
    default: {
      const desplazamiento = referencia < dia(0, config.diaInicio) ? -1 : 0;
      desde = dia(desplazamiento, config.diaInicio); siguiente = dia(desplazamiento + 1, config.diaInicio);
    }
  }
  return validarRangoPeriodo({ desde, hasta: sumarDiasPeriodo(siguiente, -1) });
}

export function desplazarPeriodo(config: PeriodoConfig, actual: RangoPeriodo, direccion: number): RangoPeriodo {
  if (config.tipo === 'TODO') return actual;
  return resolverPeriodo(config, sumarDiasPeriodo(direccion < 0 ? actual.desde : actual.hasta, direccion < 0 ? -1 : 1));
}

export function desplazarRangoLibre(actual: RangoPeriodo, direccion: number): RangoPeriodo {
  const dias = Math.round((fecha(actual.hasta).getTime() - fecha(actual.desde).getTime()) / DIA) + 1;
  return validarRangoPeriodo({ desde: sumarDiasPeriodo(actual.desde, dias * direccion), hasta: sumarDiasPeriodo(actual.hasta, dias * direccion) });
}
