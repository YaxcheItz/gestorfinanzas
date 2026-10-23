package com.kaptal.app;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Only explicit purchase wording, selected official package and a unique account rule. */
final class BankPurchaseParser {
    static final Map<String,String> PACKAGES=Map.of("SANTANDER","mx.bancosantander.supermovil",
        "REVOLUT","com.revolut.revolut","AMEX","com.americanexpress.android.acctsvcs.mx","BBVA","com.bancomer.mbanking");
    private static final Pattern PURCHASE=Pattern.compile(
        "^Gastaste (?:\\$\\s*)?([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{1,13})\\.([0-9]{2})\\s*(MXN|USD|EUR|pesos)? en (.{1,120}?) con tu tarjeta(?: (?:terminacion |terminación |[*xX•]*)([0-9]{4}))?[.!]?$",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    static SearsPurchaseParser.Purchase parse(String provider,String pkg,String suffix,String key,String body,LocalDate date) {
        if(!pkg.equals(PACKAGES.get(provider)) || body==null || body.length()>1000 || key==null || key.isBlank()) return null;
        var match=PURCHASE.matcher(body.trim().replaceAll("\\s+"," "));
        if(!match.matches()) return null;
        String currency=match.group(3);
        // Revolut is multi-currency: a bare $ cannot distinguish MXN from USD.
        if(currency==null ? "REVOLUT".equals(provider) : !currency.equalsIgnoreCase("MXN")&&!currency.equalsIgnoreCase("pesos")) return null;
        if(suffix!=null&&!suffix.isEmpty()&&!suffix.equals(match.group(5))) return null;
        String merchant=match.group(4).trim();
        String upper=merchant.toUpperCase(Locale.ROOT);
        if(merchant.isBlank() || merchant.matches(".*[0-9]{6,}.*") || upper.matches(".*\\b(OTP|NIP|CVV|CVC|TOKEN|CODIGO|CLAVE)\\b.*")) return null;
        try {
            var amount=new BigDecimal(match.group(1).replace(",","")+"."+match.group(2));
            if(amount.signum()<=0 || amount.precision()>15) return null;
            // Stable notification identity; changed content never mutates an already prepared payload.
            byte[] bytes=MessageDigest.getInstance("SHA-256").digest((provider+"|"+key).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex=new StringBuilder(64);
            for(byte value:bytes) hex.append(String.format(Locale.ROOT,"%02x",value&255));
            return new SearsPurchaseParser.Purchase(hex.toString(),amount,date,merchant);
        } catch(java.security.NoSuchAlgorithmException | NumberFormatException ex) { return null; }
    }
}
