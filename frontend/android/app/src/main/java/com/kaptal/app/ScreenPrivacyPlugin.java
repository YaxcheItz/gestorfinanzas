package com.kaptal.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenPrivacy")
public class ScreenPrivacyPlugin extends Plugin {
    static void applySavedPolicy(Activity activity) {
        boolean enabled;
        try { enabled = activity.getSharedPreferences("screen_privacy", Context.MODE_PRIVATE).getBoolean("enabled", false); }
        catch (RuntimeException error) { enabled = true; } // An unreadable preference must not expose the screen.
        apply(activity, enabled);
    }

    private static void apply(Activity activity, boolean enabled) {
        enabled = enabled || (activity instanceof MainActivity main && main.isAppLocked());
        if (enabled) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            activity.setRecentsScreenshotEnabled(!enabled);
    }
    private static boolean enabled(Activity activity) {
        return (activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) != 0;
    }

    @PluginMethod public void read(PluginCall call) {
        var activity = getActivity();
        if (activity == null) { call.unavailable("No se pudo acceder a la pantalla."); return; }
        activity.runOnUiThread(() -> {
            if (activity.isFinishing() || activity.isDestroyed()) { call.unavailable("La pantalla se está cerrando."); return; }
            try { call.resolve(new JSObject().put("enabled", enabled(activity))); }
            catch (RuntimeException error) { call.unavailable("No se pudo comprobar la pantalla."); }
        });
    }

    @PluginMethod public void set(PluginCall call) {
        Object value = call.getData().opt("enabled");
        if (!(value instanceof Boolean requested)) {
            call.reject("El estado de protección debe ser verdadero o falso.", "INVALID_ARGUMENT"); return;
        }
        var activity = getActivity();
        if (activity == null) { call.unavailable("No se pudo acceder a la pantalla."); return; }
        activity.runOnUiThread(() -> {
            if (activity.isFinishing() || activity.isDestroyed()) { call.unavailable("La pantalla se está cerrando."); return; }
            boolean previous = enabled(activity);
            SharedPreferences preferences = null;
            try {
                preferences = activity.getSharedPreferences("screen_privacy", Context.MODE_PRIVATE);
                if (!preferences.edit().putBoolean("enabled", requested).commit()) throw new IllegalStateException();
                apply(activity, requested);
                call.resolve(new JSObject().put("enabled", enabled(activity)));
            } catch (RuntimeException error) {
                try {
                    if (preferences != null) preferences.edit().putBoolean("enabled", previous).apply();
                    apply(activity, previous);
                }
                catch (RuntimeException ignored) { /* The caller must re-read the real window state. */ }
                call.reject("No se pudo guardar la protección de pantalla.", "STORAGE");
            }
        });
    }
}
