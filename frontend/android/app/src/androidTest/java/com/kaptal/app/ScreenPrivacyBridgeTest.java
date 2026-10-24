package com.kaptal.app;

import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.WindowManager;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.HashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class ScreenPrivacyBridgeTest {
    @Test public void strictBooleanPersistsAcrossRecreationWithoutChangingSession() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        assertTrue("Only the QA app may run this test", context.getPackageName().endsWith(".debug"));
        var preferences = context.getSharedPreferences("screen_privacy", Context.MODE_PRIVATE);
        boolean existed = preferences.contains("enabled");
        boolean original = preferences.getBoolean("enabled", false);
        assertTrue(preferences.edit().remove("enabled").commit());
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(
                new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))) {
            waitBridge(scenario);
            var session = new HashMap<>(context.getSharedPreferences("session_state", Context.MODE_PRIVATE).getAll());
            scenario.onActivity(activity -> assertFalse(secure(activity)));
            assertEquals("false", invoke(scenario, "read", "{}"));
            for (String invalid : new String[]{"{}", "{enabled:'true'}", "{enabled:1}", "{enabled:null}"}) {
                assertEquals("\"INVALID_ARGUMENT\"", invoke(scenario, "set", invalid));
            }
            assertEquals("true", invoke(scenario, "set", "{enabled:true}"));
            assertEquals("true", invoke(scenario, "read", "{}"));
            scenario.onActivity(activity -> assertTrue(secure(activity)));
            assertTrue(preferences.getBoolean("enabled", false));
            scenario.recreate();
            scenario.onActivity(activity -> assertTrue(secure(activity)));
            waitBridge(scenario);
            assertEquals("true", invoke(scenario, "read", "{}"));
            assertEquals("false", invoke(scenario, "set", "{enabled:false}"));
            scenario.onActivity(activity -> assertFalse(secure(activity)));
            assertFalse(preferences.getBoolean("enabled", true));
            assertTrue(preferences.edit().putString("enabled", "invalid").commit());
            scenario.recreate();
            scenario.onActivity(activity -> assertTrue(secure(activity)));
            waitBridge(scenario);
            assertEquals("true", invoke(scenario, "read", "{}"));
            assertEquals("false", invoke(scenario, "set", "{enabled:false}"));
            scenario.onActivity(activity -> assertFalse(secure(activity)));
            assertTrue("Native session must remain unchanged",
                session.equals(context.getSharedPreferences("session_state", Context.MODE_PRIVATE).getAll()));
        } finally {
            var edit = preferences.edit();
            if (existed) edit.putBoolean("enabled", original); else edit.remove("enabled");
            assertTrue(edit.commit());
        }
    }

    private boolean secure(MainActivity activity) {
        return (activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) != 0;
    }
    private void waitBridge(ActivityScenario<MainActivity> scenario) throws Exception {
        for (int i = 0; i < 120; i++) {
            if ("true".equals(evaluate(scenario, "Boolean(window.Capacitor && window.Capacitor.nativePromise)"))) return;
            SystemClock.sleep(100);
        }
        fail("Native bridge did not become ready");
    }
    private String invoke(ActivityScenario<MainActivity> scenario, String method, String options) throws Exception {
        evaluate(scenario, "window.__screenPrivacyTest='pending';window.Capacitor.nativePromise('ScreenPrivacy','"
            + method + "'," + options + ").then(s=>window.__screenPrivacyTest=s.enabled,e=>window.__screenPrivacyTest=e.code);true");
        for (int i = 0; i < 120; i++) {
            String result = evaluate(scenario, "window.__screenPrivacyTest");
            if (!"\"pending\"".equals(result)) return result;
            SystemClock.sleep(100);
        }
        throw new AssertionError("Native privacy operation timed out");
    }
    private String evaluate(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        var result = new AtomicReference<String>(); var done = new CountDownLatch(1);
        scenario.onActivity(activity ->
            activity.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); done.countDown(); }));
        assertTrue(done.await(10, TimeUnit.SECONDS)); return result.get();
    }
}
