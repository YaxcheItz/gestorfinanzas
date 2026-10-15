import casos from '../../../../../backend/src/test/resources/periodos.json';
import { PeriodoConfig, PERIODO_MENSUAL, resolverPeriodo, desplazarPeriodo, desplazarRangoLibre, validarPeriodo, validarRangoPeriodo, fechaCivilFinanciera } from './periodo-financiero';

describe('calendario financiero compartido con Java', () => {
  for (const caso of casos) {
    it(caso.nombre, () => expect(resolverPeriodo(caso.config as PeriodoConfig, caso.referencia)).toEqual(caso.esperado));
  }
  it('retrocede y avanza sin perder el inicio 31 después de febrero', () => {
    const config = { ...PERIODO_MENSUAL, diaInicio: 31 };
    const marzo = resolverPeriodo(config, '2024-03-31');
    const febrero = desplazarPeriodo(config, marzo, -1);
    expect(febrero).toEqual({ desde: '2024-02-29', hasta: '2024-03-30' });
    expect(desplazarPeriodo(config, febrero, 1)).toEqual(marzo);
  });
  it('rechaza días repetidos, fracciones y fechas inexistentes', () => {
    for (const config of [
      { ...PERIODO_MENSUAL, tipo: 'QUINCENA', diaInicio: 28, diaQuincena: 31 },
      { ...PERIODO_MENSUAL, tipo: 'QUINCENA', diaInicio: 16, diaQuincena: 16 },
      { ...PERIODO_MENSUAL, diaInicio: 1.5 },
      { ...PERIODO_MENSUAL, ancla: '2025-02-29' }
    ]) expect(() => validarPeriodo(config as PeriodoConfig)).toThrow();
    expect(() => validarRangoPeriodo({ desde: '2026-02-31', hasta: '2026-03-01' })).toThrow();
  });
  it('mueve el rango libre por su número inclusivo de días', () => {
    expect(desplazarRangoLibre({ desde: '2024-02-28', hasta: '2024-03-01' }, -1)).toEqual({ desde: '2024-02-25', hasta: '2024-02-27' });
  });
  it('el cambio de día se rige por Ciudad de México, no UTC ni el navegador', () => {
    expect(fechaCivilFinanciera(new Date('2026-01-01T05:59:59Z'))).toBe('2025-12-31');
    expect(fechaCivilFinanciera(new Date('2026-01-01T06:00:00Z'))).toBe('2026-01-01');
  });
});
