package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.VinculacionCanal;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.LimiteAbuso;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class VinculacionCanalService {
    private final VinculacionCanalRepository codigos;
    private final UsuarioRepository usuarios;
    private final SesionService sesiones;
    private final LimiteAbuso limite;
    private final jakarta.persistence.EntityManager entityManager;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public String aprobar(Long usuarioId, String challenge) {
        limite.comprobar("vincular-canal:" + usuarioId, 5, Duration.ofMinutes(1));
        codigos.deleteByVenceBefore(Instant.now());
        var usuario = usuarios.findByIdForUpdate(usuarioId).orElseThrow(this::invalido);
        entityManager.refresh(usuario);
        if (!usuario.isActivo()) throw invalido();
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String codigo = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var registro = new VinculacionCanal();
        registro.setHash(hash(codigo));
        registro.setUsuario(usuario);
        registro.setTokenVersion(usuario.getTokenVersion());
        registro.setChallenge(challenge);
        registro.setVence(Instant.now().plusSeconds(300));
        codigos.save(registro);
        return codigo;
    }

    @Transactional
    public SesionService.SesionEmitida intercambiar(String codigo, String verifier, String email) {
        var registro = codigos.bloquear(hash(codigo)).orElseThrow(this::invalido);
        String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(digest(verifier));
        if (!registro.getVence().isAfter(Instant.now())
                || !MessageDigest.isEqual(challenge.getBytes(StandardCharsets.US_ASCII),
                    registro.getChallenge().getBytes(StandardCharsets.US_ASCII))) throw invalido();
        // The same user lock as session rotation prevents resurrecting a revoked approval.
        var usuario = usuarios.findByIdForUpdate(registro.getUsuario().getId()).orElseThrow(this::invalido);
        entityManager.refresh(usuario);
        if (!registro.getVence().isAfter(Instant.now()) || !usuario.isActivo() || usuario.getTokenVersion() != registro.getTokenVersion()
                || !usuario.getEmail().equalsIgnoreCase(email)) throw invalido();
        codigos.delete(registro);
        codigos.flush();
        return sesiones.emitir(usuario);
    }

    private IllegalArgumentException invalido() {
        return new IllegalArgumentException("Codigo no valido o vencido. Inicia de nuevo la vinculacion.");
    }
    private static byte[] digest(String valor) {
        try { return MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.US_ASCII)); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static String hash(String valor) { return HexFormat.of().formatHex(digest(valor)); }
}
