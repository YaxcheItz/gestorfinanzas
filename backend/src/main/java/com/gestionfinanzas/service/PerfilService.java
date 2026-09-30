package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CambiarPasswordRequest;
import com.gestionfinanzas.dto.request.PerfilActualizarRequest;
import com.gestionfinanzas.dto.response.PerfilResponse;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PerfilResponse obtener(Long usuarioId) {
        return PerfilResponse.fromEntity(buscarUsuario(usuarioId));
    }

    @Transactional
    public PerfilResponse actualizar(Long usuarioId, PerfilActualizarRequest request) {
        Usuario usuario = buscarUsuario(usuarioId);
        String email = request.email().trim().toLowerCase();
        if (usuarioRepository.existsByEmailAndIdNot(email, usuarioId)) {
            throw new IllegalArgumentException("Ya existe una cuenta registrada con este correo electrónico");
        }

        usuario.setNombre(request.nombre().trim());
        usuario.setEmail(email);
        usuario.setTemaPreferido(request.tema());
        usuario.setMonedaPreferida(request.monedaPredeterminada());
        if (request.telefono() != null) {
            usuario.setTelefono(request.telefono().trim());
        }
        if (request.notificacionesWhatsapp() != null) {
            usuario.setNotificacionesWhatsapp(request.notificacionesWhatsapp());
        }
        if (request.ocultarMontos() != null) {
            usuario.setOcultarMontos(request.ocultarMontos());
        }
        return PerfilResponse.fromEntity(usuarioRepository.save(usuario));
    }

    @Transactional
    public void cambiarPassword(Long usuarioId, CambiarPasswordRequest request) {
        Usuario usuario = buscarUsuario(usuarioId);
        if (!passwordEncoder.matches(request.passwordActual(), usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La contraseña actual es incorrecta");
        }
        if (passwordEncoder.matches(request.passwordNueva(), usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La nueva contraseña debe ser distinta a la actual");
        }
        usuario.setPasswordHash(passwordEncoder.encode(request.passwordNueva()));
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.save(usuario);
    }

    private Usuario buscarUsuario(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    }
}
