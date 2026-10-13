package com.gestionfinanzas.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;
import java.net.InetAddress;
import java.util.Arrays;
import java.util.List;

/** Solo los saltos configurados explícitamente pueden aportar una IP reenviada. */
@Component
public class OrigenSolicitud {
    private final List<IpAddressMatcher> proxies;

    public OrigenSolicitud(@Value("${app.abuse.trusted-proxies:}") String configuracion) {
        proxies = configuracion.isBlank() ? List.of() : Arrays.stream(configuracion.split(",", -1))
                .map(String::trim).map(cidr -> {
                    String[] partes = cidr.split("/", -1);
                    String ip = partes.length <= 2 ? normalizar(partes[0]) : null;
                    if (ip == null) throw new IllegalArgumentException("Proxy de confianza inválido");
                    if (partes.length == 2) {
                        int bits;
                        try { bits = Integer.parseInt(partes[1]); }
                        catch (NumberFormatException error) { throw new IllegalArgumentException("CIDR inválido"); }
                        if (bits < 1 || bits > (ip.contains(":") ? 128 : 32))
                            throw new IllegalArgumentException("CIDR de confianza demasiado amplio o inválido");
                        return new IpAddressMatcher(ip + "/" + bits);
                    }
                    return new IpAddressMatcher(ip);
                }).toList();
    }

    public String obtener(HttpServletRequest request) {
        String origen = normalizar(request.getRemoteAddr());
        if (origen == null) return "desconocido";
        if (!confiable(origen)) return origen;
        var headers = request.getHeaders("X-Forwarded-For");
        if (!headers.hasMoreElements()) return origen;
        String valor = headers.nextElement();
        if (headers.hasMoreElements() || valor.length() > 2048) return origen;
        String[] saltos = valor.split(",", -1);
        if (saltos.length > 20) return origen;
        String actual = origen;
        for (int i = saltos.length - 1; i >= 0 && confiable(actual); i--) {
            String siguiente = normalizar(saltos[i].trim());
            if (siguiente == null) return origen;
            actual = siguiente;
        }
        return actual;
    }

    private boolean confiable(String ip) {
        return proxies.stream().anyMatch(proxy -> proxy.matches(ip));
    }

    private static String normalizar(String valor) {
        if (valor == null || valor.length() > 45) return null;
        if (valor.contains(":")) {
            if (!valor.matches("[0-9a-fA-F:.]+")) return null;
        } else {
            String[] octetos = valor.split("\\.", -1);
            if (octetos.length != 4) return null;
            for (String octeto : octetos) {
                if (!octeto.matches("0|[1-9][0-9]{0,2}") || Integer.parseInt(octeto) > 255) return null;
            }
        }
        try { return InetAddress.getByName(valor).getHostAddress(); }
        catch (java.net.UnknownHostException error) { return null; }
    }
}
