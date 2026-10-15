export function parsearEtiquetas(texto: string): string[] {
  const partes = texto.trim() ? texto.trim().split(/[\s,]+/) : [];
  if (partes.length > 8) throw new Error('Usa hasta 8 etiquetas por movimiento.');
  return [...new Set(partes.map(parte => {
    const etiqueta = parte.normalize('NFKC').replace(/^#/, '').toLowerCase();
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u.test(etiqueta)) throw new Error('Cada etiqueta admite hasta 32 letras, números, guion o guion bajo.');
    return etiqueta;
  }))];
}
