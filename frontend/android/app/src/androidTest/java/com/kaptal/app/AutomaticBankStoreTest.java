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
            .put("proveedor","SEARS").put("paquete",pkg).put("remitente","12345").put("terminacion","1234")
            .put("cuentaId",11).put("listaId",21).put("categoriaId",JSONObject.NULL);
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
    @Test public void freezesSameBankEventAndAcceptsNewReferenceOnSameNotification() throws Exception {
        receive("qa",987654);
        String first=store.read().getJSONArray("entries").getJSONObject(0).getJSONObject("payload").toString();
        assertTrue(store.receive(71,pkg,"12345",body(987654).replace("$25.10","$99.10"),"qa",100));
        assertEquals(1,store.read().getJSONArray("entries").length());
        assertEquals(first,store.read().getJSONArray("entries").getJSONObject(0).getJSONObject("payload").toString());
        receive("qa",987655);assertEquals(2,store.read().getJSONArray("entries").length());
        store.removed("qa"); receive("other",987654);
        assertEquals(2,store.read().getJSONArray("entries").length());
        receive("third",987656); assertEquals(3,store.read().getJSONArray("entries").length());
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
    @Test public void santanderPurchaseQueuesOnceAcrossNotificationRedelivery() throws Exception {
        String bankPackage="mx.bancosantander.supermovil";
        var rule=new JSONObject().put("id","00000000-0000-4000-8000-000000000002")
            .put("proveedor","SANTANDER").put("paquete",bankPackage).put("terminacion","1234");
        store.write(store.read().put("rules",new JSONArray().put(rule)));
        String date=LocalDate.now(ZoneId.of("America/Mexico_City")).format(DateTimeFormatter.ofPattern("dd/MM/uuuu"));
        String text="Compra con tarjeta en TIENDA QA por $25.10 MXN con tarjeta de credito **1234, el "
            +date+" a las 09:12:34 hrs.";
        assertTrue(store.receive(71,bankPackage,"Santander",text,"bank-qa-one",100));
        assertTrue(store.receive(71,bankPackage,"Santander",text,"bank-qa-redelivery",200));
        int split=text.indexOf(" por $");
        assertTrue(store.receive(71,bankPackage,text.substring(0,split),text.substring(split).trim(),"bank-qa-split",250));
        var entries=store.read().getJSONArray("entries");
        assertEquals(1,entries.length()); assertEquals("queued",entries.getJSONObject(0).getString("status"));
        var payload=entries.getJSONObject(0).getJSONObject("payload");
        assertEquals("TIENDA QA",payload.getString("descripcion"));
        assertEquals(LocalDate.now(ZoneId.of("America/Mexico_City")).toString(),payload.getString("fecha"));
        assertFalse(payload.has("terminacion")); assertFalse(payload.has("text"));
        assertTrue(store.receive(71,bankPackage,"Santander",text.replace("09:12:34","09:12:35"),"bank-qa-next",300));
        assertEquals(2,store.read().getJSONArray("entries").length());
    }
    @Test public void nullableOptionalCardSuffixDoesNotRejectSantanderPurchase() throws Exception {
        String bankPackage="mx.bancosantander.supermovil";
        var rule=new JSONObject().put("id","00000000-0000-4000-8000-000000000002")
            .put("proveedor","SANTANDER").put("paquete",bankPackage).put("terminacion",JSONObject.NULL);
        store.write(store.read().put("rules",new JSONArray().put(rule)));
        String date=LocalDate.now(ZoneId.of("America/Mexico_City")).format(DateTimeFormatter.ofPattern("dd/MM/uuuu"));
        String text="Compra con tarjeta en TIENDA QA por $25.10 MXN con tarjeta de credito **1234, el "
            +date+" a las 09:12:34 hrs.";
        assertTrue("An optional JSON null is not a card suffix",store.receive(71,bankPackage,"Santander",text,"null-suffix-qa",100));
    }
    @Test public void describesSearsReviewWithoutMutatingQueueOrExposingCredentials() throws Exception {
        var before=store.read().toString();
        var notice=new JSONObject().put("id","local-qa").put("revision",1).put("at",100)
            .put("packageName",pkg).put("text","12345\n"+body(987654));
        var result=AutomaticBankStore.describe(store.read(),71,notice);
        assertEquals("ready",result.getString("automaticStatus"));
        assertEquals("TIENDA QA",result.getJSONObject("preview").getString("descripcion"));
        assertFalse(result.has("key"));assertFalse(result.getJSONObject("preview").has("terminacion"));
        assertEquals(before,store.read().toString());
        notice.put("text","OTHER\n"+body(987654));
        assertEquals("sender_mismatch",AutomaticBankStore.describe(store.read(),71,notice).getString("automaticStatus"));
        assertEquals("inactive",AutomaticBankStore.describe(store.read(),72,notice).getString("automaticStatus"));
    }
    @Test public void explicitRetryChecksOwnerConfigurationAndAvoidsSecondQueueEntry() throws Exception {
        var notice=new JSONObject().put("id","retry-qa").put("revision",1).put("at",100)
            .put("packageName",pkg).put("text","12345\n"+body(987654));
        assertThrows(IllegalStateException.class,()->store.retryNotice(72,notice,"qa"));
        assertThrows(IllegalStateException.class,()->store.retryNotice(71,notice,"stale"));
        var changed=new JSONObject(notice.toString()).put("text","OTHER\n"+body(987654));
        assertThrows(IllegalStateException.class,()->store.retryNotice(71,changed,"qa"));
        assertFalse(store.read().has("entries"));
        store.retryNotice(71,notice,"qa");
        assertEquals(1,store.read().getJSONArray("entries").length());
        assertEquals("queued",AutomaticBankStore.describe(store.read(),71,notice).getString("automaticStatus"));
        assertThrows(IllegalStateException.class,()->store.retryNotice(71,notice,"qa"));
        assertEquals(1,store.read().getJSONArray("entries").length());
    }
    @Test public void distinguishesWrongCardFromUnsupportedFormatWithoutEnqueuing() throws Exception {
        var state=store.read();state.getJSONArray("rules").getJSONObject(0).put("terminacion","5678");
        var notice=new JSONObject().put("id","reason-qa").put("revision",1).put("at",100)
            .put("packageName",pkg).put("text","12345\n"+body(987654));
        assertEquals("card_mismatch",AutomaticBankStore.describe(state,71,notice).getString("automaticStatus"));
        notice.put("text","12345\n"+body(987654).replace(" MXN "," USD "));
        assertEquals("unsupported_format",AutomaticBankStore.describe(state,71,notice).getString("automaticStatus"));
        notice.put("packageName","test.other.app");
        assertEquals("app_not_linked",AutomaticBankStore.describe(state,71,notice).getString("automaticStatus"));
        assertFalse(store.read().has("entries"));
    }
    @Test public void acceptsBothSearsCardsForSameAccountWithoutAmbiguity() throws Exception {
        var state=store.read();var rules=state.getJSONArray("rules");
        rules.put(new JSONObject(rules.getJSONObject(0).toString()).put("id","00000000-0000-4000-8000-000000000002").put("terminacion","5678"));
        store.write(state);
        assertTrue(store.receive(71,pkg,"12345",body(987654),"same-sms-thread-qa",100));
        assertTrue(store.receive(71,pkg,"12345",body(987655).replace("VISA 1234","VISA 5678"),"same-sms-thread-qa",200));
        assertEquals(2,store.read().getJSONArray("entries").length());
    }
    @Test public void santanderDepositIsHandledWithoutQueueOrPreview() throws Exception {
        var state=store.read();var rule=state.getJSONArray("rules").getJSONObject(0)
            .put("proveedor","SANTANDER").put("paquete","mx.bancosantander.supermovil").put("remitente",JSONObject.NULL);
        store.write(state);
        var notice=new JSONObject().put("id","deposit-qa").put("at",100).put("revision",1)
            .put("packageName",rule.getString("paquete")).put("text","Depósito recibido\nRecibiste un ingreso QA");
        var result=AutomaticBankStore.describe(state,71,notice);
        assertEquals("expenses_only",result.getString("automaticStatus"));assertFalse(result.has("preview"));
        assertTrue(store.receive(71,rule.getString("paquete"),"Depósito recibido","Recibiste un ingreso QA","deposit-qa",100));
        assertFalse(store.read().has("entries"));
    }
}
