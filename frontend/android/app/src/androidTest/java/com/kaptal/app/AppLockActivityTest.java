package com.kaptal.app;

import android.content.Context;
import android.view.View;
import android.view.WindowManager;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.HashMap;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class AppLockActivityTest {
    @Test public void coldStartRecreationAndResumeStayLockedWithoutChangingSession() {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("QA app only", context.getPackageName().endsWith(".debug"));
        var prefs = context.getSharedPreferences("app_lock", Context.MODE_PRIVATE);
        var privacy = context.getSharedPreferences("screen_privacy", Context.MODE_PRIVATE);
        boolean existed = prefs.contains("enabled"), original = prefs.getBoolean("enabled", false);
        boolean privacyExisted = privacy.contains("enabled"), privacyOriginal = privacy.getBoolean("enabled", false);
        var session = new HashMap<>(context.getSharedPreferences("session_state", Context.MODE_PRIVATE).getAll());
        assertTrue(prefs.edit().putBoolean("enabled", true).commit());
        assertTrue(privacy.edit().putBoolean("enabled", false).commit());
        try (var scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(this::assertLocked);
            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            scenario.onActivity(this::assertLocked);
            scenario.recreate();
            scenario.onActivity(this::assertLocked);
            assertTrue("Session preserved", session.equals(context.getSharedPreferences("session_state", Context.MODE_PRIVATE).getAll()));
            assertFalse("Screenshot preference preserved", privacy.getBoolean("enabled", true));
        } finally {
            var edit = prefs.edit(); if (existed) edit.putBoolean("enabled", original); else edit.remove("enabled");
            assertTrue(edit.commit());
            var privacyEdit = privacy.edit();
            if (privacyExisted) privacyEdit.putBoolean("enabled", privacyOriginal); else privacyEdit.remove("enabled");
            assertTrue(privacyEdit.commit());
        }
    }
    private void assertLocked(MainActivity activity) {
        assertTrue(activity.isAppLocked());
        assertEquals(View.INVISIBLE, activity.getBridge().getWebView().getVisibility());
        assertTrue((activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) != 0);
    }
}
