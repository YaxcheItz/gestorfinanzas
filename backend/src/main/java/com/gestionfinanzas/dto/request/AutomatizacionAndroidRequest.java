package com.gestionfinanzas.dto.request;

import com.gestionfinanzas.controller.AvisoFinancieroController.Clase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AutomatizacionAndroidRequest {
    private AutomatizacionAndroidRequest() {}

    public record Regla(@NotNull UUID id, @NotBlank @Size(max=20) String proveedor,
                        @NotBlank @Size(max=150) String paquete,
                        @Size(max=40) String remitente, @Pattern(regexp="[0-9]{4}") String terminacion,
                        @NotNull @Positive Long cuentaId, @NotNull @Positive Long listaId,
                        @Positive Long categoriaId) {}

    public record Configuracion(@NotNull UUID dispositivoId, boolean consentimiento,
                                @NotEmpty @Size(max=10) List<@NotNull @Valid Regla> reglas) {}

    public record Evento(@NotNull UUID reglaId, @NotBlank @Pattern(regexp="[a-f0-9]{64}") String eventoId,
                         @NotNull Clase clase, @NotBlank @Pattern(regexp="[A-Z]{3}") String moneda,
                         @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) BigDecimal monto,
                         @NotNull LocalDate fecha, @NotBlank @Size(max=120) String descripcion) {}
}
