package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.ConexionWhatsappService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController @RequestMapping("/api/canales/whatsapp") @RequiredArgsConstructor
public class ConexionWhatsappController {
    private final ConexionWhatsappService conexiones;
    public record Inicio(@NotBlank @Pattern(regexp="\\+[1-9][0-9]{7,14}") String telefono,
                         @NotNull @AssertTrue Boolean aceptarVinculacion,boolean guardarAutomaticamente) {}
    public record Preferencias(boolean guardarAutomaticamente) {}

    @GetMapping("/conexion")
    public ApiResponse<ConexionWhatsappService.Estado> estado(@AuthenticationPrincipal CustomUserDetails usuario){
        return ApiResponse.ok("Estado de vinculacion",conexiones.estado(usuario.getId()));
    }
    @PostMapping("/conexion")
    public ResponseEntity<ApiResponse<ConexionWhatsappService.Desafio>> iniciar(@AuthenticationPrincipal CustomUserDetails usuario,@Valid @RequestBody Inicio body){
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Envia el codigo al bot desde tu numero",conexiones.iniciar(usuario.getId(),body.telefono(),body.guardarAutomaticamente())));
    }
    @PatchMapping("/conexion/preferencias")
    public ApiResponse<ConexionWhatsappService.Estado> preferencias(@AuthenticationPrincipal CustomUserDetails usuario,@RequestBody Preferencias body){
        return ApiResponse.ok("Preferencias guardadas",conexiones.preferencias(usuario.getId(),body.guardarAutomaticamente()));
    }
    @DeleteMapping("/conexion")
    public ApiResponse<ConexionWhatsappService.Estado> desconectar(@AuthenticationPrincipal CustomUserDetails usuario){
        return ApiResponse.ok("Vinculacion desconectada",conexiones.desconectar(usuario.getId()));
    }
    @PostMapping(value="/vinculacion/evento",consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<? extends ApiResponse<?>> evento(HttpServletRequest request,
            @RequestHeader(value="X-Webhook-Signature",required=false) String firma)throws IOException{
        // Bound the bytes before allocating/parsing an untrusted public request.
        byte[] raw=request.getInputStream().readNBytes(65537);
        if(raw.length>65536)return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(ApiResponse.error("Evento demasiado grande."));
        return ResponseEntity.ok(ApiResponse.ok("Evento comprobado",conexiones.verificarEvento(raw,firma)));
    }
    @ExceptionHandler(ConexionWhatsappService.ErrorCanal.class)
    ResponseEntity<ApiResponse<Void>> error(ConexionWhatsappService.ErrorCanal ex){
        return ResponseEntity.status(ex.status).body(ApiResponse.error(ex.getMessage()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> conflicto(){
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error("No se pudo completar la vinculacion. Revisa el estado antes de reintentar."));
    }
}
