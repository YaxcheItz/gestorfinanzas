package com.kaptal.app;

import android.app.KeyguardManager;
import android.provider.Settings;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import static org.junit.Assert.*;
import static org.junit.Assume.assumeTrue;

/** Opt-in phases around a real device lock/reboot; never uses the owner's queue or network. */
@RunWith(AndroidJUnit4.class)
public class AutomaticBankLifecycleTest {
    @Test public void encryptedQueueSurvivesPhysicalLifecycle() throws Exception {
        String phase = InstrumentationRegistry.getArguments().getString("lifecyclePhase");
        assumeTrue("Requires coordinated physical lock/reboot", phase != null);
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue(context.getPackageName().endsWith(".debug"));
        var store = new AutomaticBankStore(context, "bank-lifecycle-test.enc");
        var keyguard = context.getSystemService(KeyguardManager.class);
        int boot = Settings.Global.getInt(context.getContentResolver(), Settings.Global.BOOT_COUNT);
        if ("cleanup".equals(phase)) { store.clear(); assertEquals(0, store.read().length()); return; }
        if ("seed".equals(phase)) {
            assertFalse("Unlock before seeding", keyguard.isKeyguardLocked());
            assertTrue("Test requires a secure lock screen", keyguard.isDeviceSecure());
            store.clear();
            var rule = new JSONObject().put("id", "00000000-0000-4000-8000-000000000001")
                .put("proveedor", "SEARS").put("paquete", "com.google.android.apps.messaging")
                .put("remitente", "12345").put("terminacion", "1234");
            String date = LocalDate.now(ZoneId.of("America/Mexico_City")).format(DateTimeFormatter.BASIC_ISO_DATE);
            String body = "COMPRA AUTORIZADA EN TIENDA QA CON TU TARJETA SEARS VISA 1234 POR $25.10 MXN EL "
                + date + " CON AAUTORIZACION 987654";
            store.write(new JSONObject().put("userId", 71).put("expires", System.currentTimeMillis() + 3600000)
                .put("key", "synthetic-lifecycle-key").put("generation", "lifecycle-qa")
                .put("rules", new JSONArray().put(rule)).put("testBoot", boot).put("testBody", body));
            assertTrue(store.receive(71, "com.google.android.apps.messaging", "12345", body, "lifecycle", 100));
            var state = store.read();
            state.put("testPayload", state.getJSONArray("entries").getJSONObject(0).getJSONObject("payload").toString());
            store.write(state);
            return;
        }
        var state = store.read();
        assertEquals("lifecycle-qa", state.getString("generation"));
        assertEquals(1, state.getJSONArray("entries").length());
        var entry = state.getJSONArray("entries").getJSONObject(0);
        assertEquals("queued", entry.getString("status"));
        assertEquals(state.getString("testPayload"), entry.getJSONObject("payload").toString());
        if ("locked".equals(phase)) {
            assertTrue("Phone must actually be locked", keyguard.isKeyguardLocked());
            assertEquals(state.getInt("testBoot"), boot);
        } else if ("rebooted".equals(phase)) {
            assertFalse("Unlock after reboot", keyguard.isKeyguardLocked());
            assertTrue("A process restart is not a phone reboot", boot > state.getInt("testBoot"));
            store.removed("lifecycle");
            assertTrue(store.receive(71, "com.google.android.apps.messaging", "12345", state.getString("testBody"), "redelivery", 200));
            assertEquals("Redelivery after reboot must not duplicate", 1, store.read().getJSONArray("entries").length());
        } else {
            fail("Unknown lifecycle phase");
        }
    }
}
