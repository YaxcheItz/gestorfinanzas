import { describe, expect, it } from 'vitest';
import { extraerEtiquetasCaptura, parsearEtiquetas } from './etiquetas';
describe('Etiquetas financieras', () => {
  it('normaliza unicode, elimina duplicados y acepta separadores', () => {
    expect(parsearEtiquetas('#VISA, viaje #visa \uff23\uff21\uff26\uff25')).toEqual(['visa','viaje','cafe']);
  });
  it('rechaza caracteres, etiquetas largas y mas de ocho entradas', () => {
    for (const value of ['#', 'visa!', 'a'.repeat(33), Array(9).fill('viaje').join(' ')]) expect(() => parsearEtiquetas(value)).toThrow();
    expect(parsearEtiquetas('')).toEqual([]);
  });
  it('separa etiquetas expresas y hashtags del concepto', () => {
    expect(extraerEtiquetasCaptura('Pague 50 en cafe con etiqueta viaje #trabajo')).toEqual({texto:'Pague 50 en cafe',etiquetas:['viaje','trabajo']});
    expect(extraerEtiquetasCaptura('Pague 50 con la etiqueta #viaje')).toEqual({texto:'Pague 50',etiquetas:['viaje']});
  });
});
