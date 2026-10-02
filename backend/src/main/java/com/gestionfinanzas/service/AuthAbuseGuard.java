package com.gestionfinanzas.service;

import com.gestionfinanzas.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/** Short-lived per-account throttles for credential guessing and recovery-email abuse. */
@Component
public class AuthAbuseGuard {
    private static final int MAX_TRACKED_EMAILS = 10_000;
    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final Duration RECOVERY_INTERVAL = Duration.ofMinutes(1);

    private final Map<String, LoginWindow> loginFailures = new LinkedHashMap<>(128, 0.75f, true);
    private final Map<String, Instant> recoveryRequests = new LinkedHashMap<>(128, 0.75f, true);

    public synchronized void assertLoginAllowed(String email) {
        Instant now = Instant.now();
        removeExpiredLoginWindows(now);
        LoginWindow window = loginFailures.get(hashEmail(email));
        if (window == null || window.startedAt().plus(LOGIN_WINDOW).isBefore(now)) return;
        if (window.failures() >= MAX_FAILED_LOGINS) {
            throw new TooManyRequestsException(
                    "Demasiados intentos. Espera antes de volver a intentarlo.",
                    secondsUntil(window.startedAt().plus(LOGIN_WINDOW), now)
            );
        }
    }

    public synchronized void recordLoginFailure(String email) {
        Instant now = Instant.now();
        String key = hashEmail(email);
        LoginWindow current = loginFailures.get(key);
        if (current == null || current.startedAt().plus(LOGIN_WINDOW).isBefore(now)) {
            current = new LoginWindow(now, 0);
        }
        loginFailures.put(key, new LoginWindow(current.startedAt(), current.failures() + 1));
        trim(loginFailures);
    }

    public synchronized void recordLoginSuccess(String email) {
        loginFailures.remove(hashEmail(email));
    }

    public synchronized void assertRecoveryAllowed(String email) {
        Instant now = Instant.now();
        removeExpiredRecoveryRequests(now);
        Instant previous = recoveryRequests.get(hashEmail(email));
        if (previous != null && previous.plus(RECOVERY_INTERVAL).isAfter(now)) {
            throw new TooManyRequestsException(
                    "Espera un minuto antes de solicitar otro enlace de recuperación.",
                    secondsUntil(previous.plus(RECOVERY_INTERVAL), now)
            );
        }
        recoveryRequests.put(hashEmail(email), now);
        trim(recoveryRequests);
    }

    private void removeExpiredLoginWindows(Instant now) {
        loginFailures.entrySet().removeIf(entry -> entry.getValue().startedAt().plus(LOGIN_WINDOW).isBefore(now));
    }

    private void removeExpiredRecoveryRequests(Instant now) {
        recoveryRequests.entrySet().removeIf(entry -> entry.getValue().plus(RECOVERY_INTERVAL).isBefore(now));
    }

    private <V> void trim(LinkedHashMap<String, V> entries) {
        while (entries.size() > MAX_TRACKED_EMAILS) {
            Iterator<Map.Entry<String, V>> iterator = entries.entrySet().iterator();
            if (!iterator.hasNext()) return;
            iterator.next();
            iterator.remove();
        }
    }

    private static long secondsUntil(Instant deadline, Instant now) {
        return Math.max(1, Duration.between(now, deadline).toSeconds());
    }

    private static String hashEmail(String email) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(email.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private record LoginWindow(Instant startedAt, int failures) {}
}
