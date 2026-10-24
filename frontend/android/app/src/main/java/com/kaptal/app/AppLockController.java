package com.kaptal.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

/** Local UI lock only: never changes the authenticated session or bank workers. */
final class AppLockController {
    private final MainActivity activity;
    private final NativeAuthenticationGate gate = new NativeAuthenticationGate();
    private final LinearLayout cover;
    private final TextView message;
    private boolean enabled, locked, authenticating, resumed, pendingResult;
    private CancellationSignal cancellation;
    private PluginCall settingCall;
    private Boolean requested;

    AppLockController(MainActivity activity) {
        this.activity = activity;
        try { enabled = activity.getSharedPreferences("app_lock", Context.MODE_PRIVATE).getBoolean("enabled", false); }
        catch (RuntimeException error) { enabled = true; }
        locked = enabled;
        cover = new LinearLayout(activity);
        cover.setOrientation(LinearLayout.VERTICAL);
        cover.setGravity(Gravity.CENTER);
        cover.setPadding(32, 32, 32, 32);
        cover.setBackgroundColor(Color.rgb(15, 23, 42));
        cover.setClickable(true);
        cover.setFocusable(true);
        message = new TextView(activity);
        message.setTextColor(Color.WHITE);
        message.setTextSize(20);
        message.setGravity(Gravity.CENTER);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) message.setAccessibilityHeading(true);
        cover.addView(message);
        Button unlock = new Button(activity);
        unlock.setText("Desbloquear con Android");
        unlock.setMinHeight((int) (48 * activity.getResources().getDisplayMetrics().density));
        unlock.setOnClickListener(view -> authenticate(null, null));
        cover.addView(unlock);
        Button settings = new Button(activity);
        settings.setText("Seguridad de Android");
        settings.setOnClickListener(view -> {
            try { activity.startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS)); }
            catch (RuntimeException error) { message.setText("Abre Seguridad desde los ajustes de Android."); }
        });
        cover.addView(settings);
        activity.addContentView(cover, new ViewGroup.LayoutParams(-1, -1));
        render();
    }

    boolean isLocked() { return locked; }
    @androidx.annotation.ChecksSdkIntAtLeast(api = Build.VERSION_CODES.R)
    private boolean supported() { return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R; }
    private boolean available() {
        if (!supported()) return false;
        try {
            var manager = activity.getSystemService(BiometricManager.class);
            var keyguard = activity.getSystemService(KeyguardManager.class);
            return manager != null && keyguard != null && keyguard.isDeviceSecure()
                && manager.canAuthenticate(authenticators()) == BiometricManager.BIOMETRIC_SUCCESS;
        } catch (RuntimeException error) { return false; }
    }
    @androidx.annotation.RequiresApi(Build.VERSION_CODES.R)
    private int authenticators() {
        return BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    }
    JSObject state() {
        return new JSObject().put("supported", supported()).put("enabled", enabled).put("available", available());
    }
    void set(PluginCall call, boolean value) {
        if (locked) { call.reject("Desbloquea Kaptal antes de cambiar esta opción.", "LOCKED"); return; }
        authenticate(call, value);
    }
    void resume() { resumed = true; gate.resume(); finishAuthentication(); render(); }
    void pause() {
        resumed = false; pendingResult = false;
        gate.pause();
        if (enabled) locked = true;
        render();
    }
    void destroy() {
        resumed = false;
        gate.destroy();
        if (cancellation != null) cancellation.cancel();
        if (settingCall != null) settingCall.reject("La pantalla se cerró. Comprueba el estado al volver.", "CANCELLED");
        settingCall = null;
    }
    private void authenticate(PluginCall call, Boolean value) {
        if (authenticating) {
            if (call != null) { call.reject("Ya hay una comprobación en curso.", "BUSY"); return; }
            if (cancellation != null) cancellation.cancel();
            failAuthentication("Comprobación anterior cancelada.");
        }
        if (!supported() || !available()) {
            message.setText("Kaptal sigue bloqueado. Configura el bloqueo de pantalla en Seguridad de Android.");
            if (call != null) call.reject("Configura el bloqueo de pantalla en Seguridad de Android.", "UNAVAILABLE");
            return;
        }
        authenticating = true; pendingResult = false; settingCall = call; requested = value;
        long attempt = gate.begin(SystemClock.elapsedRealtime());
        cancellation = new CancellationSignal();
        try {
            new BiometricPrompt.Builder(activity)
                .setTitle(value == null ? "Desbloquear Kaptal" : "Cambiar bloqueo de Kaptal")
                .setSubtitle("Usa la biometría o el bloqueo de este Android")
                .setAllowedAuthenticators(authenticators()).build()
                .authenticate(cancellation, activity.getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        if (!gate.isCurrent(attempt)) return;
                        pendingResult = true;
                        gate.success(attempt, SystemClock.elapsedRealtime()); finishAuthentication();
                    }
                    @Override public void onAuthenticationError(int code, CharSequence ignored) {
                        if (!gate.isCurrent(attempt)) return;
                        failAuthentication("No se completó la comprobación de Android. Puedes reintentar.");
                    }
                });
        } catch (RuntimeException error) { failAuthentication("No se pudo abrir la comprobación de Android."); }
    }
    private void finishAuthentication() {
        if (!authenticating || !pendingResult || !resumed) return;
        if (!gate.consume(SystemClock.elapsedRealtime())) {
            failAuthentication("La comprobación caducó. Desbloquea de nuevo con Android."); return;
        }
        try {
            if (requested != null) {
                if (!activity.getSharedPreferences("app_lock", Context.MODE_PRIVATE).edit()
                    .putBoolean("enabled", requested).commit()) throw new IllegalStateException();
                enabled = requested;
            }
            locked = false;
            if (settingCall != null) settingCall.resolve(state());
        } catch (RuntimeException error) {
            enabled = true; locked = true;
            if (settingCall != null) settingCall.reject("No se pudo guardar el bloqueo. Comprueba su estado.", "STORAGE");
        } finally {
            settingCall = null; requested = null; authenticating = false; pendingResult = false; cancellation = null; render();
        }
    }
    private void failAuthentication(String text) {
        gate.cancel(); authenticating = false; pendingResult = false; cancellation = null;
        message.setText(text);
        if (settingCall != null) settingCall.reject(text, "CANCELLED");
        settingCall = null; requested = null;
    }
    private void render() {
        if (locked) {
            var keyboard = activity.getSystemService(android.view.inputmethod.InputMethodManager.class);
            if (keyboard != null) keyboard.hideSoftInputFromWindow(activity.getBridge().getWebView().getWindowToken(), 0);
            activity.getBridge().getWebView().clearFocus();
        }
        activity.getBridge().getWebView().setVisibility(locked ? View.INVISIBLE : View.VISIBLE);
        cover.setVisibility(locked ? View.VISIBLE : View.GONE);
        if (locked) { message.setText("Kaptal está bloqueado"); cover.bringToFront(); }
        ScreenPrivacyPlugin.applySavedPolicy(activity);
        if (!locked) activity.getBridge().triggerWindowJSEvent("kaptal-screen-privacy-changed");
    }
}
