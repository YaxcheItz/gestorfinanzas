package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.response.PinVinculacionWhatsappResponse;
import com.gestionfinanzas.dto.response.VerificarPinWhatsappResponse;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class VinculacionWhatsappService {

    private static final int PIN_TTL_SECONDS = 600;
    private static final int PIN_COOLDOWN_SECONDS = 60;
    private static final int MAX_INTENTOS_FALLIDOS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${whatsapp.bot.phone:}")
    private String numeroBot;

    @Value("${whatsapp.bot.verification-token:}")
    private String tokenBot;

    public boolean botVerificacionDisponible() {
        return tokenBot != null && tokenBot.length() >= 32 && normalizarTelefono(numeroBot) != null;
    }

    public boolean tokenBotValido(String recibido) {
        if (!botVerificacionDisponible() || recibido == null || recibido.isBlank()) return false;
        return MessageDigest.isEqual(tokenBot.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                recibido.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Transactional
    public PinVinculacionWhatsappResponse generarPin(Long usuarioId) {
        if (!botVerificacionDisponible()) {
            throw new IllegalStateException("La verificación del bot de WhatsApp no está configurada.");
        }
        Usuario usuario = usuarioRepository.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        String telefono = normalizarTelefono(usuario.getTelefono());
        if (telefono == null) {
            throw new IllegalArgumentException("Agrega un teléfono válido con código de país en tu perfil.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        if (usuario.getWhatsappPinIssuedAt() != null
                && usuario.getWhatsappPinIssuedAt().plusSeconds(PIN_COOLDOWN_SECONDS).isAfter(ahora)) {
            throw new IllegalStateException("Espera un minuto antes de solicitar otro PIN.");
        }

        usuarioRepository.findByWhatsappPinPhone(telefono)
                .filter(otro -> !otro.getId().equals(usuarioId))
                .ifPresent(otro -> {
                    if (otro.getWhatsappPinExpiresAt() != null && otro.getWhatsappPinExpiresAt().isAfter(ahora)) {
                        throw new IllegalStateException("Ese teléfono ya tiene una vinculación pendiente.");
                    }
                    limpiarPin(otro);
                    usuarioRepository.saveAndFlush(otro);
                });

        String pin = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        usuario.setWhatsappPinHash(passwordEncoder.encode(pin));
        usuario.setWhatsappPinPhone(telefono);
        usuario.setWhatsappPinIssuedAt(ahora);
        usuario.setWhatsappPinExpiresAt(ahora.plusSeconds(PIN_TTL_SECONDS));
        usuario.setWhatsappPinFailedAttempts(0);
        usuarioRepository.save(usuario);

        return new PinVinculacionWhatsappResponse(pin, PIN_TTL_SECONDS, soloDigitos(numeroBot));
    }

    @Transactional
    public VerificarPinWhatsappResponse verificarPin(String telefonoRecibido, String pin) {
        String telefono = normalizarTelefono(telefonoRecibido);
        if (telefono == null) return new VerificarPinWhatsappResponse(false, null);
        Usuario usuario = usuarioRepository.findByWhatsappPinPhoneForUpdate(telefono).orElse(null);
        if (usuario == null) return new VerificarPinWhatsappResponse(false, null);

        LocalDateTime ahora = LocalDateTime.now();
        String telefonoActual = normalizarTelefono(usuario.getTelefono());
        if (usuario.getWhatsappPinExpiresAt() == null
                || usuario.getWhatsappPinHash() == null
                || !usuario.getWhatsappPinExpiresAt().isAfter(ahora)
                || !telefono.equals(telefonoActual)) {
            invalidarPin(usuario);
            usuarioRepository.save(usuario);
            return new VerificarPinWhatsappResponse(false, null);
        }

        if (!passwordEncoder.matches(pin, usuario.getWhatsappPinHash())) {
            usuario.setWhatsappPinFailedAttempts(usuario.getWhatsappPinFailedAttempts() + 1);
            if (usuario.getWhatsappPinFailedAttempts() >= MAX_INTENTOS_FALLIDOS) invalidarPin(usuario);
            usuarioRepository.save(usuario);
            return new VerificarPinWhatsappResponse(false, null);
        }

        Long usuarioVerificadoId = usuario.getId();
        invalidarPin(usuario);
        usuarioRepository.save(usuario);
        return new VerificarPinWhatsappResponse(true, usuarioVerificadoId);
    }

    private void limpiarPin(Usuario usuario) {
        invalidarPin(usuario);
        usuario.setWhatsappPinIssuedAt(null);
    }

    private void invalidarPin(Usuario usuario) {
        usuario.setWhatsappPinHash(null);
        usuario.setWhatsappPinPhone(null);
        usuario.setWhatsappPinExpiresAt(null);
        usuario.setWhatsappPinFailedAttempts(0);
    }

    private String normalizarTelefono(String telefono) {
        if (telefono == null || telefono.isBlank()) return null;
        String limpio = telefono.trim().replaceAll("[^0-9]", "");
        if (limpio.startsWith("52") && !limpio.startsWith("521") && limpio.length() == 12) {
            limpio = "521" + limpio.substring(2);
        }
        if (!limpio.matches("[1-9][0-9]{7,14}")) return null;
        return "+" + limpio;
    }

    private String soloDigitos(String telefono) {
        return normalizarTelefono(telefono).substring(1);
    }
}
