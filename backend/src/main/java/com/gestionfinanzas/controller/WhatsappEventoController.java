package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.service.ConexionWhatsappService;
import com.gestionfinanzas.service.WhatsappEventoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import java.io.IOException;

@RestController @RequestMapping("/api/canales/whatsapp") @RequiredArgsConstructor
public class WhatsappEventoController {
    private final WhatsappEventoService eventos;
    private final ConexionWhatsappService conexiones;
    @GetMapping("/disponibilidad")
    public ApiResponse<Boolean> disponible(){return ApiResponse.ok("Disponibilidad del canal",conexiones.operativo());}
    @PostMapping(value={"/evento","/evento/autorizar-respuesta"},consumes=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<? extends ApiResponse<?>> evento(HttpServletRequest request,@RequestHeader(value="X-Webhook-Signature",required=false) String firma,
            @RequestHeader(value="X-Kaptal-Received-At",required=false) String recibido,
            @RequestHeader(value="X-Kaptal-Relay-Signature",required=false) String firmaRelay)throws IOException{
        byte[] raw=request.getInputStream().readNBytes(65537);
        if(raw.length>65536)return ResponseEntity.status(413).body(ApiResponse.error("Evento demasiado grande."));
        return ResponseEntity.ok(ApiResponse.ok("Evento procesado",request.getRequestURI().endsWith("/autorizar-respuesta")?eventos.autorizarRespuesta(raw,firma,recibido,firmaRelay):eventos.procesar(raw,firma,recibido,firmaRelay)));
    }
    @ExceptionHandler(ConexionWhatsappService.ErrorCanal.class)
    ResponseEntity<ApiResponse<Void>> error(ConexionWhatsappService.ErrorCanal ex){return ResponseEntity.status(ex.status).body(ApiResponse.error(ex.getMessage()));}
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> conflicto(){return ResponseEntity.status(409).body(ApiResponse.error("Actualiza el estado antes de reintentar."));}
}
