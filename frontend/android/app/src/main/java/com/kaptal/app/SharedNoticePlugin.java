package com.kaptal.app;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SharedNotice")
public class SharedNoticePlugin extends Plugin {
    private SharedNoticeStore store;

    @Override public void load() {
        store = new SharedNoticeStore(getContext().getSharedPreferences("shared_notice", Context.MODE_PRIVATE));
    }

    @Override protected void handleOnNewIntent(Intent intent) {
        if (!Intent.ACTION_SEND.equals(intent.getAction()) || !"text/plain".equals(intent.getType())) return;
        try {
            CharSequence value = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            store.receive(value == null ? null : value.toString(), System.currentTimeMillis());
            // Consumir la intención evita volver a capturar al recrear la actividad.
            intent.removeExtra(Intent.EXTRA_TEXT);
            intent.setAction(Intent.ACTION_MAIN);
            notifyListeners("changed", new JSObject());
        } catch (RuntimeException ex) {
            // No registrar el texto ni los extras recibidos.
            android.widget.Toast.makeText(getContext(), "No se pudo conservar el texto compartido.", android.widget.Toast.LENGTH_LONG).show();
        }
    }

    @PluginMethod public void read(PluginCall call) {
        try { call.resolve(store.read(call.getData().optLong("userId", 0), System.currentTimeMillis())); }
        catch (RuntimeException ex) { call.reject("No se pudo leer el texto compartido."); }
    }

    @PluginMethod public void discard(PluginCall call) {
        try { store.discard(call.getString("id")); call.resolve(); }
        catch (RuntimeException ex) { call.reject("No se pudo descartar el texto compartido."); }
    }
}
