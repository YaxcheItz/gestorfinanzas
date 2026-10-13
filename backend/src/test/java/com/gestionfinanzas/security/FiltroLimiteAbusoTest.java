package com.gestionfinanzas.security;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class FiltroLimiteAbusoTest {
    @Test void proxyConfiableSeparaClientesYUnaIpInventadaNoEvadeElLimite() throws Exception {
        var filtro=new FiltroLimiteAbuso(new LimiteAbuso(),new OrigenSolicitud("10.0.0.1"));
        for(int cliente=1;cliente<=2;cliente++) for(int i=0;i<21;i++) {
            var request=new MockHttpServletRequest("POST","/api/auth/login");
            request.setRemoteAddr("10.0.0.1");
            request.addHeader("X-Forwarded-For","203.0.113."+i+",198.51.100."+cliente);
            var response=new MockHttpServletResponse();
            filtro.doFilter(request,response,(req,res)->{});
            assertEquals(i<20?200:429,response.getStatus());
        }
    }
    @Test void unaBaseDeLimitesCaidaBloqueaLaSolicitudCon503() throws Exception {
        var limite=org.mockito.Mockito.mock(LimiteAbuso.class);
        org.mockito.Mockito.doThrow(new com.gestionfinanzas.exception.LimiteNoDisponibleException())
                .when(limite).comprobar(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyInt(),org.mockito.ArgumentMatchers.any());
        var response=new MockHttpServletResponse();
        var accepted=new AtomicInteger();
        new FiltroLimiteAbuso(limite).doFilter(new MockHttpServletRequest("POST","/api/auth/login"),response,(request,result)->accepted.incrementAndGet());
        assertEquals(503,response.getStatus());assertEquals("5",response.getHeader("Retry-After"));assertEquals(0,accepted.get());
    }
    @Test void limitaExportacionesSinBloquearAOtroUsuario() throws Exception {
        var filtro=new FiltroLimiteAbuso(new LimiteAbuso());
        try {
            for(long id=1;id<=2;id++) {
                var usuario=new CustomUserDetails(com.gestionfinanzas.model.entity.Usuario.builder()
                        .id(id).nombre("Test").email("test@example.test").passwordHash("synthetic")
                        .rol(com.gestionfinanzas.model.enums.RolUsuario.ROLE_USER).activo(true).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(usuario,null,usuario.getAuthorities()));
                for(int i=0;i<7;i++) {
                    var res=new MockHttpServletResponse();
                    filtro.doFilter(new MockHttpServletRequest("GET","/api/perfil/respaldo"),res,(request,response)->{});
                    assertEquals(i<6?200:429,res.getStatus());
                }
            }
        } finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
    @Test void unForwardedForFalsificadoNoEvadeElLimiteYRecibeRetryAfter() throws Exception {
        var filtro=new FiltroLimiteAbuso(new LimiteAbuso());
        var accepted=new AtomicInteger();
        for(int i=0;i<21;i++) {
            var req=new MockHttpServletRequest("POST","/api/auth/login");
            req.setRemoteAddr("127.0.0.1");req.addHeader("X-Forwarded-For","192.0.2."+i);
            var res=new MockHttpServletResponse();
            filtro.doFilter(req,res,(request,response)->accepted.incrementAndGet());
            if(i==20) {
                assertEquals(429,res.getStatus());
                assertTrue(Long.parseLong(res.getHeader("Retry-After"))>0);
                assertFalse(res.getContentAsString().contains("192.0.2"));
            }
        }
        assertEquals(20,accepted.get());
    }
    @Test void noImpideHealthPreflightNiCerrarSesion() throws Exception {
        var filtro=new FiltroLimiteAbuso(new LimiteAbuso());
        var accepted=new AtomicInteger();
        for(int i=0;i<30;i++) for(String ruta:new String[]{"/api/health","/api/auth/logout","/api/auth/login"}) {
            var req=new MockHttpServletRequest(ruta.endsWith("login")?"OPTIONS":ruta.endsWith("logout")?"POST":"GET",ruta);
            filtro.doFilter(req,new MockHttpServletResponse(),(request,response)->accepted.incrementAndGet());
        }
        assertEquals(90,accepted.get());
    }
}
