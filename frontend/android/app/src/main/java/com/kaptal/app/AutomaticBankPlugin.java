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
                call.resolve(new JSObject().put("deviceId",device).put("active",active)
                    .put("rules",state.optJSONArray("rules"))
                    .put("queued",queued).put("registered",registered).put("review",review)
                    .put("reviews",reviews)
                    .put("full",state.optBoolean("full")).put("error",state.optString("error")));
                if(active && queued>0) AutomaticBankWorker.schedule(getContext());
            } catch(Exception ex) { call.reject("No se pudo leer el registro automatico."); }
        }
    }
    @PluginMethod public void configure(PluginCall call) {
        synchronized(NotificationNoticeStore.class) {
            try {
                long uid=user(call);
                if(!Boolean.TRUE.equals(call.getBoolean("consent")) || !BankNotificationListener.granted(getContext())) throw new IllegalArgumentException();
                var credential=call.getObject("credential");
                if(credential==null || !credential.getString("clave").matches("[A-Za-z0-9_-]{43}")) throw new IllegalArgumentException();
                var rules=credential.getJSONArray("reglas");
                if(rules.length()<1 || rules.length()>10) throw new IllegalArgumentException();
                var state=new JSONObject().put("generation",UUID.randomUUID().toString()).put("userId",uid)
                    .put("key",credential.getString("clave")).put("expires",Instant.parse(credential.getString("vence")).toEpochMilli())
                    .put("rules",rules).put("entries",new JSONArray());
                var store=new AutomaticBankStore(getContext());
                // Preserve durable payloads when renewing a credential with unchanged rules.
                var previous=store.read();
                if(previous.optLong("userId")==uid && rules.toString().equals(String.valueOf(previous.optJSONArray("rules"))))
                    state.put("entries",previous.optJSONArray("entries"));
                else if(previous.optJSONArray("entries")!=null) {
                    var entries=previous.getJSONArray("entries");
                    for(int i=0;i<entries.length();i++) if("queued".equals(entries.getJSONObject(i).optString("status")))
                        throw new IllegalStateException("Pending movements");
                }
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
                AutomaticBankWorker.schedule(getContext());
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
