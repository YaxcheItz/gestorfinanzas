package com.kaptal.app;

import android.content.Context;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.exceptions.ClearCredentialException;
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
        synchronized (NotificationNoticeStore.class) {
        long previousUser = BankNotificationListener.user(getContext());
        if (closed || previousUser != userId) {
            new AutomaticBankStore(getContext()).clear();
            try { BankNotificationListener.store(getContext()).clear(); }
            catch (RuntimeException ex) { call.reject("No se pudo borrar la recepción de la sesión anterior."); return; }
        }
        boolean saved = getContext().getSharedPreferences("session_state", Context.MODE_PRIVATE)
            .edit().putBoolean("closed", closed).putLong("userId", closed ? 0 : userId).commit();
        if (!saved) { call.reject("No se pudo conservar el estado de la sesión."); return; }
        if (!closed) { call.resolve(); return; }
        // La marca de cierre ya esta persistida aunque falle el proveedor de credenciales.
        try {
            CredentialManager.create(getContext()).clearCredentialStateAsync(
                new ClearCredentialStateRequest(), null, ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override public void onResult(Void result) { call.resolve(); }
                    @Override public void onError(ClearCredentialException error) { call.resolve(); }
                });
        } catch (RuntimeException ex) { call.resolve(); }
        }
    }
}
