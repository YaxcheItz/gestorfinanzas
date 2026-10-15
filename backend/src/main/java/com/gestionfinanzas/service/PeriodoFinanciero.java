package com.gestionfinanzas.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Set;

/** Ciclos civiles inclusivos; no usa horas ni la zona horaria del servidor. */
public final class PeriodoFinanciero {
    private PeriodoFinanciero() {}
    public record Config(String tipo, LocalDate ancla, int diaInicio, int diaQuincena) {
        public static Config mensual() { return new Config("MES", LocalDate.of(2026, 1, 5), 1, 16); }
        public Config {
            if (tipo == null || !Set.of("MES", "SEMANA", "CATORCENA", "QUINCENA", "ANIO", "TODO", "HOY").contains(tipo)
                    || ancla == null || ancla.getYear() < 2000 || ancla.getYear() > 2100
                    || diaInicio < 1 || diaInicio > 31 || diaQuincena < 1 || diaQuincena > 31
                    || (tipo.equals("QUINCENA") && (diaInicio > 27 || diaQuincena <= diaInicio))) {
                throw new IllegalArgumentException("Configura un periodo válido y dos días distintos para la quincena.");
            }
        }
    }
    public record Rango(LocalDate desde, LocalDate hasta) {
        public Rango {
            if (desde == null || hasta == null || desde.isAfter(hasta)
                    || desde.getYear() < 2000 || hasta.getYear() > 2100) {
                throw new IllegalArgumentException("El rango de fechas no es válido (2000–2100).");
            }
        }
    }

    public static Rango resolver(Config config, LocalDate referencia) {
        new Rango(referencia, referencia);
        LocalDate inicio;
        LocalDate siguiente;
        YearMonth mes = YearMonth.from(referencia);
        switch (config.tipo()) {
            case "TODO": return new Rango(LocalDate.of(2000, 1, 1), LocalDate.of(2100, 12, 31));
            case "HOY": return new Rango(referencia, referencia);
            case "ANIO": return new Rango(referencia.withDayOfYear(1), referencia.withMonth(12).withDayOfMonth(31));
            case "SEMANA", "CATORCENA": {
                int dias = config.tipo().equals("SEMANA") ? 7 : 14;
                long bloque = Math.floorDiv(ChronoUnit.DAYS.between(config.ancla(), referencia), dias);
                inicio = config.ancla().plusDays(bloque * dias);
                siguiente = inicio.plusDays(dias);
                break;
            }
            case "QUINCENA": {
                LocalDate primero = dia(mes, config.diaInicio());
                LocalDate segundo = dia(mes, config.diaQuincena());
                if (referencia.isBefore(primero)) {
                    inicio = dia(mes.minusMonths(1), config.diaQuincena()); siguiente = primero;
                } else if (referencia.isBefore(segundo)) {
                    inicio = primero; siguiente = segundo;
                } else {
                    inicio = segundo; siguiente = dia(mes.plusMonths(1), config.diaInicio());
                }
                break;
            }
            default: {
                inicio = dia(mes, config.diaInicio());
                if (referencia.isBefore(inicio)) mes = mes.minusMonths(1);
                inicio = dia(mes, config.diaInicio());
                siguiente = dia(mes.plusMonths(1), config.diaInicio());
            }
        }
        return new Rango(inicio, siguiente.minusDays(1));
    }

    public static Rango desplazar(Config config, Rango actual, int direccion) {
        if (config.tipo().equals("TODO")) return actual;
        return resolver(config, direccion < 0 ? actual.desde().minusDays(1) : actual.hasta().plusDays(1));
    }

    private static LocalDate dia(YearMonth mes, int dia) { return mes.atDay(Math.min(dia, mes.lengthOfMonth())); }
}
