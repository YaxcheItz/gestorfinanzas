package com.gestionfinanzas.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.security.GeneralSecurityException;
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
        if (!isEnabled()) {
            throw new GoogleAuthUnavailableException();
        }

        try {
            GoogleIdToken token = verifier.verify(credential);
            if (token == null) throw invalidCredential();

            GoogleIdToken.Payload payload = token.getPayload();
            String subject = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            boolean verifiedEmail = Boolean.TRUE.equals(payload.getEmailVerified());
            if (subject == null || subject.isBlank() || email == null || email.isBlank() || !verifiedEmail) {
                throw invalidCredential();
            }

            String nombre = name == null || name.isBlank()
                    ? email.substring(0, email.indexOf('@'))
                    : name;
            if (nombre.length() > 100) nombre = nombre.substring(0, 100);
            boolean googleControlsEmail = email.toLowerCase(java.util.Locale.ROOT).endsWith("@gmail.com")
                    || payload.getHostedDomain() != null;

            return authService.autenticarGoogle(subject, nombre, email, googleControlsEmail);
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
