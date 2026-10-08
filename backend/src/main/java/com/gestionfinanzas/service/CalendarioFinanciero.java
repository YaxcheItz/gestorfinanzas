package com.gestionfinanzas.service;

import com.gestionfinanzas.model.enums.FrecuenciaRecurrencia;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/** Fechas civiles del negocio, independientes de la zona predeterminada de la JVM. */
public final class CalendarioFinanciero {
    public static final ZoneId ZONA = ZoneId.of("America/Mexico_City");
    private CalendarioFinanciero() {}

    public static LocalDate hoy() { return hoy(Clock.system(ZONA)); }
    public static LocalDate hoy(Clock clock) { return LocalDate.now(clock.withZone(ZONA)); }

    public static LocalDate siguiente(LocalDate actual, FrecuenciaRecurrencia frecuencia, LocalDate ancla) {
        LocalDate origen = ancla == null ? actual : ancla;
        return switch (frecuencia) {
            case SEMANAL -> actual.plusWeeks(1);
            case QUINCENAL -> actual.plusWeeks(2);
            case MENSUAL -> {
                LocalDate mes = actual.withDayOfMonth(1).plusMonths(1);
                int dia = origen.getDayOfMonth() == origen.lengthOfMonth()
                        ? mes.lengthOfMonth() : Math.min(origen.getDayOfMonth(), mes.lengthOfMonth());
                yield mes.withDayOfMonth(dia);
            }
            case ANUAL -> {
                LocalDate mes = actual.plusYears(1).withMonth(origen.getMonthValue()).withDayOfMonth(1);
                yield mes.withDayOfMonth(Math.min(origen.getDayOfMonth(), mes.lengthOfMonth()));
            }
        };
    }
}
