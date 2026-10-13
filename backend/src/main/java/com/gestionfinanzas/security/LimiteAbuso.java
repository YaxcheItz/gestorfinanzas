package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
    private final LimiteAbusoCompartido compartido;
    private final Map<String, Ventana> ventanas = new HashMap<>();
    public LimiteAbuso() { this(Clock.systemUTC()); }
    LimiteAbuso(Clock clock) { this.clock = clock; this.compartido = null; }
    @Autowired
    public LimiteAbuso(ObjectProvider<LimiteAbusoCompartido> store,
            @Value("${app.abuse.store:memory}") String modo) {
        if (!"memory".equals(modo) && !"postgres".equals(modo))
            throw new IllegalArgumentException("app.abuse.store debe ser memory o postgres");
        this.clock=Clock.systemUTC();this.compartido=store.getIfAvailable();
        if ("postgres".equals(modo) && this.compartido==null)
            throw new IllegalStateException("No se pudo activar el límite compartido");
    }

    public void comprobar(String clave, int maximo, Duration duracion) {
        if (compartido != null) {
            try { compartido.comprobar(clave,maximo,duracion); }
            catch (org.springframework.transaction.TransactionException error) {
                throw new com.gestionfinanzas.exception.LimiteNoDisponibleException();
            }
            return;
        }
        comprobarLocal(clave,maximo,duracion);
    }

    private synchronized void comprobarLocal(String clave, int maximo, Duration duracion) {
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
