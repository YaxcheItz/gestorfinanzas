package com.kaptal.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
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
import android.widget.ImageView;
import android.widget.ScrollView;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

/** Local UI lock only: never changes the authenticated session or bank workers. */
final class AppLockController {
    private final MainActivity activity;
    private final NativeAuthenticationGate gate = new NativeAuthenticationGate();
    private final ScrollView cover;
    private final LinearLayout controls;
    private final TextView title, message;
    private final Button unlock, settings;
    private boolean enabled, locked, authenticating, resumed, pendingResult;
    private CancellationSignal cancellation;
    private PluginCall settingCall;
    private Boolean requested;

    AppLockController(MainActivity activity) {
        this.activity = activity;
        try { enabled = activity.getSharedPreferences("app_lock", Context.MODE_PRIVATE).getBoolean("enabled", false); }
        catch (RuntimeException error) { enabled = true; }
        locked = enabled;
        cover = new ScrollView(activity);
        cover.setFillViewport(true);
        cover.setPadding(dp(24), dp(24), dp(24), dp(24));
        cover.setClickable(true);
        cover.setFocusable(true);
        var content = new LinearLayout(activity);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        cover.addView(content, new ScrollView.LayoutParams(-1, -2));
        var icon = new ImageView(activity);
        icon.setImageResource(R.drawable.kaptal_icon);
        icon.setBackground(rounded(activity.getColor(R.color.kaptal_lock_surface), 20));
        icon.setClipToOutline(true);
        icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        var iconLayout = new LinearLayout.LayoutParams(dp(80), dp(80));
        iconLayout.bottomMargin = dp(20);
        content.addView(icon, iconLayout);
        title = new TextView(activity);
        title.setText("Kaptal");
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        title.setGravity(Gravity.CENTER);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) title.setAccessibilityHeading(true);
        content.addView(title);
        message = new TextView(activity);
        message.setText("Tu espacio, protegido.");
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(8), 0, dp(20));
        message.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(message);
        controls = new LinearLayout(activity);
        controls.setOrientation(LinearLayout.VERTICAL);
        content.addView(controls, new LinearLayout.LayoutParams(-1, -2));
        unlock = new Button(activity);
        unlock.setText("Desbloquear con Android");
        styleButton(unlock);
        unlock.setOnClickListener(view -> authenticate(null, null));
        controls.addView(unlock, new LinearLayout.LayoutParams(-1, -2));
        settings = new Button(activity);
        settings.setText("Seguridad de Android");
        styleButton(settings);
        settings.setOnClickListener(view -> {
            try { activity.startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS)); }
            catch (RuntimeException error) { message.setText("Abre Seguridad desde los ajustes de Android."); }
        });
        var settingsLayout = new LinearLayout.LayoutParams(-1, -2);
        settingsLayout.topMargin = dp(12);
        controls.addView(settings, settingsLayout);
        activity.addContentView(cover, new ViewGroup.LayoutParams(-1, -1));
        render();
    }

    private int dp(int value) { return Math.round(value * activity.getResources().getDisplayMetrics().density); }
    private GradientDrawable rounded(int color, int radius) {
        var background = new GradientDrawable(); background.setColor(color); background.setCornerRadius(dp(radius)); return background;
    }
    private void styleButton(Button button) {
        button.setAllCaps(false); button.setMinHeight(dp(48)); button.setMinimumWidth(0);
        button.setPadding(dp(20), dp(12), dp(20), dp(12)); button.setStateListAnimator(null); button.setElevation(0);
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
    void resume() {
        resumed = true; gate.resume(); finishAuthentication(); render();
        if (gate.shouldPrompt(enabled, locked, authenticating)) authenticate(null, null);
    }
    void pause() {
        resumed = false; pendingResult = false;
        gate.pause(authenticating);
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
        render();
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
        render();
        if (locked) unlock.requestFocus();
    }
    private void render() {
        if (locked) {
            var keyboard = activity.getSystemService(android.view.inputmethod.InputMethodManager.class);
            if (keyboard != null) keyboard.hideSoftInputFromWindow(activity.getBridge().getWebView().getWindowToken(), 0);
            activity.getBridge().getWebView().clearFocus();
        }
        activity.getBridge().getWebView().setVisibility(locked ? View.INVISIBLE : View.VISIBLE);
        cover.setVisibility(locked ? View.VISIBLE : View.GONE);
        if (locked) cover.bringToFront();
        cover.setBackgroundColor(activity.getColor(R.color.kaptal_lock_canvas));
        title.setTextSize(24); title.setTextColor(activity.getColor(R.color.kaptal_lock_content));
        message.setTextSize(16); message.setTextColor(activity.getColor(R.color.kaptal_lock_muted));
        message.setVisibility(authenticating ? View.GONE : View.VISIBLE);
        controls.setVisibility(authenticating ? View.GONE : View.VISIBLE);
        unlock.setTextSize(16); unlock.setTextColor(activity.getColor(R.color.kaptal_lock_on_brand));
        unlock.setBackground(rounded(activity.getColor(R.color.kaptal_lock_brand), 24));
        settings.setTextSize(16); settings.setTextColor(activity.getColor(R.color.kaptal_lock_content));
        settings.setBackground(rounded(activity.getColor(R.color.kaptal_lock_surface), 24));
        settings.setVisibility(available() ? View.GONE : View.VISIBLE);
        ScreenPrivacyPlugin.applySavedPolicy(activity);
        if (!locked) activity.getBridge().triggerWindowJSEvent("kaptal-screen-privacy-changed");
    }
}
