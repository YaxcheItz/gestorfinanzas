package com.kaptal.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSession")
public class NativeSessionPlugin extends Plugin {
    @PluginMethod public void read(PluginCall call) {
        var prefs = getContext().getSharedPreferences("session_state", Context.MODE_PRIVATE);
        JSObject state = new JSObject();
        state.put("closed", prefs.getBoolean("closed", false));
        state.put("userId", prefs.getLong("userId", 0));
        call.resolve(state);
    }

    @PluginMethod public void update(PluginCall call) {
        boolean closed = Boolean.TRUE.equals(call.getBoolean("closed"));
        long userId = call.getData().optLong("userId", 0);
        if (!closed && userId <= 0) { call.reject("Sesión no válida."); return; }
        boolean saved = getContext().getSharedPreferences("session_state", Context.MODE_PRIVATE)
            .edit().putBoolean("closed", closed).putLong("userId", closed ? 0 : userId).commit();
        if (saved) call.resolve(); else call.reject("No se pudo conservar el estado de la sesión.");
    }
}
