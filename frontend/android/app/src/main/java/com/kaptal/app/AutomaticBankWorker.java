package com.kaptal.app;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import org.json.JSONObject;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HttpsURLConnection;

public class AutomaticBankWorker extends Worker {
    static void schedule(Context context) {
        // Append reception so a notice arriving while a worker finishes is not stranded.
        schedule(context,ExistingWorkPolicy.APPEND_OR_REPLACE);
    }
    static void ensure(Context context) { schedule(context,ExistingWorkPolicy.KEEP); }
    static void retry(Context context) { schedule(context,ExistingWorkPolicy.REPLACE); }
    private static void schedule(Context context,ExistingWorkPolicy policy) {
        var request = new OneTimeWorkRequest.Builder(AutomaticBankWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();
        WorkManager.getInstance(context).enqueueUniqueWork("bank-automatic",policy,request);
    }
    public AutomaticBankWorker(@NonNull Context context,@NonNull WorkerParameters params) { super(context,params); }
    protected AutomaticBankStore store() { return new AutomaticBankStore(getApplicationContext()); }
    protected long owner() { return BankNotificationListener.user(getApplicationContext()); }
    protected boolean granted() { return BankNotificationListener.granted(getApplicationContext()); }
    protected record Reply(int code,String body) {}
    private void waiting(String generation,String reason) {
        synchronized(NotificationNoticeStore.class) {
            try {
                var state=store().read();
                if(generation.equals(state.optString("generation"))) { state.put("error",reason);store().write(state); }
            } catch(Exception ignored) { /* Preserve the encrypted queue and WorkManager retry. */ }
        }
    }
    protected Reply post(String key,String payload) throws Exception {
        var connection=(HttpsURLConnection)URI.create("https://kaptalgf.vercel.app/api/canales/android/evento").toURL().openConnection();
        try {
            connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(10000); connection.setReadTimeout(15000);
            connection.setUseCaches(false); connection.setRequestMethod("POST"); connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type","application/json");
            connection.setRequestProperty("X-Kaptal-Android",key); connection.setRequestProperty("Cookie", "");
            try(var output=connection.getOutputStream()) { output.write(payload.getBytes(StandardCharsets.UTF_8)); }
            int code=connection.getResponseCode();
            if(code!=200) return new Reply(code,"");
            try(var input=connection.getInputStream(); var output=new java.io.ByteArrayOutputStream()) {
                byte[] buffer=new byte[2048]; int read;
                while((read=input.read(buffer))!=-1) {
                    output.write(buffer,0,read);
                    if(output.size()>32_768) throw new java.io.IOException("Response too large");
                }
                return new Reply(code,new String(output.toByteArray(),StandardCharsets.UTF_8));
            }
        } finally { connection.disconnect(); }
    }
    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        for (int batch=0;batch<20 && !isStopped();batch++) {
            String generation,key,id,payload;
            synchronized (NotificationNoticeStore.class) {
                try {
                    var store = store();
                    if (!granted()) { store.clear(); return Result.success(); }
                    var state = store.read();
                    if (!AutomaticBankStore.active(state,owner())) return Result.success();
                    var entries = state.optJSONArray("entries"); JSONObject entry = null;
                    if (entries != null) for(int i=0;i<entries.length();i++) {
                        if ("queued".equals(entries.getJSONObject(i).optString("status"))) { entry=entries.getJSONObject(i); break; }
                    }
                    if (entry == null) return Result.success();
                    generation=state.getString("generation"); key=state.getString("key");
                    id=entry.getString("id"); payload=entry.getJSONObject("payload").toString();
                } catch(Exception ex) { return Result.failure(); }
            }
            try {
                var reply=post(key,payload);
                int code=reply.code();
                if(code==429 || code>=500 || code==408) { waiting(generation,code==429?"rate_limit":"server");return Result.retry(); }
                String status="review";
                if(code==200) {
                    var response=new JSONObject(reply.body());
                    if(!response.optBoolean("success")) { waiting(generation,"server");return Result.retry(); }
                    String outcome=response.getJSONObject("data").getString("estado");
                    if(!java.util.Set.of("REGISTRADO","PENDIENTE","DESCARTADO").contains(outcome)) { waiting(generation,"server");return Result.retry(); }
                    status=outcome.equals("REGISTRADO")?"registered":"review";
                }
                synchronized(NotificationNoticeStore.class) {
                    var store=store(); var state=store.read();
                    if(!generation.equals(state.optString("generation"))) return Result.success();
                    if(code==401 || code==403 || code==404) {
                        state.put("paused",true); state.put("error","reconnect"); store.write(state); return Result.success();
                    }
                    var entries=state.getJSONArray("entries");
                    state.put("error","");
                    for(int i=0;i<entries.length();i++) {
                        var entry=entries.getJSONObject(i);
                        if(id.equals(entry.optString("id"))) { entry.put("status",status); break; }
                    }
                    store.write(state);
                }
            } catch(Exception ex) { waiting(generation,"network");return Result.retry(); }
        }
        return Result.retry();
    }
}
