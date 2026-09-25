package com.gestionfinanzas.repository.specification;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.model.entity.Transaccion;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class TransaccionSpecification {

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

            // 3. Filtro por Cuenta (Origen o Destino si es transferencia)
            if (filtro.cuentaId() != null) {
                Predicate esOrigen = cb.equal(root.get("cuenta").get("id"), filtro.cuentaId());
                Predicate esDestino = cb.equal(root.get("cuentaDestino").get("id"), filtro.cuentaId());
                predicates.add(cb.or(esOrigen, esDestino));
            }

            // 4. Filtro por Categoría
            if (filtro.categoriaId() != null) {
                predicates.add(cb.equal(root.get("categoria").get("id"), filtro.categoriaId()));
            }

            // 5. Rango de Fechas
            if (filtro.fechaInicio() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("fecha"), filtro.fechaInicio()));
            }
            if (filtro.fechaFin() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("fecha"), filtro.fechaFin()));
            }

            // 6. Búsqueda de texto (en descripción o notas)
            if (filtro.busqueda() != null && !filtro.busqueda().isBlank()) {
                String pattern = "%" + filtro.busqueda().trim().toLowerCase() + "%";
                Predicate busquedaDesc = cb.like(cb.lower(root.get("descripcion")), pattern);
                Predicate busquedaNotas = cb.like(cb.lower(root.get("notas")), pattern);
                predicates.add(cb.or(busquedaDesc, busquedaNotas));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
