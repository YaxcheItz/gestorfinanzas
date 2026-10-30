package com.gestionfinanzas.repository.specification;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.model.entity.Transaccion;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class TransaccionSpecification {

    public static Specification<Transaccion> soloUsuario(Long usuarioId) {
        return (root, query, cb) -> cb.equal(root.get("usuario").get("id"), usuarioId);
    }

    public static Specification<Transaccion> conFiltros(Long usuarioId, TransaccionFiltroRequest filtro) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Aislamiento estricto de usuario (Seguridad Multi-inquilino)
            if (filtro != null && filtro.listaId() != null) {
                // El servicio autoriza la pertenencia antes de usar este alcance compartido.
                predicates.add(cb.equal(root.get("lista").get("id"), filtro.listaId()));
            } else predicates.add(cb.equal(root.get("usuario").get("id"), usuarioId));

            if (filtro == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            // 2. Filtro por Tipo de transacción
            if (filtro.moneda() != null) {
                var cuenta = root.join("cuenta", JoinType.LEFT);
                predicates.add(cb.equal(cb.coalesce(cuenta.get("moneda"), root.get("cuentaMonedaHistorica")), filtro.moneda()));
            }
            if (filtro.tipo() != null) {
                predicates.add(cb.equal(root.get("tipo"), filtro.tipo()));
            }

            if (filtro.id() != null) {
                predicates.add(cb.equal(root.get("id"), filtro.id()));
            }

            // 3. Filtro por Cuenta (Origen o Destino si es transferencia)
            if (filtro.cuentaId() != null) {
                Predicate esOrigen = cb.equal(root.get("cuenta").get("id"), filtro.cuentaId());
                Predicate esDestino = cb.equal(root.get("cuentaDestino").get("id"), filtro.cuentaId());
                predicates.add(cb.or(esOrigen, esDestino));
            }

            // 4. Filtro por Categoría (una o varias)
            Set<Long> categorias = new LinkedHashSet<>();
            if (filtro.categoriaId() != null) {
                categorias.add(filtro.categoriaId());
            }
            if (filtro.categoriaIds() != null) {
                filtro.categoriaIds().stream()
                        .filter(id -> id != null && id > 0)
                        .forEach(categorias::add);
            }
            if (!categorias.isEmpty()) {
                predicates.add(root.get("categoria").get("id").in(categorias));
            }
            if (filtro.sinCategoria()) {
                predicates.add(cb.isNull(root.get("categoria")));
            }

            // 5. Rango de Fechas
            if (filtro.fechaInicio() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("fecha"), filtro.fechaInicio()));
            }
            if (filtro.fechaFin() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("fecha"), filtro.fechaFin()));
            }

            // 6. Rango de monto
            if (filtro.montoMin() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("monto"), filtro.montoMin()));
            }
            if (filtro.montoMax() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("monto"), filtro.montoMax()));
            }

            if (filtro.autorId() != null) predicates.add(cb.equal(root.get("usuario").get("id"), filtro.autorId()));
            var etiquetas = new java.util.LinkedHashSet<>(com.gestionfinanzas.service.EtiquetasFinancieras.normalizar(filtro.etiquetas()));
            String texto = filtro.busqueda() == null ? "" : filtro.busqueda().trim();
            var hashtags = java.util.regex.Pattern.compile("(?:^|\\s)#([\\p{L}\\p{N}][\\p{L}\\p{N}_-]{0,31})(?=\\s|$)").matcher(texto);
            while (hashtags.find()) etiquetas.addAll(com.gestionfinanzas.service.EtiquetasFinancieras.normalizar(List.of(hashtags.group(1))));
            texto = hashtags.replaceAll(" ").trim().toLowerCase(java.util.Locale.ROOT);
            if (etiquetas.size() > 8) throw new IllegalArgumentException("Busca hasta 8 etiquetas a la vez.");
            for (String etiqueta : etiquetas) predicates.add(cb.isMember(etiqueta, root.get("etiquetas")));
            if (!texto.isBlank()) {
                var categoria = root.join("categoria", JoinType.LEFT);
                var cuenta = root.join("cuenta", JoinType.LEFT);
                for (String termino : texto.split("\\s+")) {
                    String pattern = "%" + termino.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                    List<Predicate> partes = new ArrayList<>();
                    for (var campo : List.of(root.<String>get("descripcion"), root.<String>get("notas"), categoria.<String>get("nombre"), cuenta.<String>get("nombre"), root.<String>get("cuentaNombreHistorico"), root.get("usuario").<String>get("nombre"))) {
                        partes.add(cb.like(cb.lower(campo), pattern, '\\'));
                    }
                    if (termino.matches("[0-9]+([.,][0-9]{1,2})?")) partes.add(cb.equal(root.get("monto"), new java.math.BigDecimal(termino.replace(',', '.'))));
                    predicates.add(cb.or(partes.toArray(new Predicate[0])));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
