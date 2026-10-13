package com.gestionfinanzas.security;
import com.gestionfinanzas.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LimiteAbusoTest {
    @Test void falloAlAbrirTransaccionCompartidaDevuelveIndisponibilidad() {
        var store=mock(LimiteAbusoCompartido.class);
        var provider=new org.springframework.beans.factory.support.StaticListableBeanFactory();
        provider.addBean("store",store);
        doThrow(new org.springframework.transaction.CannotCreateTransactionException("detalle privado"))
                .when(store).comprobar(anyString(),anyInt(),any());
        var limite=new LimiteAbuso(provider.getBeanProvider(LimiteAbusoCompartido.class),"postgres");
        var error=assertThrows(com.gestionfinanzas.exception.LimiteNoDisponibleException.class,
                ()->limite.comprobar("usuario:1",5,Duration.ofMinutes(1)));
        assertFalse(error.getMessage().contains("detalle privado"));
    }
    @Test void expiraLaVentanaYNoBloqueaOtrosUsuarios() {
        Clock clock=mock(Clock.class);
        Instant now=Instant.parse("2026-10-10T00:00:00Z");
        when(clock.instant()).thenReturn(now);
        var limite=new LimiteAbuso(clock);
        for(int i=0;i<5;i++) limite.comprobar("usuario:1",5,Duration.ofMinutes(1));
        assertEquals(60,assertThrows(TooManyRequestsException.class,
                ()->limite.comprobar("usuario:1",5,Duration.ofMinutes(1))).retryAfterSeconds());
        assertDoesNotThrow(()->limite.comprobar("usuario:2",5,Duration.ofMinutes(1)));
        when(clock.instant()).thenReturn(now.plusSeconds(60));
        assertDoesNotThrow(()->limite.comprobar("usuario:1",5,Duration.ofMinutes(1)));
    }
    @Test void losIntentosConcurrentesNoSuperanElPresupuesto() throws Exception {
        var limite=new LimiteAbuso();
        try(var pool=Executors.newFixedThreadPool(10)) {
            var results=new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for(int i=0;i<40;i++) results.add(pool.submit(()->{
                try {limite.comprobar("registro",5,Duration.ofMinutes(1));return true;}
                catch(TooManyRequestsException error){return false;}
            }));
            int accepted=0;
            for(var result:results) if(result.get(10,TimeUnit.SECONDS)) accepted++;
            assertEquals(5,accepted);
        }
    }
}
