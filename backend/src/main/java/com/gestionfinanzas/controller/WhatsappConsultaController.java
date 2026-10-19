package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;


/** Money always goes through the notices service. */
@RestController @RequestMapping("/api/canales/whatsapp") @RequiredArgsConstructor
public class WhatsappConsultaController {
    private final WhatsappInterpretacionService interpretacion;
    public record Solicitud(@NotBlank @Size(max=1200) String texto) {}
    public record Respuesta(String tipo,String respuesta,TransaccionRequest propuesta,String moneda,
                            String contexto,List<String> sugerencias,LocalDate desde,LocalDate hasta) {}

    @PostMapping("/interpretar")
    public ApiResponse<Respuesta> interpretar(@AuthenticationPrincipal CustomUserDetails user,@Valid @RequestBody Solicitud body) {
        return interpretacion.interpretar(user.getId(),body.texto());
    }
}
