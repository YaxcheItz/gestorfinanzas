export function parsearEtiquetas(texto: string): string[] {
  const partes = texto.trim() ? texto.trim().split(/[\s,]+/) : [];
  if (partes.length > 8) throw new Error('Usa hasta 8 etiquetas por movimiento.');
  return [...new Set(partes.map(parte => {
    const etiqueta = parte.normalize('NFKC').replace(/^#/, '').toLowerCase();
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u.test(etiqueta)) throw new Error('Cada etiqueta admite hasta 32 letras, números, guion o guion bajo.');
    return etiqueta;
  }))];
}

/** Extrae etiquetas expresas, sin interpretar el resto del concepto. */
export function extraerEtiquetasCaptura(texto: string): { texto: string; etiquetas: string[] } {
  const nombres: string[] = [];
  const sinExplicitas = texto.replace(/(?<![\p{L}\p{N}_])(?:con\s+)?(?:la\s+)?etiqueta\s+#?([\p{L}\p{N}][\p{L}\p{N}_-]*)/giu, (_, nombre: string) => { nombres.push(nombre); return ' '; });
  const sinHashtags = sinExplicitas.replace(/(?<![\p{L}\p{N}_])#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu, (_, nombre: string) => { nombres.push(nombre); return ' '; });
  return {texto: sinHashtags.replace(/\s+/g, ' ').trim(), etiquetas: parsearEtiquetas(nombres.join(' '))};
}
