package com.kaptal.app;

import android.content.Context;
import androidx.work.*;
import androidx.work.testing.TestWorkerBuilder;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import static org.junit.Assert.*;

/** Opt-in localhost-over-ADB integration. This transport exists only in the test APK. */
@RunWith(AndroidJUnit4.class)
public class AutomaticBankHttpTest {
    public static class LocalWorker extends AutomaticBankWorker {
        public LocalWorker(Context context,WorkerParameters params) { super(context,params); }
        @Override protected AutomaticBankStore store() { return new AutomaticBankStore(getApplicationContext(),"bank-http-test.enc"); }
        @Override protected long owner() { return 71; }
        @Override protected boolean granted() { return true; }
        @Override protected Reply post(String key,String payload) throws Exception {
            // ADB reverse terminates at the isolated, loopback-only H2 fixture on the development PC.
            try(var socket=new Socket("127.0.0.1",18081)) {
                socket.setSoTimeout(15000);
                byte[] body=payload.getBytes(StandardCharsets.UTF_8);
                String headers="POST /api/canales/android/evento HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\nContent-Type: application/json\r\nX-Kaptal-Android: "+key+"\r\nContent-Length: "+body.length+"\r\n\r\n";
                socket.getOutputStream().write(headers.getBytes(StandardCharsets.US_ASCII)); socket.getOutputStream().write(body);
                var output=new java.io.ByteArrayOutputStream(); byte[] buffer=new byte[2048]; int read;
                while((read=socket.getInputStream().read(buffer))!=-1) {
                    output.write(buffer,0,read); if(output.size()>65536) throw new java.io.IOException("Response too large");
                }
                String response=new String(output.toByteArray(),StandardCharsets.UTF_8);
                int split=response.indexOf("\r\n\r\n");
                return new Reply(Integer.parseInt(response.substring(0,response.indexOf("\r\n")).split(" ")[1]),response.substring(split+4));
            }
        }
    }
    @Test public void parsedPurchaseRegistersAndHttpRedeliveryDoesNotDuplicate() throws Exception {
        var args=InstrumentationRegistry.getArguments();
        String key=args.getString("automaticKey"),ruleId=args.getString("automaticRule");
        Assume.assumeTrue("Requires isolated backend fixture",key!=null&&ruleId!=null);
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue(context.getPackageName().endsWith(".debug"));
        var store=new AutomaticBankStore(context,"bank-http-test.enc"); store.clear();
        try {
            var rule=new JSONObject().put("id",ruleId).put("proveedor","SEARS").put("paquete","com.google.android.apps.messaging")
                .put("remitente","12345").put("terminacion","1234");
            store.write(new JSONObject().put("userId",71).put("expires",System.currentTimeMillis()+3600000)
                .put("key",key).put("generation","qa-http").put("rules",new JSONArray().put(rule)));
            String date=LocalDate.now(ZoneId.of("America/Mexico_City")).format(DateTimeFormatter.BASIC_ISO_DATE);
            assertTrue(store.receive(71,"com.google.android.apps.messaging","12345",
                "COMPRA AUTORIZADA EN TIENDA QA CON TU TARJETA SEARS VISA 1234 POR $25.10 MXN EL "+date+" CON AAUTORIZACION 987654","qa",100));
            var worker=TestWorkerBuilder.from(context,LocalWorker.class,(java.util.concurrent.Executor)Runnable::run).build();
            assertEquals(ListenableWorker.Result.success(),worker.doWork());
            var state=store.read(); var entry=state.getJSONArray("entries").getJSONObject(0);
            assertEquals("registered",entry.getString("status"));
            // Simulate losing the HTTP response: resend the exact prepared payload.
            entry.put("status","queued"); store.write(state);
            var retry=TestWorkerBuilder.from(context,LocalWorker.class,(java.util.concurrent.Executor)Runnable::run).build();
            assertEquals(ListenableWorker.Result.success(),retry.doWork());
            assertEquals("registered",store.read().getJSONArray("entries").getJSONObject(0).getString("status"));
        } finally { store.clear(); }
    }
}
