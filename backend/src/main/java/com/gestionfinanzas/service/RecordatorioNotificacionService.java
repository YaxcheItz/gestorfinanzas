package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecordatorioNotificacionService {

    private static final Logger log = LoggerFactory.getLogger(RecordatorioNotificacionService.class);

    private final CuentaRepository cuentaRepository;
    private final PlantillaRecurrenteRepository plantillaRecurrenteRepository;
    private final NotificacionWhatsAppService whatsAppService;

    /**
     * Tarea programada: se ejecuta automáticamente todos los días a las 9:00 AM (hora Ciudad de México).
     */
    @Scheduled(cron = "${app.recordatorios.cron:0 0 9 * * *}", zone = "America/Mexico_City")
    @Transactional(readOnly = true)
    public int ejecutarRecordatoriosDiarios() {
        LocalDate hoy = LocalDate.now();
        int diaDelMes = hoy.getDayOfMonth();
        log.info("Iniciando revisión diaria de recordatorios financieros para el día {}.", hoy);

        int notificacionesEnviadas = 0;

        // 1. Tarjetas de crédito: Fecha de Corte y Fecha Límite de Pago
        List<Cuenta> tarjetasCredito = cuentaRepository.findActivasConUsuarioPorTipo(TipoCuenta.CREDITO);
        for (Cuenta cuenta : tarjetasCredito) {
            Usuario usuario = cuenta.getUsuario();
            if (!usuarioAceptaWhatsApp(usuario)) {
                continue;
            }

            BigDecimal saldoAdeudo = cuenta.getSaldoActual() != null ? cuenta.getSaldoActual().abs() : BigDecimal.ZERO;
            BigDecimal limiteRetenido = cuenta.getLimiteRetenido() != null ? cuenta.getLimiteRetenido() : BigDecimal.ZERO;

            // Recordatorio de FECHA DE CORTE (el mismo día del corte)
            if (cuenta.getDiaCorte() != null && cuenta.getDiaCorte() == diaDelMes) {
                StringBuilder msg = new StringBuilder();
                msg.append("💳 *Kaptal - Fecha de Corte de Tarjeta*\n\n");
                msg.append("¡Hola ").append(usuario.getNombre()).append("! ");
                msg.append("Hoy es la *fecha de corte* de tu tarjeta *").append(cuenta.getNombre()).append("*.\n\n");
                msg.append("• Saldo al corte: $").append(saldoAdeudo).append(" ").append(cuenta.getMoneda()).append("\n");
                if (limiteRetenido.signum() > 0) {
                    msg.append("• Límite retenido por MSI: $").append(limiteRetenido).append(" ").append(cuenta.getMoneda()).append("\n");
                }
                if (cuenta.getDiaPago() != null) {
                    msg.append("• Fecha límite para pagar: Día ").append(cuenta.getDiaPago()).append(" de este mes\n");
                }
                msg.append("\nTe sugerimos ingresar a Kaptal para revisar tus movimientos y planificar tu pago. 🚀");

                whatsAppService.enviarRecordatorio(usuario.getTelefono(), msg.toString());
                notificacionesEnviadas++;
            }

            // Recordatorio de FECHA LÍMITE DE PAGO (el mismo día del pago)
            if (cuenta.getDiaPago() != null && cuenta.getDiaPago() == diaDelMes) {
                String msg = String.format(
                        "⚠️ *Kaptal - Fecha Límite de Pago Hoy*\n\n" +
                        "¡Hola %s! Hoy es tu *fecha límite de pago* para tu tarjeta *%s*.\n\n" +
                        "• Monto a liquidar: $%s %s\n\n" +
                        "Recuerda realizar tu pago hoy para evitar intereses y comisiones moratorias. 💳",
                        usuario.getNombre(),
                        cuenta.getNombre(),
                        saldoAdeudo,
                        cuenta.getMoneda()
                );
                whatsAppService.enviarRecordatorio(usuario.getTelefono(), msg);
                notificacionesEnviadas++;
            }
        }

        // 2. Cuotas de Meses Sin Intereses (MSI) y Gastos Recurrentes que vencen hoy
        List<PlantillaRecurrente> plantillasHoy = plantillaRecurrenteRepository.findByActivaTrueAndSiguienteFecha(hoy);
        for (PlantillaRecurrente plantilla : plantillasHoy) {
            Usuario usuario = plantilla.getUsuario();
            if (!usuarioAceptaWhatsApp(usuario)) {
                continue;
            }

            StringBuilder cuotaInfo = new StringBuilder();
            if (plantilla.getCuotasTotales() != null && plantilla.getCuotasTotales() > 0) {
                cuotaInfo.append("• Cuota: ")
                        .append(plantilla.getCuotasPagadas() + 1)
                        .append(" de ")
                        .append(plantilla.getCuotasTotales() + 1)
                        .append(" (Compra a MSI)\n");
            }

            String concepto = plantilla.getNotas() != null && !plantilla.getNotas().isBlank()
                    ? plantilla.getNotas()
                    : "Pago programado";

            String msg = String.format(
                    "📅 *Kaptal - Cargo Programado Hoy*\n\n" +
                    "¡Hola %s! Hoy está programado el siguiente movimiento:\n\n" +
                    "• Concepto: %s\n" +
                    "• Monto: $%s\n" +
                    "%s" +
                    "• Cuenta: %s\n\n" +
                    "Revisa tu app para confirmar el cargo o verificar tu balance. 📊",
                    usuario.getNombre(),
                    concepto,
                    plantilla.getMonto(),
                    cuotaInfo,
                    plantilla.getCuenta().getNombre()
            );

            whatsAppService.enviarRecordatorio(usuario.getTelefono(), msg);
            notificacionesEnviadas++;
        }

        log.info("Revisión de recordatorios finalizada. Notificaciones enviadas: {}", notificacionesEnviadas);
        return notificacionesEnviadas;
    }

    private boolean usuarioAceptaWhatsApp(Usuario usuario) {
        return usuario != null
                && usuario.isActivo()
                && usuario.isNotificacionesWhatsapp()
                && usuario.getTelefono() != null
                && !usuario.getTelefono().isBlank();
    }
}
