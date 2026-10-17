package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.AvisoFinancieroService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/avisos") @RequiredArgsConstructor
public class AvisoFinancieroController {
    private final AvisoFinancieroService service;
    public enum Origen { MANUAL,GMAIL,WHATSAPP,SMS,NOTIFICACION }
    public enum Clase { COMPRA,INGRESO,DEVOLUCION,TRANSFERENCIA,PAGO_TARJETA,AUTORIZACION,SIN_CLASIFICAR }
    public record Nuevo(@NotNull Origen origen,@NotBlank @Size(max=200) String identificador,
                        @NotBlank @Size(max=200) String resumen,@NotNull Clase clase,
                        @NotNull @Pattern(regexp="[A-Z]{3}") String moneda,TransaccionRequest datos,UUID claveRegistro) {}
    public record Edicion(@NotNull Long version,@NotNull Clase clase,
                          @NotNull @Pattern(regexp="[A-Z]{3}") String moneda,@NotNull TransaccionRequest datos) {}
    public record Decision(@NotNull Long version,boolean aceptarPosibleDuplicado) {}
    @GetMapping public ApiResponse<Page<AvisoFinancieroService.Vista>> listar(
            @RequestParam(defaultValue="PENDIENTE") String estado,@RequestParam(defaultValue="0") int page,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok("Bandeja de avisos",service.listar(user.getId(),estado,page));
    }
    @PostMapping public ApiResponse<AvisoFinancieroService.Vista> recibir(@Valid @RequestBody Nuevo body,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok("Aviso recibido; no se ha registrado dinero",service.recibir(user.getId(),body));
    }
    @PutMapping("/{id}") public ApiResponse<AvisoFinancieroService.Vista> editar(@PathVariable String id,
            @Valid @RequestBody Edicion body,@AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok("Aviso corregido",service.editar(user.getId(),id,body));
    }
    @PostMapping("/{id}/confirmar") public ApiResponse<AvisoFinancieroService.Vista> confirmar(@PathVariable String id,
            @Valid @RequestBody Decision body,@AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok("Movimiento registrado",service.confirmar(user.getId(),id,body));
    }
    @PostMapping("/{id}/descartar") public ApiResponse<AvisoFinancieroService.Vista> descartar(@PathVariable String id,
            @Valid @RequestBody Decision body,@AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok("Aviso descartado",service.descartar(user.getId(),id,body.version()));
    }
}
