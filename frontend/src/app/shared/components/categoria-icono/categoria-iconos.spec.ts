import { normalizarIconoCategoria } from './categoria-iconos';

describe('normalizarIconoCategoria', () => {
  it('maps legacy seed icons into the supported Lucide catalogue', () => {
    expect(normalizarIconoCategoria('home', 'GASTO')).toBe('house');
    expect(normalizarIconoCategoria('briefcase', 'INGRESO')).toBe('briefcase-business');
    expect(normalizarIconoCategoria('plus-circle', 'INGRESO')).toBe('circle-plus');
  });

  it('uses safe defaults for empty or unknown stored values', () => {
    expect(normalizarIconoCategoria(null, 'GASTO')).toBe('receipt');
    expect(normalizarIconoCategoria('', 'INGRESO')).toBe('trending-up');
    expect(normalizarIconoCategoria('<svg onload=alert(1)>', 'GASTO')).toBe('receipt');
  });
});
