package com.gestionfinanzas.dto.response;

import java.util.List;

public record ListaResponse(Long id, String nombre, String emoji, String moneda, boolean personal,
        boolean archivada, String rol, List<Miembro> miembros) {
    public record Miembro(Long id, String nombre, String rol) {}
}
