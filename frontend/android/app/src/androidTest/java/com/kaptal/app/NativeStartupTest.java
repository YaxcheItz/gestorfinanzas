package com.kaptal.app;

import static org.junit.Assert.*;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NativeStartupTest {
    @Test
    public void networkStatePermissionIsGrantedForOfflineDetection() {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals(PackageManager.PERMISSION_GRANTED,
            context.checkSelfPermission(Manifest.permission.ACCESS_NETWORK_STATE));
    }

    @Test
    public void bundledAppStartsAndNativeHttpReachesPublicApi() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        var activity = (MainActivity) instrumentation.startActivitySync(
            new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        try {
            String startup = "false";
            for (int i = 0; i < 120; i++) {
                startup = evaluate(activity, "Boolean(window.Capacitor && document.querySelector('#email'))");
                if ("true".equals(startup)) break;
                SystemClock.sleep(250);
            }
            assertEquals("El formulario local debe abrir sin sesion", "true", startup);
            assertEquals("\"android\"", evaluate(activity, "window.Capacitor.getPlatform()"));
            assertEquals("\"https://localhost\"", evaluate(activity, "location.origin"));
            evaluate(activity, "window.__nativeHealth = 'pending'; fetch('https://kaptalgf.vercel.app/api/health')"
                + ".then(async r => { const body = await r.json(); window.__nativeHealth = r.status === 200 && body.status === 'UP' ? 'ok' : 'bad-response'; })"
                + ".catch(() => window.__nativeHealth = 'network-error'); true");
            String health = "\"pending\"";
            for (int i = 0; i < 180; i++) {
                health = evaluate(activity, "window.__nativeHealth");
                if (!"\"pending\"".equals(health)) break;
                SystemClock.sleep(250);
            }
            assertEquals("HTTP nativo debe alcanzar health publico por HTTPS", "\"ok\"", health);
            assertEquals("false", evaluate(activity, "Boolean(document.querySelector('#google-identity-services'))"));
        } finally {
            instrumentation.runOnMainSync(activity::finish);
        }
    }

    private String evaluate(MainActivity activity, String script) throws Exception {
        var result = new AtomicReference<String>();
        var done = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            activity.getBridge().getWebView().evaluateJavascript(script, value -> {
                result.set(value);
                done.countDown();
            }));
        assertTrue("WebView no respondio", done.await(10, TimeUnit.SECONDS));
        return result.get();
    }
}
