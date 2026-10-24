package com.kaptal.app;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.Set;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NotificationNoticeStoreTest {
    private SharedPreferences prefs;
    private NotificationNoticeStore store;
    private final long now = 100000;
    private final String app = "test.bank.synthetic";
    @Before public void prepare() throws Exception {
        prefs = InstrumentationRegistry.getInstrumentation().getTargetContext()
            .getSharedPreferences("notification_notices_test", Context.MODE_PRIVATE);
        prefs.edit().clear().commit(); store = new NotificationNoticeStore(prefs);
    }
    private void enable() throws Exception { store.configure(71, true, Set.of(app), now); }
    private int count() throws Exception { return store.read(71, now, true).getJSONArray("notices").length(); }

    @Test public void defaultsOffAndFiltersSessionAndPackage() throws Exception {
        assertFalse(store.accepts(71, app, now)); enable();
        assertFalse(store.accepts(0, app, now)); assertFalse(store.accepts(72, app, now));
        assertFalse(store.accepts(71, "other.app", now)); assertTrue(store.accepts(71, app, now));
        store.receive(72, app, "a", "Compra QA", now);
        store.receive(71, "other.app", "a", "Compra QA", now); assertEquals(0, count());
    }
    @Test public void repeatsAndUpdatesKeepIdentityAndConsumedUpdatesDoNotReappear() throws Exception {
        enable(); store.receive(71, app, "a", "Compra QA 42 MXN", now);
        var first = store.read(71, now, true).getJSONArray("notices").getJSONObject(0);
        String id = first.getString("id");
        store.receive(71, app, "a", "Compra QA 42 MXN", now + 1); assertEquals(1, count());
        store.receive(71, app, "a", "Compra QA 43 MXN", now + 2);
        var updated = store.read(71, now + 2, true).getJSONArray("notices").getJSONObject(0);
        assertEquals(id, updated.getString("id")); assertEquals(2, updated.getInt("revision"));
        try { store.discard(71, id, 1, now + 2); fail("Revisión antigua aceptada"); }
        catch (IllegalArgumentException expected) { }
        store.discard(71, id, 2, now + 2);
        store = new NotificationNoticeStore(prefs);
        store.receive(71, app, "a", "Compra QA 44 MXN", now + 3); assertEquals(0, count());
    }
    @Test public void distinctPublicationsAndNewLifecycleArePreserved() throws Exception {
        enable(); store.receive(71, app, "a", "Compra QA 42 MXN", now);
        store.receive(71, app, "b", "Compra QA 42 MXN", now); assertEquals(2, count());
        store.removed(app, "a", now); store.receive(71, app, "a", "Compra QA 42 MXN", now);
        assertEquals(3, count());
    }
    @Test public void persistenceIsolationLockAndExpiry() throws Exception {
        enable(); store.receive(71, app, "a", "Compra QA 42 MXN", now);
        store = new NotificationNoticeStore(prefs); assertEquals(1, count());
        assertEquals(0, store.read(72, now, true).getJSONArray("notices").length());
        assertEquals(0, store.read(71, now, false).getJSONArray("notices").length());
        assertEquals(0, store.read(71, now + NotificationNoticeStore.TTL_MS, true).getJSONArray("notices").length());
        assertFalse(prefs.getString("state", "").contains("Compra QA"));
    }
    @Test public void secretsAreRejectedAndUnsafeUpdateRemovesOriginal() throws Exception {
        enable();
        for (String text : new String[]{"OTP 123456", "NIP 1234", "4111 1111 1111 1111", "x".repeat(4001), "", "a\u0000b"})
            store.receive(71, app, "bad", text, now);
        assertEquals(0, count()); assertFalse(prefs.getString("state", "").contains("123456"));
        store.receive(71, app, "a", "Compra QA", now);
        store.receive(71, app, "a", "CVV 123", now); assertEquals(0, count());
    }
    @Test public void limitsAndPauseAndAccountSwitchErasePrivateData() throws Exception {
        enable();
        for (int i = 0; i < 25; i++) store.receive(71, app, "key" + i, "Compra QA", now);
        assertEquals(NotificationNoticeStore.MAX_PENDING, count());
        assertEquals(5, store.read(71, now, true).getInt("omitted"));
        store.configure(72, true, Set.of(app), now); assertEquals(0, count());
        store.receive(72, app, "new", "Privado QA", now);
        store.configure(72, false, Set.of(), now);
        assertFalse(prefs.contains("state")); assertFalse(store.accepts(72, app, now));
    }
    @Test public void removingPackagePurgesItsContent() throws Exception {
        store.configure(71, true, Set.of(app, "test.other"), now);
        store.receive(71, app, "a", "Compra QA", now);
        store.configure(71, true, Set.of("test.other"), now); assertEquals(0, count());
        assertFalse(prefs.getString("state", "").contains("Compra QA"));
    }
}
