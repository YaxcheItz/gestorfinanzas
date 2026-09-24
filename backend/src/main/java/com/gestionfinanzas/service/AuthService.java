package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.LoginRequest;
import com.gestionfinanzas.dto.request.RegistroRequest;
import com.gestionfinanzas.dto.response.AuthResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.RolUsuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final CategoriaRepository categoriaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse registrar(RegistroRequest request) {
        if (usuarioRepository.existsByEmail(request.email().trim().toLowerCase())) {
            throw new IllegalArgumentException("Ya existe una cuenta registrada con este correo electrónico");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.nombre().trim())
                .email(request.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .rol(RolUsuario.ROLE_USER)
                .activo(true)
                .build();

        Usuario guardado = usuarioRepository.save(usuario);

        // Sembrar categorías predeterminadas para el nuevo usuario
        crearCategoriasPredeterminadas(guardado);

        String token = jwtUtil.generarToken(guardado.getEmail(), guardado.getId());
        return AuthResponse.of(token, guardado.getId(), guardado.getNombre(), guardado.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email().trim().toLowerCase(),
                            request.password()
                    )
            );
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Credenciales incorrectas: email o contraseña inválidos");
        }

        Usuario usuario = usuarioRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        String token = jwtUtil.generarToken(usuario.getEmail(), usuario.getId());
        return AuthResponse.of(token, usuario.getId(), usuario.getNombre(), usuario.getEmail());
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
