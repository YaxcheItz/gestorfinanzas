package com.gestionfinanzas.dto.response;

import java.time.LocalDateTime;

public record HistorialParejaResponse(Long id, String nombrePareja, String moneda,
        boolean importado, LocalDateTime fechaCreacion) {}
