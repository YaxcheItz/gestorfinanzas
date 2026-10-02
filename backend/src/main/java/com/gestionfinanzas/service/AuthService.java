package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.LoginRequest;
import com.gestionfinanzas.dto.request.RegistroRequest;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Base64;
import java.security.SecureRandom;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final CategoriaRepository categoriaRepository;
    private final CuentaService cuentaService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SesionService sesionService;
    private final AuthAbuseGuard authAbuseGuard;

    @Transactional
    public SesionService.SesionEmitida registrar(RegistroRequest request) {
        if (usuarioRepository.existsByEmail(request.email().trim().toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Ya existe una cuenta registrada con este correo electrónico");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.nombre().trim())
                .email(request.email().trim().toLowerCase(Locale.ROOT))
                .passwordHash(passwordEncoder.encode(request.password()))
                .rol(RolUsuario.ROLE_USER)
                .activo(true)
                .build();

        Usuario guardado = usuarioRepository.save(usuario);

        // Sembrar categorías predeterminadas para el nuevo usuario
        crearCategoriasPredeterminadas(guardado);

        // Sembrar cuenta predeterminada para evitar que el usuario quede sin cuentas iniciales
        cuentaService.crearCuentaPredeterminada(guardado);

        return sesionService.emitir(guardado);
    }

    @Transactional
    public SesionService.SesionEmitida autenticarGoogle(
            String googleSubject,
            String nombre,
            String email,
            boolean emailGoogleAutoritativo
    ) {
        String emailNormalizado = email.trim().toLowerCase(Locale.ROOT);
        Usuario usuario = usuarioRepository.findByGoogleSubject(googleSubject).orElseGet(() -> {
            Usuario existente = usuarioRepository.findByEmail(emailNormalizado).orElse(null);
            if (existente != null) {
                if (existente.getGoogleSubject() != null || !emailGoogleAutoritativo) {
                    throw new BadCredentialsException(
                            "No se pudo usar Google con este correo. Inicia sesión con tu método habitual."
                    );
                }
                existente.setGoogleSubject(googleSubject);
                return usuarioRepository.save(existente);
            }

            byte[] passwordAleatoria = new byte[32];
            RANDOM.nextBytes(passwordAleatoria);
            Usuario nuevo = Usuario.builder()
                    .nombre(nombre.trim())
                    .email(emailNormalizado)
                    .passwordHash(passwordEncoder.encode(Base64.getUrlEncoder().withoutPadding()
                            .encodeToString(passwordAleatoria)))
                    .googleSubject(googleSubject)
                    .rol(RolUsuario.ROLE_USER)
                    .activo(true)
                    .build();
            Usuario guardado = usuarioRepository.save(nuevo);
            crearCategoriasPredeterminadas(guardado);
            cuentaService.crearCuentaPredeterminada(guardado);
            return guardado;
        });

        if (!usuario.isActivo()) {
            throw new BadCredentialsException("Esta cuenta está desactivada.");
        }
        return sesionService.emitir(usuario);
    }

    public SesionService.SesionEmitida login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        authAbuseGuard.assertLoginAllowed(email);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            request.password()
                    )
            );
        } catch (BadCredentialsException e) {
            authAbuseGuard.recordLoginFailure(email);
            throw new BadCredentialsException("Credenciales incorrectas: email o contraseña inválidos");
        }

        authAbuseGuard.recordLoginSuccess(email);
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        return sesionService.emitir(usuario);
    }

    private void crearCategoriasPredeterminadas(Usuario usuario) {
        List<Categoria> iniciales = List.of(
                Categoria.builder().usuario(usuario).nombre("Alimentos y Supermercado").tipo(TipoTransaccion.GASTO).icono("shopping-cart").color("#f59e0b").build(),
                Categoria.builder().usuario(usuario).nombre("Vivienda y Servicios").tipo(TipoTransaccion.GASTO).icono("home").color("#ef4444").build(),
                Categoria.builder().usuario(usuario).nombre("Transporte").tipo(TipoTransaccion.GASTO).icono("car").color("#3b82f6").build(),
                Categoria.builder().usuario(usuario).nombre("Salud y Bienestar").tipo(TipoTransaccion.GASTO).icono("heart").color("#ec4899").build(),
                Categoria.builder().usuario(usuario).nombre("Ocio y Salidas").tipo(TipoTransaccion.GASTO).icono("coffee").color("#8b5cf6").build(),
                Categoria.builder().usuario(usuario).nombre("Salario").tipo(TipoTransaccion.INGRESO).icono("briefcase").color("#10b981").build(),
                Categoria.builder().usuario(usuario).nombre("Inversiones").tipo(TipoTransaccion.INGRESO).icono("trending-up").color("#06b6d4").build(),
                Categoria.builder().usuario(usuario).nombre("Otros Ingresos").tipo(TipoTransaccion.INGRESO).icono("plus-circle").color("#84cc16").build()
        );
        categoriaRepository.saveAll(iniciales);
    }
}
