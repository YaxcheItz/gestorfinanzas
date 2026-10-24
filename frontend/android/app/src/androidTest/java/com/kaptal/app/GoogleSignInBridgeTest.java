package com.kaptal.app;

import android.content.Intent;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class GoogleSignInBridgeTest {
    @Test public void invalidClientDoesNotOpenOAuthAndLogoutPersistsClosedState() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        assertTrue("Only the QA app may run this test", context.getPackageName().endsWith(".debug"));
        var activity = (MainActivity) instrumentation.startActivitySync(
            new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        try {
            for (int i = 0; i < 120 && !"true".equals(evaluate(activity, "Boolean(window.Capacitor && document.querySelector('#email'))")); i++)
                SystemClock.sleep(250);
            evaluate(activity, "window.__googlePolicy='pending';window.Capacitor.nativePromise('GoogleSignIn','signIn',{clientId:'https://untrusted.example'})"
                + ".then(()=>window.__googlePolicy='unsafe',e=>window.__googlePolicy=e.code);true");
            assertEquals("\"CONFIGURATION\"", waitResult(activity, "window.__googlePolicy"));
            evaluate(activity, "window.__googleLogout='pending';window.Capacitor.nativePromise('NativeSession','update',{closed:true})"
                + ".then(()=>window.Capacitor.nativePromise('NativeSession','read',{}))"
                + ".then(s=>window.__googleLogout=s.closed&&s.userId===0?'closed':'unsafe',()=>window.__googleLogout='error');true");
            assertEquals("\"closed\"", waitResult(activity, "window.__googleLogout"));
        } finally { instrumentation.runOnMainSync(activity::finish); }
    }

    private String waitResult(MainActivity activity, String expression) throws Exception {
        String result = "\"pending\"";
        for (int i = 0; i < 120 && "\"pending\"".equals(result); i++) {
            result = evaluate(activity, expression); SystemClock.sleep(100);
        }
        return result;
    }

    private String evaluate(MainActivity activity, String script) throws Exception {
        var result = new AtomicReference<String>(); var done = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            activity.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); done.countDown(); }));
        assertTrue(done.await(10, TimeUnit.SECONDS)); return result.get();
    }
}
