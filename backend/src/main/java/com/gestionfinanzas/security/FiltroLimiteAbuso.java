package com.gestionfinanzas.security;

import com.gestionfinanzas.exception.TooManyRequestsException;
import com.gestionfinanzas.exception.LimiteNoDisponibleException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

@Component
public class FiltroLimiteAbuso extends OncePerRequestFilter {
    private final LimiteAbuso limite;
    private final OrigenSolicitud origen;
    public FiltroLimiteAbuso(LimiteAbuso limite) { this(limite,new OrigenSolicitud("")); }
    @Autowired
    public FiltroLimiteAbuso(LimiteAbuso limite, OrigenSolicitud origen) {
        this.limite=limite; this.origen=origen;
    }
    private static final Map<String,Integer> PUBLICOS = Map.ofEntries(
        Map.entry("/api/auth/login",20),Map.entry("/api/auth/registro",5),Map.entry("/api/auth/google",20),
        Map.entry("/api/auth/recuperacion",5),Map.entry("/api/auth/recuperacion/confirmar",10),
        Map.entry("/api/auth/refresh",120),Map.entry("/api/notificaciones/whatsapp/verificar-pin",10),
        Map.entry("/api/auth/canal/intercambiar",10),Map.entry("/api/canales/whatsapp/vinculacion/evento",120),
        Map.entry("/api/canales/whatsapp/evento",240),Map.entry("/api/canales/whatsapp/evento/autorizar-respuesta",240));
    private static final Set<String> MUTACIONES = Set.of("POST","PUT","PATCH","DELETE");

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                              FilterChain chain) throws ServletException, IOException {
        String ruta=request.getRequestURI().substring(request.getContextPath().length());
        try {
            if ("POST".equals(request.getMethod()) && PUBLICOS.containsKey(ruta)) {
                // No confiar en X-Forwarded-For enviado por el cliente. Tras un proxy sin
                // configuración de confianza, este límite corresponde a la dirección del proxy.
                limite.comprobar("origen:"+origen.obtener(request)+":"+ruta,
                        PUBLICOS.get(ruta),Duration.ofMinutes(1));
            }
            var autenticacion=SecurityContextHolder.getContext().getAuthentication();
            if (!ruta.startsWith("/api/auth/") && !ruta.equals("/api/health")
                    && autenticacion != null && autenticacion.getPrincipal() instanceof CustomUserDetails usuario) {
                limite.comprobar("usuario:"+usuario.getId()+":total",600,Duration.ofMinutes(1));
                if (MUTACIONES.contains(request.getMethod())) {
                    limite.comprobar("usuario:"+usuario.getId()+":mutaciones",120,Duration.ofMinutes(1));
                }
                if (ruta.equals("/api/listas/unirse")) limite.comprobar("usuario:"+usuario.getId()+":invitaciones",10,Duration.ofMinutes(1));
                if (ruta.startsWith("/api/asistente/")
                        || (ruta.startsWith("/api/notificaciones/") && MUTACIONES.contains(request.getMethod()))) {
                    limite.comprobar("usuario:"+usuario.getId()+":costosas",20,Duration.ofMinutes(1));
                }
                if (ruta.equals("/api/perfil/respaldo") || ruta.equals("/api/transacciones/exportar")) {
                    limite.comprobar("usuario:"+usuario.getId()+":exportaciones",6,Duration.ofMinutes(1));
                }
            }
            chain.doFilter(request,response);
        } catch (LimiteNoDisponibleException error) {
            response.setStatus(503);
            response.setHeader("Retry-After","5");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"No se pudo comprobar el límite. Reintenta en un momento.\",\"data\":null}");
        } catch (TooManyRequestsException error) {
            response.setStatus(429);
            response.setHeader("Retry-After",Long.toString(error.retryAfterSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Demasiadas solicitudes. Espera antes de reintentar.\",\"data\":null}");
        }
    }
}
