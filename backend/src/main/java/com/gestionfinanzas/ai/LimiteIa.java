package com.gestionfinanzas.ai;

import java.time.Clock;
import java.util.HashMap;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Límite por proceso: no sustituye un límite distribuido de producción. */
public class LimiteIa {
    private final Clock clock;
    private final java.util.Map<Long,Ventana> usuarios=new HashMap<>();
    public LimiteIa(Clock clock) { this.clock=clock; }
    public synchronized void consumir(Long usuarioId) {
        long ahora=clock.millis();
        usuarios.entrySet().removeIf(e -> ahora-e.getValue().inicio>=60000);
        if (!usuarios.containsKey(usuarioId) && usuarios.size()>=10000)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"La IA está ocupada. Inténtalo más tarde.");
        var ventana=usuarios.computeIfAbsent(usuarioId,id -> new Ventana(ahora));
        if (ventana.usos>=10)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Espera un minuto antes de volver a consultar IA. Las reglas locales siguen disponibles.");
        ventana.usos++;
    }
    private static class Ventana { final long inicio; int usos; Ventana(long inicio) { this.inicio=inicio; } }
}
