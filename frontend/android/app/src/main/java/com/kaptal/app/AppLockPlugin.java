package com.kaptal.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppLock")
public class AppLockPlugin extends Plugin {
    @PluginMethod public void read(PluginCall call) {
        if (!(getActivity() instanceof MainActivity activity)) { call.unavailable("Pantalla no disponible."); return; }
        activity.runOnUiThread(() -> {
            if (activity.isDestroyed() || activity.isFinishing()) { call.unavailable("Pantalla cerrada."); return; }
            call.resolve(activity.appLock().state());
        });
    }
    @PluginMethod public void set(PluginCall call) {
        if (!(call.getData().opt("enabled") instanceof Boolean enabled)) {
            call.reject("El bloqueo debe ser verdadero o falso.", "INVALID_ARGUMENT"); return;
        }
        if (!(getActivity() instanceof MainActivity activity)) { call.unavailable("Pantalla no disponible."); return; }
        activity.runOnUiThread(() -> {
            if (activity.isDestroyed() || activity.isFinishing()) { call.unavailable("Pantalla cerrada."); return; }
            activity.appLock().set(call, enabled);
        });
    }
}
