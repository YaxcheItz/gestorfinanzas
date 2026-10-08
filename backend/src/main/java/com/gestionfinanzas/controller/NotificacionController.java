package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.request.SuscripcionPushRequest;
import com.gestionfinanzas.dto.request.VerificarPinWhatsappRequest;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.NotificacionWhatsAppService;
import com.gestionfinanzas.service.PushNotificationService;
import com.gestionfinanzas.service.RecordatorioNotificacionService;
import com.gestionfinanzas.service.VinculacionWhatsappService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionWhatsAppService notificacionService;
    private final RecordatorioNotificacionService recordatorioService;
    private final UsuarioRepository usuarioRepository;
    private final PushNotificationService pushNotificationService;
    private final VinculacionWhatsappService vinculacionWhatsappService;

    @GetMapping("/push/configuracion")
    public ResponseEntity<ApiResponse<PushNotificationService.ConfiguracionPush>> configuracionPush() {
        return ResponseEntity.ok(ApiResponse.ok("Configuración push consultada", pushNotificationService.configuracion()));
    }

    @PostMapping("/push/suscripcion")
    public ResponseEntity<ApiResponse<Void>> guardarSuscripcionPush(
            @Valid @RequestBody SuscripcionPushRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        pushNotificationService.guardarSuscripcion(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Notificaciones del navegador activadas", null));
    }

    @DeleteMapping("/push/suscripcion")
    public ResponseEntity<ApiResponse<Void>> eliminarSuscripcionPush(
            @Valid @RequestBody SuscripcionPushRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        pushNotificationService.eliminarSuscripcion(userDetails.getId(), request.endpoint());
        return ResponseEntity.ok(ApiResponse.ok("Notificaciones del navegador desactivadas", null));
    }

    @PostMapping("/whatsapp/pin")
    public ResponseEntity<ApiResponse<?>> generarPinWhatsapp(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (!vinculacionWhatsappService.botVerificacionDisponible()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("La vinculación de WhatsApp no está configurada en el servidor."));
        }
        try {
            return ResponseEntity.ok(ApiResponse.ok(
                    "PIN generado. Envíalo al bot antes de que expire.",
                    vinculacionWhatsappService.generarPin(userDetails.getId())
            ));
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(ApiResponse.error(error.getMessage()));
        } catch (IllegalStateException error) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error(error.getMessage()));
        }
    }

    @PostMapping("/whatsapp/verificar-pin")
    public ResponseEntity<ApiResponse<?>> verificarPinWhatsapp(
            @RequestHeader(value = "X-WhatsApp-Bot-Token", required = false) String token,
            @Valid @RequestBody VerificarPinWhatsappRequest request
    ) {
        if (!vinculacionWhatsappService.botVerificacionDisponible()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("La verificación del bot de WhatsApp no está configurada."));
        }
        if (!vinculacionWhatsappService.tokenBotValido(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Credencial del bot no válida."));
        }
        return ResponseEntity.ok(ApiResponse.ok(
                "Resultado de la verificación",
                vinculacionWhatsappService.verificarPin(request.telefono(), request.pin())
        ));
    }

    @PostMapping("/test-whatsapp")
    public ResponseEntity<ApiResponse<String>> testWhatsApp(@RequestParam String telefono) {
        String resultado = notificacionService.enviarRecordatorio(
            telefono,
            "¡Hola! Este es un recordatorio de prueba desde tu Gestor de Finanzas. ¡Todo está funcionando correctamente! 🚀"
        );
        boolean exito = resultado.startsWith("Mensaje enviado exitosamente");
        if (exito) {
            return ResponseEntity.ok(ApiResponse.ok(resultado, null));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error(resultado));
        }
    }

    /**
     * Prueba segura para cualquier usuario: el destino no se recibe como parametro, se toma
     * del perfil, asi que no se puede usar para mandar mensajes a terceros.
     */
    @PostMapping("/test-mi-whatsapp")
    public ResponseEntity<ApiResponse<String>> testMiWhatsApp(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Usuario usuario = usuarioRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (usuario.getTelefono() == null || usuario.getTelefono().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No tienes un teléfono registrado. Agrégalo en tu perfil e inténtalo de nuevo."));
        }
        String resultado = notificacionService.enviarRecordatorio(
            usuario.getTelefono(),
            "¡Hola " + usuario.getNombre() + "! Este es un recordatorio de prueba. ¡Todo está funcionando correctamente! 🚀"
        );
        if (resultado.startsWith("Mensaje enviado exitosamente")) {
            return ResponseEntity.ok(ApiResponse.ok(resultado, null));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error(resultado));
        }
    }

    @PostMapping("/ejecutar-recordatorios")
    public ResponseEntity<ApiResponse<String>> ejecutarRecordatorios() {
        int total = recordatorioService.ejecutarRecordatoriosDiarios();
        return ResponseEntity.ok(ApiResponse.ok("Recordatorios ejecutados correctamente. Notificaciones enviadas: " + total, null));
    }
}
