import { Cuenta } from '../models/finanzas.models';

export function deudaActualCuenta(cuenta: Pick<Cuenta, 'tipo' | 'saldoActual'>): number {
  return cuenta.tipo === 'CREDITO' ? Math.max(0, -cuenta.saldoActual) : cuenta.saldoActual;
}

export function creditoDisponibleCuenta(
  cuenta: Pick<Cuenta, 'tipo' | 'saldoActual' | 'limiteCredito'>
): number | null {
  if (cuenta.tipo !== 'CREDITO' || cuenta.limiteCredito == null) return null;
  return Math.min(cuenta.limiteCredito, Math.max(0, cuenta.limiteCredito + cuenta.saldoActual));
}

/**
 * Resumen de una cuenta para los `<option>` de los selectores.
 *
 * Este archivo es puro y no puede inyectar `PrivacidadService`, asi que quien
 * llama pasa el valor de la preferencia. Sin ese argumento el comportamiento es
 * el de siempre, con las cifras a la vista.
 */
export function resumenCuentaSelector(cuenta: Cuenta, ocultarMontos = false): string {
  if (ocultarMontos) return '•••';

  const formatoMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: cuenta.moneda,
    maximumFractionDigits: 2
  });

  if (cuenta.tipo !== 'CREDITO') {
    return formatoMoneda.format(cuenta.saldoActual);
  }

  const deuda = formatoMoneda.format(deudaActualCuenta(cuenta));
  const disponible = creditoDisponibleCuenta(cuenta);
  return disponible == null
    ? `Deuda ${deuda} · configura el límite`
    : `Disponible ${formatoMoneda.format(disponible)} · deuda ${deuda}`;
}
