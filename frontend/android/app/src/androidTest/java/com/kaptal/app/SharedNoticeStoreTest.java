package com.kaptal.app;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class SharedNoticeStoreTest {
    private SharedPreferences prefs;
    private SharedNoticeStore store;
    private final long now = 100000;
    @Before public void prepare() {
        prefs = InstrumentationRegistry.getInstrumentation().getTargetContext()
            .getSharedPreferences("shared_notice_test", Context.MODE_PRIVATE);
        prefs.edit().clear().commit();
        store = new SharedNoticeStore(prefs);
    }

    @Test public void persistsWithoutRevealingToAnotherUserAndExpires() throws Exception {
        store.receive("Compra de prueba por $42.00 MXN", now);
        assertFalse(store.read(0, now).getJSObject("pending").has("text"));
        String id = store.read(71, now).getJSObject("pending").getString("id");
        store = new SharedNoticeStore(prefs);
        assertTrue(store.read(71, now).getJSObject("pending").getString("text").contains("42.00"));
        assertFalse(store.read(72, now).getJSObject("pending").has("text"));
        assertEquals(id, store.read(71, now).getJSObject("pending").getString("id"));
        assertFalse(store.read(71, now + SharedNoticeStore.TTL_MS).has("pending"));
    }

    @Test public void repeatsKeepIdentityAndAnotherTextCannotOverwrite() throws Exception {
        store.receive("Compra de prueba por $42.00 MXN", now);
        String id = store.read(71, now).getJSObject("pending").getString("id");
        store.receive("Compra de prueba por $42.00 MXN", now + 1);
        assertEquals(id, store.read(71, now).getJSObject("pending").getString("id"));
        store.receive("Otra compra", now + 2);
        assertFalse(store.read(71, now).getString("error").isEmpty());
        assertEquals(id, store.read(71, now).getJSObject("pending").getString("id"));
        store.discard("otra-clave");
        assertTrue(store.read(71, now).has("pending"));
        store.discard(id);
        assertFalse(store.read(71, now).has("pending"));
    }

    @Test public void rejectsSecretsCardNumbersControlsAndOversizeBeforeStorage() throws Exception {
        for (String text : new String[]{"OTP de prueba 123456", "Tu NIP de prueba 1234",
                "tarjeta 4111 1111 1111 1111", "x".repeat(4001), "", "texto\u0000oculto"}) {
            store.receive(text, now);
            assertFalse(store.read(71, now).has("pending"));
            assertFalse(store.read(71, now).getString("error").isEmpty());
        }
    }
}
