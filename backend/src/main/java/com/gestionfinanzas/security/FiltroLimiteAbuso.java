package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.TooManyRequestsException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class FiltroLimiteAbuso extends OncePerRequestFilter {
    private final LimiteAbuso limite;
    private static final Map<String,Integer> PUBLICOS = Map.of(
        "/api/auth/login",20, "/api/auth/registro",5, "/api/auth/google",20,
        "/api/auth/recuperacion",5, "/api/auth/recuperacion/confirmar",10,
        "/api/auth/refresh",120, "/api/notificaciones/whatsapp/verificar-pin",10);
    private static final Set<String> MUTACIONES = Set.of("POST","PUT","PATCH","DELETE");

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                              FilterChain chain) throws ServletException, IOException {
        String ruta=request.getRequestURI().substring(request.getContextPath().length());
        try {
            if ("POST".equals(request.getMethod()) && PUBLICOS.containsKey(ruta)) {
                // No confiar en X-Forwarded-For enviado por el cliente. Tras un proxy sin
                // configuración de confianza, este límite corresponde a la dirección del proxy.
                limite.comprobar("origen:"+request.getRemoteAddr()+":"+ruta,
                        PUBLICOS.get(ruta),Duration.ofMinutes(1));
            }
            var autenticacion=SecurityContextHolder.getContext().getAuthentication();
            if (!ruta.startsWith("/api/auth/") && !ruta.equals("/api/health")
                    && autenticacion != null && autenticacion.getPrincipal() instanceof CustomUserDetails usuario) {
                limite.comprobar("usuario:"+usuario.getId()+":total",600,Duration.ofMinutes(1));
                if (MUTACIONES.contains(request.getMethod())) {
                    limite.comprobar("usuario:"+usuario.getId()+":mutaciones",120,Duration.ofMinutes(1));
                }
                if (ruta.startsWith("/api/asistente/")
                        || (ruta.startsWith("/api/notificaciones/") && MUTACIONES.contains(request.getMethod()))) {
                    limite.comprobar("usuario:"+usuario.getId()+":costosas",20,Duration.ofMinutes(1));
                }
                if (ruta.equals("/api/perfil/respaldo") || ruta.equals("/api/transacciones/exportar")) {
                    limite.comprobar("usuario:"+usuario.getId()+":exportaciones",6,Duration.ofMinutes(1));
                }
            }
            chain.doFilter(request,response);
        } catch (TooManyRequestsException error) {
            response.setStatus(429);
            response.setHeader("Retry-After",Long.toString(error.retryAfterSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Demasiadas solicitudes. Espera antes de reintentar.\",\"data\":null}");
        }
    }
}
