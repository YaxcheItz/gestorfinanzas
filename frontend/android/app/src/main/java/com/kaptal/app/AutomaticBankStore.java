package com.kaptal.app;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Callers serialize access on NotificationNoticeStore.class. Never included in Android backup. */
final class AutomaticBankStore {
    private static final String ALIAS = "kaptal-bank-automation-v1";
    private final AtomicFile file;
    AutomaticBankStore(Context context) {
        this(context,"bank-automatic.enc");
    }
    AutomaticBankStore(Context context,String name) {
        file = new AtomicFile(new File(context.getNoBackupFilesDir(), name));
    }
    private SecretKey key() throws Exception {
        var store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry)store.getEntry(ALIAS,null)).getSecretKey();
        var generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    JSONObject read() throws Exception {
        if (!file.getBaseFile().exists()) return new JSONObject();
        byte[] bytes = file.readFully();
        if (bytes.length < 29 || bytes.length > 500_000) throw new IllegalStateException("Invalid state");
        var cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,bytes,0,12));
        byte[] plain = cipher.doFinal(bytes,12,bytes.length-12);
        return new JSONObject(new String(plain,StandardCharsets.UTF_8));
    }
    void write(JSONObject state) throws Exception {
        byte[] plain = state.toString().getBytes(StandardCharsets.UTF_8);
        if (plain.length > 450_000) throw new IllegalStateException("Storage full");
        var cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE,key());
        byte[] encrypted = cipher.doFinal(plain);
        byte[] bytes = ByteBuffer.allocate(12+encrypted.length).put(cipher.getIV()).put(encrypted).array();
        var stream = file.startWrite();
        try { stream.write(bytes); file.finishWrite(stream); }
        catch (Exception ex) { file.failWrite(stream); throw ex; }
    }
    void clear() { file.delete(); }
    static boolean active(JSONObject state,long user) {
        return user > 0 && state.optLong("userId") == user && state.optLong("expires") > System.currentTimeMillis()
            && !state.optBoolean("paused",false);
    }
    static boolean sameRules(JSONArray before,JSONArray after) throws Exception {
        if(before==null||after==null||before.length()!=after.length())return false;
        String[] fields={"id","proveedor","paquete","remitente","terminacion","cuentaId","listaId","categoriaId"};
        for(int i=0;i<before.length();i++) {
            var original=before.getJSONObject(i);JSONObject match=null;
            for(int j=0;j<after.length();j++)if(original.getString("id").equals(after.getJSONObject(j).optString("id")))match=after.getJSONObject(j);
            if(match==null)return false;
            for(String field:fields)if(!String.valueOf(original.opt(field)).equals(String.valueOf(match.opt(field))))return false;
            if(original.optBoolean("ingresosMxn")!=match.optBoolean("ingresosMxn"))return false;
        }
        return true;
    }
    static void checkPending(JSONObject previous,long user,JSONArray rules) throws Exception {
        if(previous.optLong("userId")!=user||sameRules(previous.optJSONArray("rules"),rules))return;
        var entries=previous.optJSONArray("entries");
        if(entries!=null)for(int i=0;i<entries.length();i++)
            if("queued".equals(entries.getJSONObject(i).optString("status")))throw new IllegalStateException("Pending movements");
    }
    static JSONObject replacement(JSONObject previous,long user,JSONArray rules,String key,long expires) throws Exception {
        checkPending(previous,user,rules);
        var state=new JSONObject().put("generation",java.util.UUID.randomUUID().toString()).put("userId",user)
            .put("key",key).put("expires",expires).put("rules",rules).put("entries",new JSONArray());
        if(previous.optLong("userId")==user&&previous.optJSONArray("entries")!=null) {
            var entries=new JSONArray(previous.getJSONArray("entries").toString());
            var summaries=summaries(previous);
            for(int i=0;i<entries.length();i++) {
                var entry=entries.getJSONObject(i);
                for(int j=0;j<summaries.length();j++) {
                    var summary=summaries.getJSONObject(j);
                    if(entry.getString("id").equals(summary.getString("id")))
                        entry.put("proveedor",summary.getString("proveedor")).put("cuentaId",summary.getLong("cuentaId"));
                }
            }
            state.put("entries",entries);
        }
        return state;
    }
    static JSONArray summaries(JSONObject state) throws Exception {
        var output=new JSONArray();var entries=state.optJSONArray("entries");var rules=state.optJSONArray("rules");
        if(entries==null)return output;
        for(int i=entries.length()-1;i>=0;i--) {
            var entry=entries.getJSONObject(i);var payload=entry.getJSONObject("payload");JSONObject rule=null;
            if(rules!=null)for(int j=0;j<rules.length();j++)
                if(payload.optString("reglaId").equals(rules.getJSONObject(j).optString("id")))rule=rules.getJSONObject(j);
            output.put(new JSONObject().put("id",entry.getString("id")).put("status",entry.optString("status"))
                .put("proveedor",entry.optString("proveedor",rule==null?"":rule.optString("proveedor")))
                .put("cuentaId",entry.optLong("cuentaId",rule==null?0:rule.optLong("cuentaId")))
                .put("descripcion",payload.optString("descripcion")).put("monto",payload.opt("monto"))
                .put("clase",payload.optString("clase","COMPRA"))
                .put("moneda",payload.optString("moneda","MXN")).put("fecha",payload.optString("fecha")));
        }
        return output;
    }
    boolean accepts(long user,String pkg,String sender) throws Exception {
        var state = read(); if (!active(state,user)) return false;
        var rules = state.optJSONArray("rules"); if (rules == null) return false;
        for (int i=0;i<rules.length();i++) {
            var rule = rules.getJSONObject(i);
            if (pkg.equals(rule.optString("paquete")) && ("SEARS".equals(rule.optString("proveedor"))
                ? sender.equals(rule.optString("remitente")) : pkg.equals(BankPurchaseParser.PACKAGES.get(rule.optString("proveedor"))))) return true;
        }
        return false;
    }
    private record Evaluation(String status,JSONObject rule,SearsPurchaseParser.Purchase purchase,boolean income) {
        Evaluation(String status,JSONObject rule,SearsPurchaseParser.Purchase purchase) { this(status,rule,purchase,false); }
    }
    private static Evaluation evaluate(JSONObject state,long user,String pkg,String sender,String body,String key,long postedAt) throws Exception {
        if(!active(state,user))return new Evaluation("inactive",null,null);
        var rules=state.optJSONArray("rules");
        JSONObject selected=null;SearsPurchaseParser.Purchase purchase=null;boolean income=false;
        boolean packageMatched=false,senderMatched=false,cardMismatch=false;
        if(rules!=null)for(int i=0;i<rules.length();i++) {
            var rule=rules.getJSONObject(i);
            if(!pkg.equals(rule.optString("paquete")))continue;
            packageMatched=true;
            boolean sears="SEARS".equals(rule.optString("proveedor"));
            if(sears&&!sender.equals(rule.optString("remitente")))continue;
            senderMatched=true;
            if("SANTANDER".equals(rule.optString("proveedor"))&&BankPurchaseParser.isNonExpenseNotification(sender,body))
                return new Evaluation("expenses_only",null,null);
            String suffix=rule.isNull("terminacion")?null:rule.optString("terminacion");
            var date=java.time.LocalDate.now(java.time.ZoneId.of("America/Mexico_City"));
            var parsed=sears?SearsPurchaseParser.parse(sender,rule.optString("remitente"),suffix,body,date)
                :BankPurchaseParser.parseNotification(rule.optString("proveedor"),pkg,suffix,key+":"+postedAt,sender,body,date);
            boolean parsedIncome=false;
            if(parsed==null&&"REVOLUT".equals(rule.optString("proveedor"))&&rule.optBoolean("ingresosMxn")) {
                parsed=BankPurchaseParser.parseRevolutIncome(pkg,key+":"+postedAt,sender,body,date);
                parsedIncome=parsed!=null;
            }
            if(parsed==null) {
                cardMismatch|=sears?SearsPurchaseParser.matchesWithoutConfiguredCard(body,date)
                    :BankPurchaseParser.parseNotification(rule.optString("proveedor"),pkg,null,key+":"+postedAt,sender,body,date)!=null;
                continue;
            }
            if(selected!=null)return new Evaluation("ambiguous",null,null);
            selected=rule;purchase=parsed;income=parsedIncome;
        }
        if(selected!=null)return new Evaluation("ready",selected,purchase,income);
        return new Evaluation(!packageMatched?"app_not_linked":!senderMatched?"sender_mismatch":cardMismatch?"card_mismatch":"unsupported_format",null,null);
    }
    /** Same evaluation as reception, without changing queues or sending anything. */
    static JSONObject describe(JSONObject state,long user,JSONObject notice) throws Exception {
        String[] original=notice.getString("text").split("\n",2);
        var result=evaluate(state,user,notice.getString("packageName"),original[0],original.length>1?original[1]:"",
            notice.getString("id"),notice.getLong("at"));
        var output=new JSONObject().put("automaticStatus",result.status()).put("canRetry",false)
            .put("automaticVersion",active(state,user)?state.optString("generation"):"");
        if(!"ready".equals(result.status()))return output;
        String id=result.rule().getString("id")+":"+result.purchase().eventId();
        var entries=state.optJSONArray("entries");
        if(entries!=null)for(int i=0;i<entries.length();i++)if(id.equals(entries.getJSONObject(i).optString("id")))
            return output.put("automaticStatus",entries.getJSONObject(i).optString("status","review"));
        var p=result.purchase();var rule=result.rule();
        String body=original.length>1?original[1].trim().replaceAll("\\s+"," "):"";
        boolean stable="SEARS".equals(rule.optString("proveedor"))||BankPurchaseParser.hasBankEvent(rule.optString("proveedor"),original[0],body);
        return output.put("canRetry",stable).put("preview",new JSONObject().put("cuentaId",rule.getLong("cuentaId"))
            .put("listaId",rule.getLong("listaId")).put("categoriaId",result.income()?JSONObject.NULL:rule.opt("categoriaId"))
            .put("tipo",result.income()?"INGRESO":"GASTO")
            .put("monto",p.amount()).put("moneda","MXN").put("fecha",p.date().toString()).put("descripcion",p.merchant()));
    }
    void retryNotice(long user,JSONObject notice,String generation) throws Exception {
        var state=read();
        if(!active(state,user)||generation==null||generation.isBlank()||!generation.equals(state.optString("generation")))
            throw new IllegalStateException("Configuration changed");
        var details=describe(state,user,notice);
        if(!"ready".equals(details.optString("automaticStatus"))||!details.optBoolean("canRetry"))
            throw new IllegalStateException("Notice needs review");
        String[] original=notice.getString("text").split("\n",2);
        if(original.length!=2||!receive(user,notice.getString("packageName"),original[0],original[1],
            "local:"+notice.getString("id"),notice.getLong("at")))throw new IllegalStateException("Queue unavailable");
    }
    boolean receive(long user,String pkg,String sender,String body,String notificationKey,long postedAt) throws Exception {
        var state = read(); if (!active(state,user)) return false;
        var evaluation=evaluate(state,user,pkg,sender,body,notificationKey,postedAt);
        var previousEntries=state.optJSONArray("entries");
        if(previousEntries!=null) for(int i=0;i<previousEntries.length();i++) {
            var previous=previousEntries.getJSONObject(i);
            if(notificationKey.equals(previous.optString("notificationKey")) && previous.optBoolean("active")
                && !("ready".equals(evaluation.status())&&"SEARS".equals(evaluation.rule().optString("proveedor"))))return true;
        }
        if("expenses_only".equals(evaluation.status()))return true;
        if(!"ready".equals(evaluation.status()))return false;
        var selected=evaluation.rule();var purchase=evaluation.purchase();
        JSONArray entries = state.optJSONArray("entries"); if (entries == null) entries = new JSONArray();
        String identity = selected.getString("id") + ":" + purchase.eventId();
        for (int i=0;i<entries.length();i++) if (identity.equals(entries.getJSONObject(i).optString("id"))) return true;
        // Never evict an unsent purchase to admit a new one.
        if (entries.length() >= 200) {
            int removable = -1;
            for (int i=0;i<entries.length();i++) if (!"queued".equals(entries.getJSONObject(i).optString("status"))) { removable=i; break; }
            if (removable < 0) { state.put("full",true); write(state); return false; }
            entries.remove(removable);
        }
        var payload = new JSONObject().put("reglaId",selected.getString("id")).put("eventoId",purchase.eventId())
            .put("clase",evaluation.income()?"INGRESO":"COMPRA").put("moneda","MXN").put("monto",purchase.amount())
            .put("fecha",purchase.date().toString()).put("descripcion",purchase.merchant());
        entries.put(new JSONObject().put("id",identity).put("notificationKey",notificationKey)
            .put("proveedor",selected.optString("proveedor")).put("cuentaId",selected.optLong("cuentaId"))
            .put("active",true).put("status","queued").put("payload",payload));
        state.put("entries",entries); write(state); return true;
    }
    void removed(String notificationKey) throws Exception {
        var state=read(); var entries=state.optJSONArray("entries");
        if(entries==null) return;
        boolean changed=false;
        for(int i=0;i<entries.length();i++) {
            var entry=entries.getJSONObject(i);
            if(notificationKey.equals(entry.optString("notificationKey"))) { entry.put("active",false); changed=true; }
        }
        if(changed) write(state);
    }
}
