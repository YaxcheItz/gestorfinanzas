import casos from '../../../../../backend/src/test/resources/calendario-bancario-mx-casos.json';
import { ajustarPagoMx } from './calendario-bancario-mx';

describe('calendario bancario MX compartido con Java', () => {
  for (const caso of casos) {
    it(`ajusta ${caso.base} a ${caso.fecha}, verificado=${caso.verificado}`, () => {
      const base = new Date(`${caso.base}T00:00:00`);
      const copia = base.getTime();
      const ajuste = ajustarPagoMx(base);
      expect(ajuste.fecha).toEqual(new Date(`${caso.fecha}T00:00:00`));
      expect(ajuste.verificado).toBe(caso.verificado);
      expect(base.getTime()).toBe(copia);
    });
  }
});
