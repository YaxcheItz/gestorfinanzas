package com.kaptal.app;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
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
    private static final Pattern SANTANDER_CREDIT=Pattern.compile(
        "^Compra con tarjeta en (.{1,120}?) por \\$([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{1,13})\\.([0-9]{2}) MXN con tarjeta de cr[eé]dito \\*{2}([0-9]{4}), el ([0-9]{2}/[0-9]{2}/[0-9]{4}) a las ([0-9]{2}:[0-9]{2}:[0-9]{2}) hrs\\.?$",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    static SearsPurchaseParser.Purchase parse(String provider,String pkg,String suffix,String key,String body,LocalDate date) {
        if(provider==null || pkg==null || !pkg.equals(PACKAGES.get(provider)) || body==null || body.length()>1000
            || key==null || key.isBlank() || date==null) return null;
        String normalized=body.trim().replaceAll("\\s+"," ");
        if("SANTANDER".equals(provider)) {
            var bank=SANTANDER_CREDIT.matcher(normalized);
            if(bank.matches()) {
                if(suffix!=null&&!suffix.isEmpty()&&!suffix.equals(bank.group(4))) return null;
                try {
                    var purchaseDate=LocalDate.parse(bank.group(5),DateTimeFormatter.ofPattern("dd/MM/uuuu")
                        .withResolverStyle(ResolverStyle.STRICT));
                    var time=LocalTime.parse(bank.group(6),DateTimeFormatter.ofPattern("HH:mm:ss")
                        .withResolverStyle(ResolverStyle.STRICT));
                    if(purchaseDate.isAfter(date)||purchaseDate.isBefore(date.minusDays(31))) return null;
                    var amount=new BigDecimal(bank.group(2).replace(",","")+"."+bank.group(3));
                    String merchant=bank.group(1).trim();
                    // Bank timestamp and card distinguish purchases across Android redeliveries.
                    String identity=provider+"|"+bank.group(4)+"|"+purchaseDate+"|"+time+"|"+amount.toPlainString()
                        +"|"+merchant.toUpperCase(Locale.ROOT);
                    return purchase(amount,purchaseDate,merchant,identity);
                } catch(java.time.DateTimeException | NumberFormatException ex) { return null; }
            }
        }
        var match=PURCHASE.matcher(normalized);
        if(!match.matches()) return null;
        String currency=match.group(3);
        // Revolut is multi-currency: a bare $ cannot distinguish MXN from USD.
        if(currency==null ? "REVOLUT".equals(provider) : !currency.equalsIgnoreCase("MXN")&&!currency.equalsIgnoreCase("pesos")) return null;
        if(suffix!=null&&!suffix.isEmpty()&&!suffix.equals(match.group(5))) return null;
        try {
            return purchase(new BigDecimal(match.group(1).replace(",","")+"."+match.group(2)),date,
                match.group(4).trim(),provider+"|"+key);
        } catch(NumberFormatException ex) { return null; }
    }
    private static SearsPurchaseParser.Purchase purchase(BigDecimal amount,LocalDate date,String merchant,String identity) {
        String upper=merchant.toUpperCase(Locale.ROOT);
        if(merchant.isBlank() || merchant.matches(".*[0-9]{6,}.*") || upper.matches(".*\\b(OTP|NIP|CVV|CVC|TOKEN|CODIGO|CLAVE)\\b.*")) return null;
        try {
            if(amount.signum()<=0 || amount.precision()>15) return null;
            // Stable notification identity; changed content never mutates an already prepared payload.
            byte[] bytes=MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex=new StringBuilder(64);
            for(byte value:bytes) hex.append(String.format(Locale.ROOT,"%02x",value&255));
            return new SearsPurchaseParser.Purchase(hex.toString(),amount,date,merchant);
        } catch(java.security.NoSuchAlgorithmException ex) { return null; }
    }
}
