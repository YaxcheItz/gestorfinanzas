package com.kaptal.app;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class AutomaticBankStoreTest {
    private AutomaticBankStore store;
    private android.content.Context context;
    private final String pkg="com.google.android.apps.messaging";
    @Before public void prepare() throws Exception {
        context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Only isolated debug app",context.getPackageName().endsWith(".debug"));
        store=new AutomaticBankStore(context,"bank-automatic-test.enc"); store.clear();
        var rule=new JSONObject().put("id","00000000-0000-4000-8000-000000000001")
            .put("proveedor","SEARS").put("paquete",pkg).put("remitente","12345").put("terminacion","1234");
        store.write(new JSONObject().put("userId",71).put("expires",System.currentTimeMillis()+3600000)
            .put("key","synthetic-private-key").put("generation","qa").put("rules",new JSONArray().put(rule)));
    }
    @After public void clean() { store.clear(); }
    private String body(int reference) {
        String date=LocalDate.now(ZoneId.of("America/Mexico_City")).format(DateTimeFormatter.BASIC_ISO_DATE);
        return "COMPRA AUTORIZADA EN TIENDA QA CON TU TARJETA SEARS VISA 1234 POR $25.10 MXN EL "+date+" CON AAUTORIZACION "+reference;
    }
    private boolean receive(String key,int reference) throws Exception {
        return store.receive(71,pkg,"12345",body(reference),key,100);
    }
    @Test public void encryptsAndSurvivesNewStoreWithoutOriginalOrReference() throws Exception {
        assertTrue(receive("qa",987654));
        var next=new AutomaticBankStore(context,"bank-automatic-test.enc").read();
        assertEquals(1,next.getJSONArray("entries").length());
        String payload=next.getJSONArray("entries").getJSONObject(0).getJSONObject("payload").toString();
        assertFalse(payload.contains("987654"));
        assertFalse(next.getJSONArray("entries").getJSONObject(0).getJSONObject("payload").has("terminacion"));
        assertFalse(payload.contains("AUTORIZADA"));
        byte[] bytes=java.nio.file.Files.readAllBytes(new java.io.File(context.getNoBackupFilesDir(),"bank-automatic-test.enc").toPath());
        String ciphertext=new String(bytes,StandardCharsets.ISO_8859_1);
        assertFalse(ciphertext.contains("synthetic-private-key")); assertFalse(ciphertext.contains("TIENDA QA"));
    }
    @Test public void freezesFirstPayloadAcrossUpdatesAndDeduplicatesReference() throws Exception {
        receive("qa",987654); receive("qa",987655);
        assertEquals(1,store.read().getJSONArray("entries").length());
        store.removed("qa"); receive("other",987654);
        assertEquals(1,store.read().getJSONArray("entries").length());
        receive("third",987655); assertEquals(2,store.read().getJSONArray("entries").length());
    }
    @Test public void rejectsWrongOwnerSenderAndExpiredConnection() throws Exception {
        assertFalse(store.accepts(72,pkg,"12345")); assertFalse(store.accepts(71,pkg,"99999"));
        assertFalse(store.receive(72,pkg,"12345",body(987654),"qa",100));
        var state=store.read().put("expires",0); store.write(state);
        assertFalse(receive("qa",987654));
    }
    @Test public void doesNotEvictPendingPurchasesWhenFull() throws Exception {
        for(int i=0;i<200;i++) assertTrue(receive("qa-"+i,100000+i));
        assertFalse(receive("overflow",999999));
        assertEquals(200,store.read().getJSONArray("entries").length()); assertTrue(store.read().getBoolean("full"));
        store.clear(); assertEquals(0,store.read().length());
    }
}
