package com.kaptal.app;

import android.app.KeyguardManager;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name="AutomaticBank")
public class AutomaticBankPlugin extends Plugin {
    private long user(PluginCall call) {
        long uid=BankNotificationListener.user(getContext());
        if(uid<=0 || uid!=call.getData().optLong("userId") || getContext().getSystemService(KeyguardManager.class).isKeyguardLocked())
            throw new IllegalArgumentException("Open session required");
        return uid;
    }
    @PluginMethod public void read(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try {
                long uid=user(call);
                var prefs=getContext().getSharedPreferences("automatic_device",0);
                String device=prefs.getString("id",null);
                if(device==null) {
                    device=UUID.randomUUID().toString();
                    if(!prefs.edit().putString("id",device).commit()) throw new IllegalStateException();
                }
                var store=new AutomaticBankStore(getContext());
                var state=store.read();
                if(state.optLong("userId",uid)!=uid) { store.clear(); state=new JSONObject(); }
                int queued=0,registered=0,review=0;
                var reviews=new JSArray();
                var entries=state.optJSONArray("entries");
                if(entries!=null) for(int i=0;i<entries.length();i++) {
                    switch(entries.getJSONObject(i).optString("status")) {
                        case "queued": queued++; break;
                        case "registered": registered++; break;
                        default:
                            review++;
                            if(reviews.length()<20) reviews.put(entries.getJSONObject(i).getJSONObject("payload"));
                    }
                }
                boolean active=AutomaticBankStore.active(state,uid) && BankNotificationListener.granted(getContext());
                String reason=!BankNotificationListener.granted(getContext())?"permission":state.optBoolean("paused")?"reconnect"
                    :state.optJSONArray("rules")==null||state.getJSONArray("rules").length()==0?"not_configured"
                    :state.optLong("expires")<=System.currentTimeMillis()?"expired":state.optString("error");
                call.resolve(new JSObject().put("deviceId",device).put("active",active)
                    .put("reason",reason).put("entries",AutomaticBankStore.summaries(state))
                    .put("rules",state.optJSONArray("rules"))
                    .put("queued",queued).put("registered",registered).put("review",review)
                    .put("reviews",reviews)
                    .put("full",state.optBoolean("full")).put("error",state.optString("error")));
                if(active && queued>0) AutomaticBankWorker.ensure(getContext());
            } catch(Exception ex) { call.reject("No se pudo leer el registro automatico."); }
        }
    }
    private long validate(PluginCall call,JSONArray rules) throws Exception {
        long uid=user(call);
        if(!Boolean.TRUE.equals(call.getBoolean("consent"))||!BankNotificationListener.granted(getContext()))throw new IllegalArgumentException();
        if(rules==null||rules.length()<1||rules.length()>10)throw new IllegalArgumentException();
        AutomaticBankStore.checkPending(new AutomaticBankStore(getContext()).read(),uid,rules);
        for(int i=0;i<rules.length();i++)getContext().getPackageManager().getApplicationInfo(rules.getJSONObject(i).getString("paquete"),0);
        return uid;
    }
    @PluginMethod public void validate(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try { validate(call,call.getArray("rules"));call.resolve(); }
            catch(Exception ex) { call.reject("Comprueba el acceso de Android y que las apps bancarias elegidas estén instaladas. Conserva los envíos pendientes."); }
        }
    }
    @PluginMethod public void retry(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try {
                long uid=user(call);
                if(!BankNotificationListener.granted(getContext())||!AutomaticBankStore.active(new AutomaticBankStore(getContext()).read(),uid))throw new IllegalStateException();
                AutomaticBankWorker.retry(getContext());call.resolve();
            } catch(Exception ex) { call.reject("Restablece la conexión antes de reintentar."); }
        }
    }
    @PluginMethod public void configure(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try {
                var credential=call.getObject("credential");
                if(credential==null || !credential.getString("clave").matches("[A-Za-z0-9_-]{43}")) throw new IllegalArgumentException();
                var rules=credential.getJSONArray("reglas");
                long uid=validate(call,rules);
                var store=new AutomaticBankStore(getContext());
                var state=AutomaticBankStore.replacement(store.read(),uid,rules,credential.getString("clave"),
                    Instant.parse(credential.getString("vence")).toEpochMilli());
                java.util.Set<String> packages=new java.util.HashSet<>();
                for(int i=0;i<rules.length();i++) {
                    String pkg=rules.getJSONObject(i).getString("paquete");
                    getContext().getPackageManager().getApplicationInfo(pkg,0);
                    packages.add(pkg);
                }
                store.write(state);
                BankNotificationListener.store(getContext()).configure(uid,true,packages,System.currentTimeMillis());
                android.service.notification.NotificationListenerService.requestRebind(
                    new android.content.ComponentName(getContext(),BankNotificationListener.class));
                AutomaticBankWorker.retry(getContext());
                call.resolve();
            } catch(Exception ex) { call.reject("No se pudo conectar. Revisa acceso y movimientos pendientes."); }
        }
    }
    @PluginMethod public void clear(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try { user(call); BankNotificationListener.store(getContext()).clear(); new AutomaticBankStore(getContext()).clear(); call.resolve(); }
            catch(Exception ex) { call.reject("No se pudo desconectar el dispositivo."); }
        }
    }
}
