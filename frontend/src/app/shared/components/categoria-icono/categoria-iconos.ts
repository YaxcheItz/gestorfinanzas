export const ICONOS_CATEGORIA = [
  { codigo: 'utensils', nombre: 'Alimentación' },
  { codigo: 'house', nombre: 'Vivienda' },
  { codigo: 'car', nombre: 'Auto' },
  { codigo: 'bus-front', nombre: 'Transporte público' },
  { codigo: 'heart-pulse', nombre: 'Salud' },
  { codigo: 'coffee', nombre: 'Ocio' },
  { codigo: 'shopping-cart', nombre: 'Compras' },
  { codigo: 'receipt', nombre: 'Servicios' },
  { codigo: 'briefcase-business', nombre: 'Trabajo' },
  { codigo: 'trending-up', nombre: 'Inversión' },
  { codigo: 'gift', nombre: 'Regalos' },
  { codigo: 'graduation-cap', nombre: 'Educación' },
  { codigo: 'plane', nombre: 'Viajes' },
  { codigo: 'paw-print', nombre: 'Mascotas' },
  { codigo: 'wallet', nombre: 'Ahorro' },
  { codigo: 'fuel', nombre: 'Combustible' },
  { codigo: 'circle-plus', nombre: 'Otros ingresos' }
] as const;

const ALIAS_ICONOS_ANTERIORES: Record<string, string> = {
  home: 'house',
  'plus-circle': 'circle-plus',
  briefcase: 'briefcase-business'
};

export function normalizarIconoCategoria(icono: string | null | undefined, tipo: string): string {
  const codigo = icono?.trim().toLowerCase();
  if (!codigo) return tipo === 'INGRESO' ? 'trending-up' : 'receipt';
  const alias = ALIAS_ICONOS_ANTERIORES[codigo] ?? codigo;
  return ICONOS_CATEGORIA.some(opcion => opcion.codigo === alias) ? alias : 'receipt';
}
