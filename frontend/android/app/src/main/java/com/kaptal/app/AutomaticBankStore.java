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
    boolean receive(long user,String pkg,String sender,String body,String notificationKey,long postedAt) throws Exception {
        var state = read(); if (!active(state,user)) return false;
        var previousEntries=state.optJSONArray("entries");
        if(previousEntries!=null) for(int i=0;i<previousEntries.length();i++) {
            var previous=previousEntries.getJSONObject(i);
            if(notificationKey.equals(previous.optString("notificationKey")) && previous.optBoolean("active")) return true;
        }
        var rules = state.optJSONArray("rules"); if (rules == null) return false;
        JSONObject selected = null; SearsPurchaseParser.Purchase purchase = null;
        for (int i=0;i<rules.length();i++) {
            var rule = rules.getJSONObject(i);
            if (!pkg.equals(rule.optString("paquete"))) continue;
            var date=java.time.LocalDate.now(java.time.ZoneId.of("America/Mexico_City"));
            var parsed = "SEARS".equals(rule.optString("proveedor"))
                ? SearsPurchaseParser.parse(sender,rule.optString("remitente"),rule.optString("terminacion"),body,date)
                : BankPurchaseParser.parse(rule.optString("proveedor"),pkg,rule.optString("terminacion"),notificationKey+":"+postedAt,body,date);
            if (parsed == null) continue;
            if (selected != null) return false;
            selected = rule; purchase = parsed;
        }
        if (selected == null) return false;
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
            .put("clase","COMPRA").put("moneda","MXN").put("monto",purchase.amount())
            .put("fecha",purchase.date().toString()).put("descripcion",purchase.merchant());
        entries.put(new JSONObject().put("id",identity).put("notificationKey",notificationKey)
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
