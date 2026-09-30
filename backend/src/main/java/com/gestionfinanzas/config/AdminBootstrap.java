package com.gestionfinanzas.config;

import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

/**
 * Sincroniza el rol de administrador al arrancar. Evita tener que entrar a la base de datos
 * a hacer un UPDATE manual: basta con declarar APP_ADMIN_EMAILS en el servidor. Si alguno de
 * esos correos no existe todavia no se crea la cuenta, simplemente se omite.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;

    @Value("${app.admin.emails:}")
    private String correosAdmin;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<String> correos = Arrays.stream(correosAdmin.split(","))
                .map(String::trim)
                .filter(correo -> !correo.isEmpty())
                .map(correo -> correo.toLowerCase())
                .distinct()
                .toList();

        for (String correo : correos) {
            usuarioRepository.findByEmail(correo).ifPresentOrElse(
                    usuario -> promoverSiHaceFalta(usuario),
                    () -> log.warn("APP_ADMIN_EMILES incluye {} pero no hay ninguna cuenta con ese correo.", correo)
            );
        }
    }

    private void promoverSiHaceFalta(Usuario usuario) {
        if (usuario.getRol() == RolUsuario.ROLE_ADMIN) {
            return;
        }
        usuario.setRol(RolUsuario.ROLE_ADMIN);
        usuarioRepository.save(usuario);
        log.info("Cuenta {} promovida a ROLE_ADMIN por APP_ADMIN_EMAILS.", usuario.getEmail());
    }
}
