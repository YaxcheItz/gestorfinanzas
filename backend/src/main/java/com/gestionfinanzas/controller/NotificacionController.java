package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.service.NotificacionWhatsAppService;
import com.gestionfinanzas.service.RecordatorioNotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionWhatsAppService notificacionService;
    private final RecordatorioNotificacionService recordatorioService;
    private final CuentaRepository cuentaRepository;

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

    @PostMapping("/ejecutar-recordatorios")
    public ResponseEntity<ApiResponse<String>> ejecutarRecordatorios() {
        int total = recordatorioService.ejecutarRecordatoriosDiarios();
        return ResponseEntity.ok(ApiResponse.ok("Recordatorios ejecutados correctamente. Notificaciones enviadas: " + total, null));
    }

    /**
     * Endpoint de diagnóstico: muestra el estado de todas las tarjetas de crédito activas
     * y la configuración de WhatsApp de cada usuario. NO requiere autenticación (solo para depuración).
     */
    @GetMapping("/debug-recordatorios")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> debugRecordatorios() {
        int diaHoy = LocalDate.now().getDayOfMonth();
        List<Map<String, Object>> resultado = cuentaRepository
            .findActivasConUsuarioPorTipo(TipoCuenta.CREDITO)
            .stream()
            .map(c -> {
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("cuentaId", c.getId());
                info.put("cuentaNombre", c.getNombre());
                info.put("diaCorte", c.getDiaCorte());
                info.put("diaPago", c.getDiaPago());
                info.put("diaHoy", diaHoy);
                info.put("corteEsHoy", c.getDiaCorte() != null && c.getDiaCorte() == diaHoy);
                info.put("pagoEsHoy", c.getDiaPago() != null && c.getDiaPago() == diaHoy);
                info.put("usuarioId", c.getUsuario() != null ? c.getUsuario().getId() : null);
                info.put("usuarioNombre", c.getUsuario() != null ? c.getUsuario().getNombre() : null);
                info.put("telefono", c.getUsuario() != null ? c.getUsuario().getTelefono() : null);
                info.put("notificacionesWhatsapp", c.getUsuario() != null && c.getUsuario().isNotificacionesWhatsapp());
                info.put("usuarioActivo", c.getUsuario() != null && c.getUsuario().isActivo());
                return info;
            })
            .toList();
        return ResponseEntity.ok(ApiResponse.ok("Debug de tarjetas de crédito.", resultado));
    }
}
