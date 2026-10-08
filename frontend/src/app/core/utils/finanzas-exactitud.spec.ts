import { describe, expect, it } from 'vitest';
import { creditoDisponibleCuenta } from './cuenta-financiera';
import { fechaFinanciera } from './fecha-financiera';

describe('exactitud financiera', () => {
  it('descuenta las cuotas MSI retenidas del crédito disponible', () => {
    expect(creditoDisponibleCuenta({ tipo: 'CREDITO', saldoActual: -33.33,
      limiteCredito: 1000, limiteRetenido: 66.67 })).toBe(900);
  });
  it('conserva compatibilidad con cuentas sin retención', () => {
    expect(creditoDisponibleCuenta({ tipo: 'CREDITO', saldoActual: -100, limiteCredito: 1000 })).toBe(900);
  });
  it('usa el día de México cuando UTC ya cambió de fecha', () => {
    expect(fechaFinanciera(new Date('2026-10-07T02:00:00Z'))).toBe('2026-10-06');
  });
});
