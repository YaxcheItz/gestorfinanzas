package com.gestionfinanzas.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class OrigenSolicitudTest {
    private String resolver(String proxies, String peer, String header) {
        var request=new MockHttpServletRequest();
        request.setRemoteAddr(peer);
        if (header != null) request.addHeader("X-Forwarded-For",header);
        return new OrigenSolicitud(proxies).obtener(request);
    }

    @Test void sinConfianzaExplicitaIgnoraLaCabecera() {
        assertEquals("10.0.0.1",resolver("","10.0.0.1","198.51.100.8"));
        assertEquals("198.51.100.9",resolver("10.0.0.1","198.51.100.9","198.51.100.8"));
    }
    @Test void recorreSoloSaltosDeConfianzaDesdeLaDerecha() {
        assertEquals("198.51.100.8",resolver("10.0.0.1,192.0.2.0/24","10.0.0.1","198.51.100.8,192.0.2.15"));
        assertEquals("198.51.100.9",resolver("10.0.0.1","10.0.0.1","203.0.113.99,198.51.100.9"));
    }
    @Test void formatosInvalidosNoPermitenElegirUnOrigen() {
        for(String header:new String[]{"localhost","unknown","198.51.100.9:443","198.51.100.9,","001.2.3.4","x".repeat(2049),"198.51.100.8,".repeat(21)})
            assertEquals("10.0.0.1",resolver("10.0.0.1","10.0.0.1",header));
        var request=new MockHttpServletRequest();request.setRemoteAddr("10.0.0.1");
        request.addHeader("X-Forwarded-For","198.51.100.8");request.addHeader("X-Forwarded-For","198.51.100.9");
        assertEquals("10.0.0.1",new OrigenSolicitud("10.0.0.1").obtener(request));
    }
    @Test void canonicalizaIpv6YRechazaDnsYConfianzaUniversal() {
        assertEquals(resolver("","2001:db8::1",null),resolver("","2001:0db8:0:0:0:0:0:1",null));
        assertEquals("198.51.100.8",resolver("2001:db8::/32","2001:db8::1","198.51.100.8"));
        for(String invalid:new String[]{"localhost","0.0.0.0/0","::/0","10.0.0.1/33","10.0.0.1,","10.0.0.1/no"})
            assertThrows(IllegalArgumentException.class,()->new OrigenSolicitud(invalid));
    }
}
