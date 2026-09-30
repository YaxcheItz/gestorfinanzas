package com.gestionfinanzas.config;

import java.io.IOException;
import java.util.Set;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Protege los dos endpoints que se autentican solo con la cookie de refresh.
 *
 * Con la cookie en SameSite=None hace falta esto. /login y /registro están a salvo sin nada
 * extra porque exigen un cuerpo JSON, y un formulario de otra página no puede enviar
 * application/json sin que el navegador pida permiso y CORS se lo niegue. /refresh y /logout
 * no dependen del cuerpo: un formulario de otra página podría enviarlos tal cual, con la
 * cookie puesta por el navegador, sin preguntar a nadie. Con SameSite=Lax eso no pasaba, y por
 * eso este filtro solo es necesario mientras la API siga en otro dominio.
 *
 * Se exige una cabecera propia porque un formulario o una petición simple de otra página no
 * pueden añadir cabeceras a medida, y para hacerlo el navegador lanza un preflight que CORS
 * solo concede a los orígenes de la lista. Así la petición de un atacante ni siquiera sale
 * del navegador. El valor no importa: lo que cuenta es que la cabecera exista.
 */
@Component
public class FiltroCsrfSesion extends OncePerRequestFilter {

    public static final String CABECERA = "X-Gestion-Sesion";

    private static final Set<String> RUTAS = Set.of("/api/auth/refresh", "/api/auth/logout");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (esPreflight(request) || !esRutaProtegida(request)) {
            chain.doFilter(request, response);
            return;
        }
        String cabecera = request.getHeader(CABECERA);
        if (cabecera == null || cabecera.isBlank()) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "Petición bloqueada: falta la cabecera " + CABECERA);
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean esRutaProtegida(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return false;
        }
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        return RUTAS.contains(ruta);
    }

    /**
     * El preflight OPTIONS llega sin la cabecera, ya que todavía no existe: ese lo responde
     * CORS, y bloquearlo aquí dejaría la petición legítima sin poder completarse.
     */
    private boolean esPreflight(HttpServletRequest request) {
        return HttpMethod.OPTIONS.matches(request.getMethod());
    }
}
