package com.kaptal.app;

import static org.junit.Assert.*;
import static org.junit.Assume.assumeTrue;
import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.Set;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class BankNotificationListenerTest {
    private static void shell(String command) throws Exception {
        var automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        try (var descriptor = automation.executeShellCommand(command);
             var input = new java.io.FileInputStream(descriptor.getFileDescriptor())) { input.readAllBytes(); }
    }
    private interface Check { boolean run() throws Exception; }
    private static void until(Check check) throws Exception {
        long end = android.os.SystemClock.elapsedRealtime() + 10000;
        while (!check.run() && android.os.SystemClock.elapsedRealtime() < end) Thread.sleep(100);
        assertTrue("No se recibió el estado esperado del servicio", check.run());
    }

    @Test public void actualSyntheticDeliveryUpdateAndRevocation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String pkg = context.getPackageName();
        assumeTrue("Solo instalación debug", pkg.endsWith(".debug"));
        assumeTrue("No cambiar un permiso previamente concedido", !BankNotificationListener.granted(context));
        var session = context.getSharedPreferences("session_state", Context.MODE_PRIVATE);
        boolean previousClosed = session.getBoolean("closed", true);
        long previousUser = session.getLong("userId", 0);
        var prefs = context.getSharedPreferences("notification_notices", Context.MODE_PRIVATE);
        String previousState = prefs.getString("state", null);
        assumeTrue("No reemplazar una configuración existente", previousState == null
            || !new org.json.JSONObject(previousState).optBoolean("enabled"));
        boolean postGranted = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        String component = pkg + "/com.kaptal.app.BankNotificationListener";
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        String channel = "kaptal_synthetic_test";
        try {
            session.edit().putBoolean("closed", false).putLong("userId", 710071).commit();
            synchronized (NotificationNoticeStore.class) {
                // Solo este emisor sintético de QA, nunca se eligen apps del propietario.
                BankNotificationListener.store(context).configure(710071, true, Set.of(pkg), System.currentTimeMillis());
            }
            if (!postGranted) shell("pm grant " + pkg + " android.permission.POST_NOTIFICATIONS");
            manager.createNotificationChannel(new NotificationChannel(channel, "QA sintética Kaptal", NotificationManager.IMPORTANCE_LOW));
            shell("cmd notification allow_listener " + component);
            until(() -> BankNotificationListener.granted(context));
            Thread.sleep(700);
            var builder = new Notification.Builder(context, channel).setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Banco sintético QA").setContentText("Compra de prueba 42 MXN");
            manager.notify(710071, builder.build());
            until(() -> notices(context).length() == 1);
            String id = notices(context).getJSONObject(0).getString("id");
            manager.notify(710071, builder.setContentText("Compra de prueba 43 MXN").build());
            until(() -> notices(context).getJSONObject(0).getInt("revision") == 2);
            assertEquals(id, notices(context).getJSONObject(0).getString("id"));
            manager.notify(710072, builder.setContentText("Otra compra de prueba 43 MXN").build());
            until(() -> notices(context).length() == 2);
            shell("cmd notification disallow_listener " + component);
            until(() -> !BankNotificationListener.granted(context));
            until(() -> { synchronized (NotificationNoticeStore.class) {
                return !BankNotificationListener.store(context).accepts(710071, pkg, System.currentTimeMillis());
            }});
            manager.notify(710073, builder.setContentText("Compra tras revocación").build());
            Thread.sleep(500); assertEquals(0, notices(context).length());
        } finally {
            shell("cmd notification disallow_listener " + component);
            manager.cancel(710071); manager.cancel(710072); manager.cancel(710073);
            manager.deleteNotificationChannel(channel);
            // Revocar POST_NOTIFICATIONS mata el proceso: el ejecutor externo lo restaura al terminar.
            synchronized (NotificationNoticeStore.class) {
                BankNotificationListener.store(context).clear();
                if (previousState != null) prefs.edit().putString("state", previousState).commit();
                session.edit().putBoolean("closed", previousClosed).putLong("userId", previousUser).commit();
            }
        }
    }
    private static org.json.JSONArray notices(Context context) throws Exception {
        synchronized (NotificationNoticeStore.class) {
            return BankNotificationListener.store(context).read(710071, System.currentTimeMillis(), true).getJSONArray("notices");
        }
    }
}
