/** Día civil de Kaptal, incluso si el navegador usa otra zona horaria. */
export function fechaFinanciera(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find(parte => parte.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}
