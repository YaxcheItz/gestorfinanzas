package com.gestionfinanzas.service;

import com.gestionfinanzas.BackendApplication;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RecordatorioNotificacionServiceTest {

    private static final ZoneId MEXICO = ZoneId.of("America/Mexico_City");

    private final CuentaRepository cuentaRepository = mock(CuentaRepository.class);
    private final PlantillaRecurrenteRepository plantillaRepository = mock(PlantillaRecurrenteRepository.class);
    private final NotificacionWhatsAppService whatsAppService = mock(NotificacionWhatsAppService.class);
    private final RecordatorioNotificacionService service =
            new RecordatorioNotificacionService(cuentaRepository, plantillaRepository, whatsAppService);

    @AfterEach
    void restaurarZonaDeLaAplicacion() {
        // No restaurar la zona de arranque de la JVM (p. ej. UTC en CI): dejaría el resto
        // de la suite Surefire con una zona distinta a la de la aplicación.
        BackendApplication.configurarZonaHoraria();
    }

    @Test
    void laZonaHorariaPorDefectoEsCiudadDeMexico() {
        BackendApplication.configurarZonaHoraria();

        assertEquals(ZoneId.of("America/Mexico_City"), TimeZone.getDefault().toZoneId());
    }

    /**
     * Regresion del bug: la JVM arranca en UTC, asi que entre las 18:00 y las 24:00 en Mexico
     * LocalDate.now() devolvia el dia siguiente y el recordatorio de fecha de corte no se enviaba.
     */
    @Test
    void laFechaDelDiaCorrespondeAMexicoYNoAUtc() {
        BackendApplication.configurarZonaHoraria();

        ZonedDateTime instante = ZonedDateTime.now(MEXICO);
        LocalDate enMexico = LocalDate.now();
        LocalDate enUtc = LocalDate.now(ZoneId.of("UTC"));

        assertEquals(instante.toLocalDate(), enMexico);
        // Solo es una discriminacion cuando las dos fechas difieren; si coinciden, no hay nada que probar.
        if (!enMexico.equals(enUtc)) {
            assertNotEquals(enUtc, enMexico, "LocalDate.now() esta devolviendo la fecha de UTC");
        }
    }

    @Test
    void enviaRecordatorioDeCorteCuandoElDiaCoincide() {
        BackendApplication.configurarZonaHoraria();
        int diaDeHoy = LocalDate.now().getDayOfMonth();
        when(whatsAppService.enviarRecordatorio(anyString(), anyString()))
                .thenReturn("Mensaje enviado exitosamente a +5219515791240. SID: SM123");
        when(plantillaRepository.findByActivaTrueAndSiguienteFecha(any(LocalDate.class))).thenReturn(List.of());
        when(cuentaRepository.findActivasConUsuarioPorTipo(TipoCuenta.CREDITO))
                .thenReturn(List.of(tarjeta("Citibanamex", diaDeHoy, diaDistinto(diaDeHoy))));

        int enviadas = service.ejecutarRecordatoriosDiarios();

        assertEquals(1, enviadas);
        ArgumentCaptor<String> mensaje = ArgumentCaptor.forClass(String.class);
        verify(whatsAppService).enviarRecordatorio(org.mockito.ArgumentMatchers.eq("5219515791240"),
                mensaje.capture());
        assertEquals(true, mensaje.getValue().contains("Citibanamex"));
    }

    /**
     * Regresion del conteo: enviarRecordatorio devuelve el resultado como texto y no lanza,
     * asi que antes se sumaba como enviado aunque Twilio hubiera rechazado el mensaje.
     */
    @Test
    void noCuentaLosRecordatoriosQueTwilioRechazo() {
        BackendApplication.configurarZonaHoraria();
        int diaDeHoy = LocalDate.now().getDayOfMonth();
        when(whatsAppService.enviarRecordatorio(anyString(), anyString()))
                .thenReturn("Error al enviar mensaje vía Twilio: el destino no tiene WhatsApp activo");
        when(plantillaRepository.findByActivaTrueAndSiguienteFecha(any(LocalDate.class))).thenReturn(List.of());
        when(cuentaRepository.findActivasConUsuarioPorTipo(TipoCuenta.CREDITO))
                .thenReturn(List.of(tarjeta("BBVA", diaDeHoy, diaDistinto(diaDeHoy))));

        assertEquals(0, service.ejecutarRecordatoriosDiarios());
    }

    @Test
    void omiteUsuariosSinWhatsAppActivado() {
        BackendApplication.configurarZonaHoraria();
        int diaDeHoy = LocalDate.now().getDayOfMonth();
        when(plantillaRepository.findByActivaTrueAndSiguienteFecha(any(LocalDate.class))).thenReturn(List.of());
        when(cuentaRepository.findActivasConUsuarioPorTipo(TipoCuenta.CREDITO))
                .thenReturn(List.of(tarjetaSinWhatsApp("Sears", diaDeHoy, diaDistinto(diaDeHoy))));

        int enviadas = service.ejecutarRecordatoriosDiarios();

        assertEquals(0, enviadas);
        verify(whatsAppService, never()).enviarRecordatorio(anyString(), anyString());
    }

    @Test
    void omiteTarjetasQueNoCortanHoy() {
        BackendApplication.configurarZonaHoraria();
        when(plantillaRepository.findByActivaTrueAndSiguienteFecha(any(LocalDate.class))).thenReturn(List.of());
        when(cuentaRepository.findActivasConUsuarioPorTipo(TipoCuenta.CREDITO))
                .thenReturn(List.of(tarjeta("BBVA", diaDistinto(1), diaDistinto(2))));

        assertEquals(0, service.ejecutarRecordatoriosDiarios());
        verify(whatsAppService, never()).enviarRecordatorio(anyString(), anyString());
    }

    /**
     * Devuelve un dia del mes garantizado distinto del dia de hoy, para montar tarjetas
     * que no deben disparar recordatorio sin depender de en que fecha corra la suite.
     */
    private static int diaDistinto(int dia) {
        int hoy = LocalDate.now().getDayOfMonth();
        int candidato = (dia % 28) + 1;
        while (candidato == hoy) {
            candidato = (candidato % 28) + 1;
        }
        return candidato;
    }

    private static Usuario usuarioConWhatsApp() {
        return Usuario.builder()
                .id(14L)
                .nombre("Yaxche")
                .email("yaxche@example.com")
                .telefono("5219515791240")
                .notificacionesWhatsapp(true)
                .activo(true)
                .build();
    }

    private static Cuenta tarjeta(String nombre, Integer diaCorte, Integer diaPago) {
        return Cuenta.builder()
                .id(1L)
                .usuario(usuarioConWhatsApp())
                .nombre(nombre)
                .tipo(TipoCuenta.CREDITO)
                .diaCorte(diaCorte)
                .diaPago(diaPago)
                .activo(true)
                .build();
    }

    private static Cuenta tarjetaSinWhatsApp(String nombre, Integer diaCorte, Integer diaPago) {
        return Cuenta.builder()
                .id(2L)
                .usuario(Usuario.builder()
                        .id(14L)
                        .nombre("Yaxche")
                        .email("yaxche@example.com")
                        .activo(true)
                        .build())
                .nombre(nombre)
                .tipo(TipoCuenta.CREDITO)
                .diaCorte(diaCorte)
                .diaPago(diaPago)
                .activo(true)
                .build();
    }
}
