package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Calendario bancario nacional verificado; no sustituye el estado de cuenta. */
public final class CalendarioBancarioMexico {
    private static final Map<Integer, Set<LocalDate>> INHABILES = cargar();
    private CalendarioBancarioMexico() {}

    public record Ajuste(LocalDate base, LocalDate fecha, boolean verificado) {}

    public static Ajuste ajustar(LocalDate base) {
        LocalDate fecha = base;
        while (INHABILES.containsKey(fecha.getYear())) {
            boolean finDeSemana = fecha.getDayOfWeek() == DayOfWeek.SATURDAY
                    || fecha.getDayOfWeek() == DayOfWeek.SUNDAY;
            if (!finDeSemana && !INHABILES.get(fecha.getYear()).contains(fecha)) {
                return new Ajuste(base, fecha, true);
            }
            fecha = fecha.plusDays(1);
        }
        // Sin calendario publicado/verificado no aplazar el recordatorio ni prometer una prórroga.
        return new Ajuste(base, base, false);
    }

    private static Map<Integer, Set<LocalDate>> cargar() {
        try (var archivo = CalendarioBancarioMexico.class.getResourceAsStream("/calendario-bancario-mx.json")) {
            if (archivo == null) throw new IllegalStateException("Falta calendario bancario MX");
            var anios = new ObjectMapper().readTree(archivo).get("anios");
            Map<Integer, Set<LocalDate>> resultado = new HashMap<>();
            anios.fields().forEachRemaining(entrada -> {
                Set<LocalDate> fechas = new HashSet<>();
                entrada.getValue().forEach(fecha -> fechas.add(LocalDate.parse(fecha.asText())));
                resultado.put(Integer.parseInt(entrada.getKey()), Set.copyOf(fechas));
            });
            return Map.copyOf(resultado);
        } catch (IOException error) {
            throw new IllegalStateException("No se pudo leer el calendario bancario MX", error);
        }
    }
}
