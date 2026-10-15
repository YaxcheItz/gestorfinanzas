package com.gestionfinanzas.service;

import java.text.Normalizer;
import java.util.*;

public final class EtiquetasFinancieras {
    private EtiquetasFinancieras() {}
    public static Set<String> normalizar(Collection<String> etiquetas) {
        if (etiquetas == null) return new LinkedHashSet<>();
        if (etiquetas.size() > 8) throw new IllegalArgumentException("Usa hasta 8 etiquetas por movimiento.");
        Set<String> resultado = new LinkedHashSet<>();
        for (String etiqueta : etiquetas) {
            if (etiqueta == null) throw new IllegalArgumentException("La etiqueta no es válida.");
            String valor = Normalizer.normalize(etiqueta.trim(), Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).replaceFirst("^#", "");
            if (!valor.matches("[\\p{L}\\p{N}][\\p{L}\\p{N}_-]{0,31}")) {
                throw new IllegalArgumentException("Las etiquetas admiten hasta 32 letras, números, guion o guion bajo.");
            }
            resultado.add(valor);
        }
        return resultado;
    }
}
