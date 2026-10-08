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
            predicates.add(cb.equal(root.get("usuario").get("id"), usuarioId));

            if (filtro == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            // 2. Filtro por Tipo de transacción
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

            // 7. Búsqueda de texto (descripción, notas o nombre de categoría)
            if (filtro.busqueda() != null && !filtro.busqueda().isBlank()) {
                if (query != null) {
                    query.distinct(true);
                }
                String pattern = "%" + filtro.busqueda().trim().toLowerCase() + "%";
                var categoria = root.join("categoria", JoinType.LEFT);
                Predicate busquedaDesc = cb.like(cb.lower(root.get("descripcion")), pattern);
                Predicate busquedaNotas = cb.like(cb.lower(root.get("notas")), pattern);
                Predicate busquedaCategoria = cb.like(cb.lower(categoria.get("nombre")), pattern);
                predicates.add(cb.or(busquedaDesc, busquedaNotas, busquedaCategoria));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
