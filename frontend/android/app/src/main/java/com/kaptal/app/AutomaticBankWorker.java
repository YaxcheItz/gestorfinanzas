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
        var request = new OneTimeWorkRequest.Builder(AutomaticBankWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();
        WorkManager.getInstance(context).enqueueUniqueWork("bank-automatic",ExistingWorkPolicy.APPEND_OR_REPLACE,request);
    }
    public AutomaticBankWorker(@NonNull Context context,@NonNull WorkerParameters params) { super(context,params); }
    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        for (int batch=0;batch<20 && !isStopped();batch++) {
            String generation,key,id,payload;
            synchronized (NotificationNoticeStore.class) {
                try {
                    var store = new AutomaticBankStore(context);
                    if (!BankNotificationListener.granted(context)) { store.clear(); return Result.success(); }
                    var state = store.read();
                    if (!AutomaticBankStore.active(state,BankNotificationListener.user(context))) return Result.success();
                    var entries = state.optJSONArray("entries"); JSONObject entry = null;
                    if (entries != null) for(int i=0;i<entries.length();i++) {
                        if ("queued".equals(entries.getJSONObject(i).optString("status"))) { entry=entries.getJSONObject(i); break; }
                    }
                    if (entry == null) return Result.success();
                    generation=state.getString("generation"); key=state.getString("key");
                    id=entry.getString("id"); payload=entry.getJSONObject("payload").toString();
                } catch(Exception ex) { return Result.failure(); }
            }
            HttpsURLConnection connection = null;
            try {
                connection=(HttpsURLConnection)URI.create("https://kaptalgf.vercel.app/api/canales/android/evento").toURL().openConnection();
                connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(10000); connection.setReadTimeout(15000);
                connection.setUseCaches(false);
                connection.setRequestMethod("POST"); connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type","application/json");
                connection.setRequestProperty("X-Kaptal-Android",key);
                connection.setRequestProperty("Cookie", "");
                try(var output=connection.getOutputStream()) { output.write(payload.getBytes(StandardCharsets.UTF_8)); }
                int code=connection.getResponseCode();
                if(code==429 || code>=500 || code==408) return Result.retry();
                String status="review";
                if(code==200) {
                    byte[] bytes;
                    try(var input=connection.getInputStream(); var output=new java.io.ByteArrayOutputStream()) {
                        byte[] buffer=new byte[2048]; int read;
                        while((read=input.read(buffer))!=-1) {
                            output.write(buffer,0,read); if(output.size()>32_768) break;
                        }
                        bytes=output.toByteArray();
                    }
                    if(bytes.length>32_768) return Result.retry();
                    var response=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
                    if(!response.optBoolean("success")) return Result.retry();
                    String outcome=response.getJSONObject("data").getString("estado");
                    if(!java.util.Set.of("REGISTRADO","PENDIENTE","DESCARTADO").contains(outcome)) return Result.retry();
                    status=outcome.equals("REGISTRADO")?"registered":"review";
                }
                synchronized(NotificationNoticeStore.class) {
                    var store=new AutomaticBankStore(context); var state=store.read();
                    if(!generation.equals(state.optString("generation"))) return Result.success();
                    if(code==401 || code==403 || code==404) {
                        state.put("paused",true); state.put("error","reconnect"); store.write(state); return Result.success();
                    }
                    var entries=state.getJSONArray("entries");
                    for(int i=0;i<entries.length();i++) {
                        var entry=entries.getJSONObject(i);
                        if(id.equals(entry.optString("id"))) { entry.put("status",status); break; }
                    }
                    store.write(state);
                }
            } catch(Exception ex) { return Result.retry(); }
            finally { if(connection!=null) connection.disconnect(); }
        }
        return Result.retry();
    }
}
