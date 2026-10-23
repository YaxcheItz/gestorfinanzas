package com.kaptal.app;

import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import java.util.UUID;
import java.util.regex.Pattern;

final class SharedNoticeStore {
    static final long TTL_MS = 24 * 60 * 60 * 1000L;
    private static final Pattern SECRET = Pattern.compile(
        "(?iu)\\b(otp|cvv|cvc|nip|pin|contrase[nñ]a|c[oó]digo de (?:seguridad|verificaci[oó]n|acceso))\\b");
    private static final Pattern CARD = Pattern.compile("(?<!\\d)(?:\\d[ -]?){13,19}(?!\\d)");
    private final SharedPreferences prefs;

    SharedNoticeStore(SharedPreferences prefs) { this.prefs = prefs; }

    private void expire(long now) {
        long at = prefs.getLong("at", 0);
        if (prefs.contains("id") && (now < at || now - at >= TTL_MS)) {
            prefs.edit().clear().commit();
        }
    }

    synchronized void receive(String text, long now) {
        expire(now);
        String error = null;
        if (text == null || text.isBlank() || text.length() > 4000) {
            error = "Comparte un texto de entre 1 y 4000 caracteres.";
        } else if (SECRET.matcher(text).find() || CARD.matcher(text).find()
                || text.matches("(?s).*[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f].*")) {
            error = "Comparte solo el movimiento, sin claves ni datos completos de tarjeta.";
        } else if (prefs.contains("id")) {
            if (text.strip().equals(prefs.getString("text", ""))) return;
            error = "Ya hay un texto pendiente. Revísalo o descártalo antes de compartir otro.";
        }
        if (error != null) {
            prefs.edit().putString("error", error).commit();
            return;
        }
        boolean saved = prefs.edit().clear().putString("id", UUID.randomUUID().toString())
            .putString("text", text.strip()).putLong("at", now).putLong("user", 0).commit();
        if (!saved) throw new IllegalStateException("No se pudo conservar el texto en el teléfono.");
    }

    synchronized JSObject read(long user, long now) {
        expire(now);
        JSObject result = new JSObject();
        result.put("error", prefs.getString("error", ""));
        if (!prefs.contains("id")) return result;
        JSObject pending = new JSObject();
        pending.put("id", prefs.getString("id", ""));
        long owner = prefs.getLong("user", 0);
        if (user > 0 && owner == 0) {
            if (!prefs.edit().putLong("user", user).commit()) {
                throw new IllegalStateException("No se pudo asociar el texto a esta sesión.");
            }
            owner = user;
        }
        if (user > 0 && owner == user) pending.put("text", prefs.getString("text", ""));
        else pending.put("anotherUser", owner > 0);
        result.put("pending", pending);
        return result;
    }

    synchronized void discard(String id) {
        if (id != null && id.equals(prefs.getString("id", null))) {
            if (!prefs.edit().clear().commit()) throw new IllegalStateException("No se pudo descartar el texto.");
        } else prefs.edit().remove("error").commit();
    }
}
