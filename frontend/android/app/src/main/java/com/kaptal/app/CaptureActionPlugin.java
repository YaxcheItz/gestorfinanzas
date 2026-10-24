package com.kaptal.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CaptureAction")
public class CaptureActionPlugin extends Plugin {
    private String pending;

    @Override protected synchronized void handleOnNewIntent(Intent intent) {
        String action = CaptureAction.parse(intent.getAction());
        if (action == null) return;
        pending = action;
        intent.setAction(Intent.ACTION_MAIN);
        notifyListeners("changed", new JSObject());
    }

    @PluginMethod public synchronized void consume(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) result.put("action", pending);
        pending = null;
        call.resolve(result);
    }
}
