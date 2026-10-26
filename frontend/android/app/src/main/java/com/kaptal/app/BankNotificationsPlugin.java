package com.kaptal.app;

import android.app.KeyguardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "BankNotifications")
public class BankNotificationsPlugin extends Plugin {
    private boolean unlocked() { return !getContext().getSystemService(KeyguardManager.class).isKeyguardLocked(); }

    private long user(PluginCall call) {
        long user = BankNotificationListener.user(getContext());
        if (!unlocked() || user <= 0 || user != call.getData().optLong("userId", 0))
            throw new IllegalArgumentException("Abre tu sesión con el teléfono desbloqueado.");
        return user;
    }

    @PluginMethod public void read(PluginCall call) {
        synchronized (NotificationNoticeStore.class) {
            try {
                var store = BankNotificationListener.store(getContext());
                boolean granted = BankNotificationListener.granted(getContext());
                if (!granted) { store.clear(); new AutomaticBankStore(getContext()).clear(); }
                long owner = BankNotificationListener.user(getContext());
                if (owner != call.getData().optLong("userId", 0)) owner = 0;
                JSObject result = store.read(owner, System.currentTimeMillis(), unlocked());
                var notices=result.getJSONArray("notices");
                if(notices.length()>0) {
                    org.json.JSONObject automatic=null;
                    try { automatic=new AutomaticBankStore(getContext()).read(); } catch(Exception ex) { /* Keep original and configuration intact. */ }
                    for(int i=0;i<notices.length();i++) {
                        var notice=notices.getJSONObject(i);
                        String[] original=notice.getString("text").split("\n",2);
                        if(BankPurchaseParser.PACKAGES.get("SANTANDER").equals(notice.getString("packageName"))
                            &&BankPurchaseParser.isNonExpenseNotification(original[0],original.length>1?original[1]:"")) {
                            notices.remove(i--);continue;
                        }
                        try {
                            var details=automatic==null?new org.json.JSONObject().put("automaticStatus","unavailable")
                                :AutomaticBankStore.describe(automatic,owner,notice);
                            if("expenses_only".equals(details.optString("automaticStatus"))) { notices.remove(i--);continue; }
                            notice.put("automaticStatus",details.getString("automaticStatus"));
                            notice.put("automaticVersion",details.optString("automaticVersion"));
                            notice.put("canRetry",details.optBoolean("canRetry"));
                            if(details.has("preview"))notice.put("preview",details.getJSONObject("preview"));
                        } catch(Exception ex) { notice.put("automaticStatus","unavailable"); }
                    }
                }
                result.put("granted", granted);
                call.resolve(result);
            } catch (RuntimeException | org.json.JSONException ex) { call.reject("No se pudo leer la recepción de notificaciones."); }
        }
    }

    private Intent launcher() { return new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER); }

    @PluginMethod public void retryAutomatic(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try {
                long owner=user(call);
                if(!BankNotificationListener.granted(getContext()))throw new IllegalStateException();
                var notice=BankNotificationListener.store(getContext()).current(owner,call.getString("id",""),
                    call.getInt("revision",0),System.currentTimeMillis());
                new AutomaticBankStore(getContext()).retryNotice(owner,notice,call.getString("automaticVersion",""));
                AutomaticBankWorker.schedule(getContext());
                call.resolve();
            } catch(Exception ex) { call.reject("El aviso o la conexión cambió. Actualiza y comprueba tus movimientos."); }
        }
    }

    @PluginMethod public void apps(PluginCall call) {
        try {
            user(call);
            JSArray apps = new JSArray();
            Set<String> seen = new HashSet<>();
            PackageManager pm = getContext().getPackageManager();
            for (var info : pm.queryIntentActivities(launcher(), 0)) {
                String name = info.activityInfo.packageName;
                if (name.equals(getContext().getPackageName()) || !seen.add(name)) continue;
                JSObject app = new JSObject();
                app.put("packageName", name);
                app.put("label", info.loadLabel(pm).toString());
                apps.put(app);
            }
            call.resolve(new JSObject().put("apps", apps));
        } catch (RuntimeException ex) { call.reject("No se pudieron listar las aplicaciones."); }
    }

    @PluginMethod public void configure(PluginCall call) {
        synchronized (NotificationNoticeStore.class) {
            try {
                long owner = user(call);
                boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled"));
                Set<String> packages = new HashSet<>();
                JSArray values = call.getArray("packages", new JSArray());
                Set<String> installed = new HashSet<>();
                for (var info : getContext().getPackageManager().queryIntentActivities(launcher(), 0))
                    installed.add(info.activityInfo.packageName);
                for (int i = 0; i < values.length(); i++) {
                    String name = values.getString(i);
                    if (!installed.contains(name) || name.equals(getContext().getPackageName()))
                        throw new IllegalArgumentException("Aplicación no disponible.");
                    packages.add(name);
                }
                if (enabled && (!BankNotificationListener.granted(getContext())
                        || !Boolean.TRUE.equals(call.getBoolean("consent"))))
                    throw new IllegalArgumentException("Concede el acceso y acepta el alcance antes de activar.");
                BankNotificationListener.store(getContext()).configure(owner, enabled, packages, System.currentTimeMillis());
                if(!enabled) new AutomaticBankStore(getContext()).clear();
                if (enabled) android.service.notification.NotificationListenerService.requestRebind(
                    new android.content.ComponentName(getContext(), BankNotificationListener.class));
                call.resolve();
            } catch (RuntimeException | org.json.JSONException ex) { call.reject("No se pudo activar. Revisa acceso, sesión y aplicaciones elegidas."); }
        }
    }

    @PluginMethod public void settings(PluginCall call) {
        try {
            user(call);
            getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
            call.resolve();
        } catch (RuntimeException ex) { call.reject("No se pudieron abrir los ajustes de acceso."); }
    }

    @PluginMethod public void discard(PluginCall call) {
        synchronized (NotificationNoticeStore.class) {
            try {
                BankNotificationListener.store(getContext()).discard(user(call), call.getString("id", ""),
                    call.getInt("revision", 0), System.currentTimeMillis());
                call.resolve();
            } catch (RuntimeException | org.json.JSONException ex) { call.reject("El aviso o la sesión cambió. Vuelve a revisar."); }
        }
    }
}
