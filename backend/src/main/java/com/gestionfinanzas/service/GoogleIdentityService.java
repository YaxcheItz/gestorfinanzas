package com.gestionfinanzas.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.List;

@Service
public class GoogleIdentityService {
    private final AuthService authService;

    @Value("${app.auth.google.client-id:}")
    private String clientId;
    private GoogleIdTokenVerifier verifier;

    public GoogleIdentityService(AuthService authService) {
        this.authService = authService;
    }

    @PostConstruct
    void initializeVerifier() {
        if (!isEnabled()) return;
        try {
            verifier = new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(), JacksonFactory.getDefaultInstance())
                    .setAudience(List.of(clientId.trim()))
                    .build();
        } catch (GeneralSecurityException | IOException exception) {
            throw new IllegalStateException("No se pudo preparar la validación de Google", exception);
        }
    }

    public boolean isEnabled() {
        return clientId != null && !clientId.isBlank();
    }

    public SesionService.SesionEmitida autenticar(String credential) {
        GoogleIdToken.Payload payload = validarCredencial(credential);
        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String nombre = name == null || name.isBlank()
                ? email.substring(0, email.indexOf('@'))
                : name;
        if (nombre.length() > 100) nombre = nombre.substring(0, 100);
        boolean googleControlsEmail = email.toLowerCase(java.util.Locale.ROOT).endsWith("@gmail.com")
                || payload.getHostedDomain() != null;

        return authService.autenticarGoogle(payload.getSubject(), nombre, email, googleControlsEmail);
    }

    public String verificarReautenticacionReciente(String credential) {
        GoogleIdToken.Payload payload = validarCredencial(credential);
        Long issuedAt = payload.getIssuedAtTimeSeconds();
        long ahora = Instant.now().getEpochSecond();
        if (issuedAt == null || issuedAt > ahora + 60 || ahora - issuedAt > 300) {
            throw new BadCredentialsException("Vuelve a confirmar tu cuenta de Google antes de eliminarla.");
        }
        return payload.getSubject();
    }

    private GoogleIdToken.Payload validarCredencial(String credential) {
        if (!isEnabled()) throw new GoogleAuthUnavailableException();
        try {
            GoogleIdToken token = verifier.verify(credential);
            if (token == null) throw invalidCredential();
            GoogleIdToken.Payload payload = token.getPayload();
            if (payload.getSubject() == null || payload.getSubject().isBlank()
                    || payload.getEmail() == null || payload.getEmail().isBlank()
                    || !Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw invalidCredential();
            }
            return payload;
        } catch (BadCredentialsException | GoogleAuthUnavailableException exception) {
            throw exception;
        } catch (GeneralSecurityException | IOException | RuntimeException exception) {
            throw invalidCredential();
        }
    }

    public String clientId() {
        return isEnabled() ? clientId.trim() : null;
    }

    private BadCredentialsException invalidCredential() {
        return new BadCredentialsException("No se pudo validar la cuenta de Google. Inténtalo de nuevo.");
    }
}
