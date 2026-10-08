import { Cuenta } from '../models/finanzas.models';

/** Nombre legible para la cuenta de efectivo creada automáticamente en cuentas existentes. */
export function nombreCuentaVisible(nombre: string | null | undefined): string {
  return nombre === 'Billetera / Efectivo' ? 'Efectivo' : (nombre ?? '');
}

export function deudaActualCuenta(cuenta: Pick<Cuenta, 'tipo' | 'saldoActual'>): number {
  return cuenta.tipo === 'CREDITO' ? Math.max(0, -cuenta.saldoActual) : cuenta.saldoActual;
}

export function creditoDisponibleCuenta(
  cuenta: Pick<Cuenta, 'tipo' | 'saldoActual' | 'limiteCredito' | 'limiteRetenido'>
): number | null {
  if (cuenta.tipo !== 'CREDITO' || cuenta.limiteCredito == null) return null;
  return Math.min(cuenta.limiteCredito, Math.max(0, cuenta.limiteCredito + cuenta.saldoActual - (cuenta.limiteRetenido ?? 0)));
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
  if (cuenta.saldoLocalDesactualizado) return 'Saldo no actualizado';

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
