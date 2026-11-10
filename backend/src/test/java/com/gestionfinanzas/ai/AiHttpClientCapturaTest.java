package com.gestionfinanzas.ai;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import java.net.InetSocketAddress;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

class AiHttpClientCapturaTest {
    @Test void cortaUnaRespuestaLocalQueTardaMasDeCincoSegundos() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            try { Thread.sleep(7000); exchange.sendResponseHeaders(200, -1); }
            catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            finally { exchange.close(); }
        });
        server.start();
        try {
            var client = new AiHttpClient().configurarCaptura(RestClient.builder())
                    .baseUrl("http://127.0.0.1:" + server.getAddress().getPort()).build();
            long inicio = System.nanoTime();
            assertThrows(ResourceAccessException.class, () -> client.get().uri("/").retrieve().toBodilessEntity());
            long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);
            assertTrue(ms >= 4000 && ms < 12000, "Tiempo de espera observado: " + ms + " ms");
        } finally { server.stop(0); }
    }
}
