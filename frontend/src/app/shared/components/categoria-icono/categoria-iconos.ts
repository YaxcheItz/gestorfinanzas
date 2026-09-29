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
  const original = icono?.trim();
  if (!original) return tipo === 'INGRESO' ? 'trending-up' : 'receipt';
  if (esEmojiCategoria(original)) return original;
  const codigo = original.toLowerCase();
  const alias = ALIAS_ICONOS_ANTERIORES[codigo] ?? codigo;
  return ICONOS_CATEGORIA.some(opcion => opcion.codigo === alias) ? alias : 'receipt';
}

export function esEmojiCategoria(icono: string | null | undefined): boolean {
  const valor = icono?.trim();
  return Boolean(valor && valor.length <= 16 && /\p{Extended_Pictographic}/u.test(valor));
}

export function colorIconoCategoria(icono: string | null | undefined, tipo: string): string {
  const codigo = normalizarIconoCategoria(icono, tipo);
  if (esEmojiCategoria(codigo)) return 'inherit';
  const colores: Record<string, string> = {
    'utensils': '#ef4444',        // Rojo (Comida)
    'house': '#3b82f6',           // Azul (Hogar)
    'car': '#f59e0b',            // Ámbar (Auto)
    'bus-front': '#6366f1',       // Indigo (Transporte)
    'heart-pulse': '#ec4899',    // Rosa (Salud)
    'coffee': '#8b5cf6',          // Violeta (Ocio)
    'shopping-cart': '#f97316',   // Naranja (Compras)
    'receipt': '#64748b',         // Slate (Servicios)
    'briefcase-business': '#0f172a', // Oscuro (Trabajo)
    'trending-up': '#10b981',     // Esmeralda (Inversión)
    'gift': '#f43f5e',            // Rosa fuerte (Regalos)
    'graduation-cap': '#3b82f6', // Azul (Educación)
    'plane': '#06b6d4',          // Cyan (Viajes)
    'paw-print': '#84cc16',       // Lima (Mascotas)
    'wallet': '#10b981',         // Esmeralda (Ahorro)
    'fuel': '#facc15',           // Amarillo (Combustible)
    'circle-plus': '#10b981',    // Esmeralda (Otros ingresos)
  };
  return colores[codigo] || '#64748b';
}
