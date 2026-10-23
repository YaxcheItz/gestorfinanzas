package com.kaptal.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class BankNotificationListener extends NotificationListenerService {
    private final android.database.ContentObserver accessObserver = new android.database.ContentObserver(
            new android.os.Handler(android.os.Looper.getMainLooper())) {
        @Override public void onChange(boolean selfChange) { clearIfRevoked(); }
    };

    private void clearIfRevoked() {
        synchronized (NotificationNoticeStore.class) {
            try { if (!granted(this)) store(this).clear(); }
            catch (RuntimeException ex) { /* El plugin reintenta al abrir la bandeja. */ }
        }
    }

    @Override public void onCreate() {
        super.onCreate();
        getContentResolver().registerContentObserver(android.provider.Settings.Secure.getUriFor(
            "enabled_notification_listeners"), false, accessObserver);
    }

    @Override public void onDestroy() {
        getContentResolver().unregisterContentObserver(accessObserver);
        clearIfRevoked();
        super.onDestroy();
    }
    static NotificationNoticeStore store(Context context) {
        return new NotificationNoticeStore(context.getSharedPreferences("notification_notices", Context.MODE_PRIVATE));
    }

    static long user(Context context) {
        var prefs = context.getSharedPreferences("session_state", Context.MODE_PRIVATE);
        return prefs.getBoolean("closed", true) ? 0 : prefs.getLong("userId", 0);
    }

    static boolean granted(Context context) {
        ComponentName component = new ComponentName(context, BankNotificationListener.class);
        if (Build.VERSION.SDK_INT >= 27) return context.getSystemService(NotificationManager.class)
            .isNotificationListenerAccessGranted(component);
        String enabled = android.provider.Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        if (enabled != null) for (String value : enabled.split(":"))
            if (component.equals(ComponentName.unflattenFromString(value))) return true;
        return false;
    }

    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        synchronized (NotificationNoticeStore.class) {
            try {
                NotificationNoticeStore store = store(this);
                if (!granted(this)) { store.clear(); return; }
                long now = System.currentTimeMillis();
                long owner = user(this);
                // Filtrar paquete y sesión antes de acceder a extras o texto de la notificación.
                if (!getPackageName().equals(sbn.getOpPkg()) && !sbn.getPackageName().equals(sbn.getOpPkg())) return;
                if (!store.accepts(owner, sbn.getPackageName(), now)) return;
                Notification notification = sbn.getNotification();
                if ((notification.flags & (Notification.FLAG_GROUP_SUMMARY | Notification.FLAG_ONGOING_EVENT)) != 0) return;
                var extras = notification.extras;
                CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE, "");
                CharSequence body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
                if (body == null) body = extras.getCharSequence(Notification.EXTRA_TEXT, "");
                if (title.length() + body.length() > 3999) return;
                store.receive(owner, sbn.getPackageName(), sbn.getKey(), title + "\n" + body, now);
            } catch (RuntimeException | org.json.JSONException ex) {
                // Nunca registrar contenido ni extras bancarios; el estado se consulta al abrir Avisos.
            }
        }
    }

    @Override public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn == null) return;
        synchronized (NotificationNoticeStore.class) {
            try {
                NotificationNoticeStore store = store(this);
                long now = System.currentTimeMillis();
                if (store.accepts(user(this), sbn.getPackageName(), now))
                    store.removed(sbn.getPackageName(), sbn.getKey(), now);
            } catch (RuntimeException | org.json.JSONException ex) { /* Sin contenido en logs. */ }
        }
    }

    @Override public void onListenerDisconnected() {
        clearIfRevoked();
        if (granted(this)) requestRebind(new ComponentName(this, BankNotificationListener.class));
    }
}
