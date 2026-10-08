package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class RecordatorioNotificacionService {

    /** Prefijo que devuelve NotificacionWhatsAppService cuando Twilio acepto el mensaje. */
    private static final String MENSAJE_ENVIADO = "Mensaje enviado exitosamente";

    private static final Logger log = LoggerFactory.getLogger(RecordatorioNotificacionService.class);

    private final CuentaRepository cuentaRepository;
    private final PlantillaRecurrenteRepository plantillaRecurrenteRepository;
    private final NotificacionWhatsAppService whatsAppService;
    private final PushNotificationService pushNotificationService;

    @Autowired
    public RecordatorioNotificacionService(CuentaRepository cuentaRepository,
                                           PlantillaRecurrenteRepository plantillaRecurrenteRepository,
                                           NotificacionWhatsAppService whatsAppService,
                                           PushNotificationService pushNotificationService) {
        this.cuentaRepository = cuentaRepository;
        this.plantillaRecurrenteRepository = plantillaRecurrenteRepository;
        this.whatsAppService = whatsAppService;
        this.pushNotificationService = pushNotificationService;
    }

    /** Constructor para pruebas unitarias preexistentes sin proveedor push. */
    public RecordatorioNotificacionService(CuentaRepository cuentaRepository,
                                           PlantillaRecurrenteRepository plantillaRecurrenteRepository,
                                           NotificacionWhatsAppService whatsAppService) {
        this(cuentaRepository, plantillaRecurrenteRepository, whatsAppService, null);
    }

    /**
     * Tarea programada: se ejecuta automáticamente todos los días a las 9:00 AM (hora Ciudad de México).
     */
    @Scheduled(cron = "${app.recordatorios.cron:0 0 9 * * *}", zone = "America/Mexico_City")
    @Transactional(readOnly = true)
    public int ejecutarRecordatoriosDiarios() {
        LocalDate hoy = com.gestionfinanzas.service.CalendarioFinanciero.hoy();
        log.info("Iniciando revisión diaria de recordatorios financieros para el día {}.", hoy);

        int notificacionesEnviadas = 0;

        // 1. Tarjetas de crédito: Fecha de Corte y Fecha Límite de Pago
        List<Cuenta> tarjetasCredito = cuentaRepository.findActivasConUsuarioPorTipo(TipoCuenta.CREDITO);
        for (Cuenta cuenta : tarjetasCredito) {
            Usuario usuario = cuenta.getUsuario();
            if (!usuarioPuedeRecibir(usuario)) {
                continue;
            }

            BigDecimal saldoAdeudo = cuenta.getSaldoActual() != null ? cuenta.getSaldoActual().abs() : BigDecimal.ZERO;
            BigDecimal limiteRetenido = cuenta.getLimiteRetenido() != null ? cuenta.getLimiteRetenido() : BigDecimal.ZERO;

            // Recordatorio de FECHA DE CORTE (el mismo día del corte)
            LocalDate fechaCorte = cuenta.getDiaCorte() == null ? null : fechaDelMes(hoy.getYear(), hoy.getMonthValue(), cuenta.getDiaCorte());
            if (fechaCorte != null && fechaCorte.equals(hoy)) {
                StringBuilder msg = new StringBuilder();
                msg.append("💳 *Kaptal - Fecha de Corte de Tarjeta*\n\n");
                msg.append("¡Hola ").append(usuario.getNombre()).append("! ");
                msg.append("Hoy es la *fecha de corte* de tu tarjeta *").append(cuenta.getNombre()).append("*.\n\n");
                msg.append("• Saldo registrado en Kaptal: $").append(saldoAdeudo).append(" ").append(cuenta.getMoneda()).append("\n");
                if (limiteRetenido.signum() > 0) {
                    msg.append("• Límite retenido por MSI: $").append(limiteRetenido).append(" ").append(cuenta.getMoneda()).append("\n");
                }
                if (cuenta.getDiaPago() != null) {
                    LocalDate fechaPago = fechaPago(fechaCorte);
                    msg.append("• Fecha límite estimada: ").append(fechaPago).append("\n");
                }
                msg.append("\nConfirma el importe y la fecha en el estado de cuenta de tu banco. Kaptal solo muestra los movimientos que registraste. 🚀");

                notificacionesEnviadas += enviarRecordatorio(usuario, msg.toString(),
                        "Hoy es tu fecha de corte", "Revisa tu fecha estimada de corte y el estado de cuenta de tu banco.");
            }

            // Recordatorio de FECHA LÍMITE DE PAGO (el mismo día del pago)
            LocalDate fechaCorteAnterior = cuenta.getDiaCorte() == null || cuenta.getDiaPago() == null ? null
                    : fechaCorteAsociadaAlPago(hoy, cuenta.getDiaCorte());
            if (fechaCorteAnterior != null && fechaPago(fechaCorteAnterior).equals(hoy)) {
                String msg = String.format(
                        "⚠️ *Kaptal - Fecha Límite de Pago Hoy*\n\n" +
                        "¡Hola %s! Hoy es tu *fecha límite de pago* para tu tarjeta *%s*.\n\n" +
                        "• Saldo registrado en Kaptal: $%s %s\n\n" +
                        "Confirma el monto y la fecha límite en tu estado de cuenta bancario. 💳",
                        usuario.getNombre(),
                        cuenta.getNombre(),
                        saldoAdeudo,
                        cuenta.getMoneda()
                );
                notificacionesEnviadas += enviarRecordatorio(usuario, msg,
                        "Hoy vence el pago estimado", "Revisa el importe y la fecha límite en el estado de cuenta de tu banco.");
            }
        }

        // 2. Cuotas de Meses Sin Intereses (MSI) y Gastos Recurrentes que vencen hoy
        List<PlantillaRecurrente> plantillasHoy = plantillaRecurrenteRepository.findByActivaTrueAndSiguienteFecha(hoy);
        for (PlantillaRecurrente plantilla : plantillasHoy) {
            Usuario usuario = plantilla.getUsuario();
            if (!usuarioPuedeRecibir(usuario)) {
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

            notificacionesEnviadas += enviarRecordatorio(usuario, msg,
                    "Movimiento programado para hoy", "Tienes una cuota o movimiento programado. Revisa tus cuentas en Kaptal.");
        }

        log.info("Revisión de recordatorios finalizada. Notificaciones enviadas: {}", notificacionesEnviadas);
        return notificacionesEnviadas;
    }

    private LocalDate fechaDelMes(int anio, int mes, int diaConfigurado) {
        YearMonth yearMonth = YearMonth.of(anio, mes);
        return yearMonth.atDay(Math.min(diaConfigurado, yearMonth.lengthOfMonth()));
    }

    private LocalDate fechaPago(LocalDate corte) {
        return corte.plusDays(20);
    }

    private LocalDate fechaCorteAsociadaAlPago(LocalDate hoy, Integer diaCorte) {
        for (int desplazamiento = -2; desplazamiento <= 0; desplazamiento++) {
            YearMonth mes = YearMonth.from(hoy).plusMonths(desplazamiento);
            LocalDate corte = fechaDelMes(mes.getYear(), mes.getMonthValue(), diaCorte);
            if (fechaPago(corte).equals(hoy)) return corte;
        }
        return null;
    }

    /**
     * El servicio de WhatsApp devuelve un texto con el resultado en lugar de lanzar, asi que
     * antes se contaba como enviado aunque Twilio hubiera rechazado el mensaje. Ahora solo
     * suma los que de verdad se mandaron y deja rastro de los que fallaron.
     */
    private int enviarRecordatorio(Usuario usuario, String mensajeWhatsApp, String tituloPush, String cuerpoPush) {
        int enviados = 0;
        if (usuarioAceptaWhatsApp(usuario)) {
            String resultado = whatsAppService.enviarRecordatorio(usuario.getTelefono(), mensajeWhatsApp);
            if (resultado != null && resultado.startsWith(MENSAJE_ENVIADO)) {
                enviados++;
            } else {
                log.warn("No se pudo enviar el recordatorio de WhatsApp al usuario {}: {}", usuario.getId(), resultado);
            }
        }
        if (pushNotificationService != null) {
            enviados += pushNotificationService.notificarUsuario(usuario.getId(), tituloPush, cuerpoPush, "/cuentas");
        }
        return enviados;
    }

    private boolean usuarioPuedeRecibir(Usuario usuario) {
        return usuario != null && usuario.isActivo()
                && (usuarioAceptaWhatsApp(usuario)
                || (pushNotificationService != null && pushNotificationService.usuarioTieneSuscripciones(usuario.getId())));
    }

    private boolean usuarioAceptaWhatsApp(Usuario usuario) {
        return usuario != null
                && usuario.isActivo()
                && usuario.isNotificacionesWhatsapp()
                && usuario.getTelefono() != null
                && !usuario.getTelefono().isBlank();
    }
}
