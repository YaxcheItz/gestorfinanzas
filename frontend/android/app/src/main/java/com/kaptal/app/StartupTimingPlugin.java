package com.kaptal.app;

import android.os.SystemClock;
import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Set;

@CapacitorPlugin(name = "StartupTiming")
public class StartupTimingPlugin extends Plugin {
    private static final String TAG = "KaptalArranque";
    private static final int WINDOW_MS = 300_000;
    private static final int MAX_EVENTS = 64;
    private static final Set<String> STAGES = Set.of(
        "web_js", "sesion_nativa", "entrada", "estructura", "espera_sesion",
        "inicio", "inicio_cargando", "inicio_datos", "inicio_error", "apertura_error"
    );
    private static final Set<String> REQUESTS = Set.of("renovacion", "perfil", "listas", "resumen");

    private static long started = -1;
    private static int events;

    static synchronized void begin() {
        started = SystemClock.elapsedRealtime();
        events = 0;
        Log.i(TAG, "phase=primer_plano elapsed_ms=0");
    }

    static synchronized void end() {
        started = -1;
    }

    @PluginMethod public void stage(PluginCall call) {
        String name = call.getString("name", "");
        if (!STAGES.contains(name)) {
            call.reject("Fase no admitida");
            return;
        }
        record(name, null, 0);
        call.resolve();
    }

    @PluginMethod public void request(PluginCall call) {
        String name = call.getString("name", "");
        Integer status = call.getInt("status");
        Integer duration = call.getInt("durationMs");
        if (!REQUESTS.contains(name) || status == null
            || (status != 0 && (status < 100 || status > 599))
            || duration == null || duration < 0 || duration > WINDOW_MS) {
            call.reject("Medición no admitida");
            return;
        }
        record(name, status, duration);
        call.resolve();
    }

    private static synchronized void record(String name, Integer status, int duration) {
        if (started < 0 || events >= MAX_EVENTS) return;
        long elapsed = SystemClock.elapsedRealtime() - started;
        // Evita asociar a esta apertura una solicitud iniciada antes de volver al primer plano.
        if (elapsed > WINDOW_MS || elapsed < duration) return;
        events++;
        if (status == null) {
            Log.i(TAG, "phase=" + name + " elapsed_ms=" + elapsed);
        } else {
            Log.i(TAG, "phase=" + name + " elapsed_ms=" + elapsed
                + " http=" + status + " request_ms=" + duration);
        }
    }
}
