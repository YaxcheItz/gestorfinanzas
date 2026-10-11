package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/** Ventanas atómicas por instancia, con memoria acotada. No sustituye límites en el proxy. */
@Component
public class LimiteAbuso {
    private static final int MAX_CLAVES = 5000;
    private final Clock clock;
    private final Map<String, Ventana> ventanas = new HashMap<>();
    public LimiteAbuso() { this(Clock.systemUTC()); }
    LimiteAbuso(Clock clock) { this.clock = clock; }

    public synchronized void comprobar(String clave, int maximo, Duration duracion) {
        Instant ahora = clock.instant();
        ventanas.entrySet().removeIf(entry -> !entry.getValue().hasta.isAfter(ahora));
        Ventana ventana = ventanas.get(clave);
        if (ventana == null) {
            if (ventanas.size() >= MAX_CLAVES) {
                throw new TooManyRequestsException("Servidor ocupado. Reintenta en un momento.", 60);
            }
            ventana = new Ventana(ahora.plus(duracion));
            ventanas.put(clave, ventana);
        }
        if (ventana.consumidos >= maximo) {
            long segundos = Math.max(1, (Duration.between(ahora, ventana.hasta).toMillis()+999)/1000);
            throw new TooManyRequestsException("Demasiadas solicitudes. Espera antes de reintentar.", segundos);
        }
        ventana.consumidos++;
    }

    private static final class Ventana {
        final Instant hasta;
        int consumidos;
        Ventana(Instant hasta) { this.hasta = hasta; }
    }
}
