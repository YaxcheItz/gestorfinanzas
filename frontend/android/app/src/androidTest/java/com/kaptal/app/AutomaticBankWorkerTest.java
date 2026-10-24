package com.kaptal.app;

import android.content.Context;
import androidx.work.*;
import androidx.work.testing.TestWorkerBuilder;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.util.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class AutomaticBankWorkerTest {
    private Context context;
    private AutomaticBankStore store;
    public static class SyntheticWorker extends AutomaticBankWorker {
        static int code;
        static boolean networkError,clearDuringPost,access;
        static final List<String> sent=new ArrayList<>();
        public SyntheticWorker(Context context,WorkerParameters params) { super(context,params); }
        @Override protected AutomaticBankStore store() { return new AutomaticBankStore(getApplicationContext(),"bank-worker-test.enc"); }
        @Override protected long owner() { return 71; }
        @Override protected boolean granted() { return access; }
        @Override protected Reply post(String key,String payload) throws Exception {
            assertEquals("synthetic-worker-key",key); sent.add(payload);
            if(clearDuringPost) store().clear();
            if(networkError) throw new java.io.IOException("Synthetic network outage");
            String status=code==201?"PENDIENTE":"REGISTRADO";
            return new Reply(code==201?200:code,"{\"success\":true,\"data\":{\"estado\":\""+status+"\"}}");
        }
    }
    @Before public void prepare() throws Exception {
        context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue(context.getPackageName().endsWith(".debug"));
        store=new AutomaticBankStore(context,"bank-worker-test.enc"); store.clear();
        SyntheticWorker.code=200; SyntheticWorker.networkError=false; SyntheticWorker.clearDuringPost=false;
        SyntheticWorker.access=true; SyntheticWorker.sent.clear();
        var payload=new JSONObject().put("eventoId","a".repeat(64)).put("descripcion","Tienda QA").put("monto","25.10");
        store.write(new JSONObject().put("generation","qa").put("userId",71)
            .put("expires",System.currentTimeMillis()+3600000).put("key","synthetic-worker-key")
            .put("entries",new JSONArray().put(new JSONObject().put("id","qa").put("status","queued").put("payload",payload))));
    }
    @After public void clean() { store.clear(); }
    private ListenableWorker.Result run() {
        return TestWorkerBuilder.from(context,SyntheticWorker.class,(java.util.concurrent.Executor)Runnable::run).build().doWork();
    }
    private String status() throws Exception { return store.read().getJSONArray("entries").getJSONObject(0).getString("status"); }
    @Test public void networkAndRateLimitRetryIdenticalPayloadThenConsumeOnce() throws Exception {
        SyntheticWorker.networkError=true; assertEquals(ListenableWorker.Result.retry(),run());
        assertEquals("queued",status());
        SyntheticWorker.networkError=false; SyntheticWorker.code=429;
        assertEquals(ListenableWorker.Result.retry(),run());
        SyntheticWorker.code=200; assertEquals(ListenableWorker.Result.success(),run());
        assertEquals("registered",status()); assertEquals(3,SyntheticWorker.sent.size());
        assertEquals(1,new HashSet<>(SyntheticWorker.sent).size());
        run(); assertEquals(3,SyntheticWorker.sent.size());
    }
    @Test public void unauthorizedPausesWithoutDiscardingPendingPayload() throws Exception {
        SyntheticWorker.code=401; assertEquals(ListenableWorker.Result.success(),run());
        assertTrue(store.read().getBoolean("paused")); assertEquals("queued",status());
        run(); assertEquals(1,SyntheticWorker.sent.size());
    }
    @Test public void ambiguousAndInvalidPayloadNeedReviewWithoutRetryLoop() throws Exception {
        SyntheticWorker.code=201; run(); assertEquals("review",status());
        var state=store.read(); state.getJSONArray("entries").getJSONObject(0).put("status","queued"); store.write(state);
        SyntheticWorker.code=400; run(); assertEquals("review",status());
    }
    @Test public void revocationClearsBeforeSendingAndLogoutDoesNotRestoreState() throws Exception {
        SyntheticWorker.access=false; run(); assertTrue(SyntheticWorker.sent.isEmpty()); assertEquals(0,store.read().length());
        prepare(); SyntheticWorker.clearDuringPost=true; run(); assertEquals(0,store.read().length());
    }
}
