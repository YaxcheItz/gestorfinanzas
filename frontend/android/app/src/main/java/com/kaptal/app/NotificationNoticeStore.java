package com.kaptal.app;

import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// Todos los accesos, incluido el cambio de sesión, usan este monitor en el proceso de la app.
final class NotificationNoticeStore {
    static final int MAX_PENDING = 20;
    static final int MAX_EVENTS = 100;
    static final long TTL_MS = SharedNoticeStore.TTL_MS;
    private final SharedPreferences prefs;

    NotificationNoticeStore(SharedPreferences prefs) { this.prefs = prefs; }

    void clear() {
        if (!prefs.edit().clear().commit()) throw new IllegalStateException("Almacenamiento no disponible.");
    }

    private JSONObject load(long now) throws JSONException {
        JSONObject state = new JSONObject(prefs.getString("state", "{}"));
        JSONArray entries = state.optJSONArray("entries");
        JSONArray kept = new JSONArray();
        if (entries != null) for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.getJSONObject(i);
            long at = entry.getLong("at");
            if (now >= at && now - at < TTL_MS) kept.put(entry);
        }
        state.put("entries", kept);
        return state;
    }

    private void save(JSONObject state) {
        if (!prefs.edit().putString("state", state.toString()).commit())
            throw new IllegalStateException("Almacenamiento no disponible.");
    }

    void configure(long user, boolean enabled, Set<String> packages, long now) throws JSONException {
        if (user <= 0 || packages.size() > 10 || (enabled && packages.isEmpty()))
            throw new IllegalArgumentException("Elige entre una y diez aplicaciones.");
        if (!enabled) { clear(); return; }
        JSONObject state = load(now);
        if (state.optLong("user") != user) state = new JSONObject().put("entries", new JSONArray());
        JSONArray entries = state.getJSONArray("entries");
        JSONArray kept = new JSONArray();
        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.getJSONObject(i);
            if (packages.contains(entry.getString("packageName"))) kept.put(entry);
        }
        state.put("entries", kept).put("user", user).put("enabled", true)
            .put("packages", new JSONArray(packages));
        save(state);
    }

    boolean accepts(long user, String packageName, long now) throws JSONException {
        JSONObject state = load(now);
        return user > 0 && state.optLong("user") == user && state.optBoolean("enabled")
            && packages(state).contains(packageName);
    }

    private Set<String> packages(JSONObject state) throws JSONException {
        Set<String> result = new HashSet<>();
        JSONArray values = state.optJSONArray("packages");
        if (values != null) for (int i = 0; i < values.length(); i++) result.add(values.getString(i));
        return result;
    }

    private static String hash(String key) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
            return result.toString();
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }

    void receive(long user, String packageName, String key, String text, long now) throws JSONException {
        if (!accepts(user, packageName, now)) return;
        JSONObject state = load(now);
        JSONArray entries = state.getJSONArray("entries");
        String identity = hash(packageName + "\n" + key);
        JSONObject existing = null;
        int pending = 0;
        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.getJSONObject(i);
            if (entry.has("text")) pending++;
            if (identity.equals(entry.getString("key")) && entry.optBoolean("active")) existing = entry;
        }
        // Una actualización con secretos invalida también el original que estaba pendiente.
        if (!SharedNoticeStore.safeText(text)) {
            if (existing != null) existing.remove("text");
            state.put("omitted", Math.min(999, state.optInt("omitted") + 1));
        } else if (existing != null) {
            if (existing.has("text") && !text.strip().equals(existing.getString("text"))) {
                existing.put("text", text.strip()).put("revision", existing.getInt("revision") + 1);
            }
            // Tras envío/descarte, las actualizaciones conservan la identidad consumida.
        } else if (pending >= MAX_PENDING || entries.length() >= MAX_EVENTS) {
            state.put("omitted", Math.min(999, state.optInt("omitted") + 1));
        } else {
            entries.put(new JSONObject().put("id", UUID.randomUUID().toString()).put("key", identity)
                .put("packageName", packageName).put("text", text.strip()).put("at", now)
                .put("revision", 1).put("active", true));
        }
        save(state);
    }

    void removed(String packageName, String key, long now) throws JSONException {
        JSONObject state = load(now);
        JSONArray entries = state.getJSONArray("entries");
        String identity = hash(packageName + "\n" + key);
        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.getJSONObject(i);
            if (identity.equals(entry.getString("key"))) entry.put("active", false);
        }
        save(state);
    }

    JSObject read(long user, long now, boolean unlocked) throws JSONException {
        JSONObject state = load(now);
        JSObject result = new JSObject();
        JSArray notices = new JSArray();
        boolean owner = user > 0 && state.optLong("user") == user;
        result.put("enabled", owner && state.optBoolean("enabled"));
        result.put("packages", owner ? new JSArray(packages(state).toArray()) : new JSArray());
        result.put("omitted", owner ? state.optInt("omitted") : 0);
        if (owner && unlocked) {
            JSONArray entries = state.getJSONArray("entries");
            for (int i = 0; i < entries.length(); i++) {
                JSONObject entry = entries.getJSONObject(i);
                if (!entry.has("text")) continue;
                JSObject notice = new JSObject();
                for (String field : new String[]{"id", "text", "packageName", "revision", "at"})
                    notice.put(field, entry.get(field));
                notices.put(notice);
            }
        }
        result.put("notices", notices);
        save(state);
        return result;
    }

    JSONObject current(long user,String id,int revision,long now) throws JSONException {
        var notices=read(user,now,true).getJSONArray("notices");
        for(int i=0;i<notices.length();i++) {
            var notice=notices.getJSONObject(i);
            if(id.equals(notice.getString("id"))&&revision==notice.getInt("revision"))return notice;
        }
        throw new IllegalArgumentException("Aviso actualizado o no disponible.");
    }
    void discard(long user, String id, int revision, long now) throws JSONException {
        JSONObject state = load(now);
        if (user <= 0 || state.optLong("user") != user) throw new IllegalArgumentException("Sesión cambiada.");
        JSONArray entries = state.getJSONArray("entries");
        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.getJSONObject(i);
            if (id.equals(entry.getString("id"))) {
                if (revision != entry.getInt("revision")) throw new IllegalArgumentException("Aviso actualizado.");
                entry.remove("text");
            }
        }
        save(state);
    }
}
