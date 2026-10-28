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
    private static final Pattern NON_PURCHASE_TITLE=Pattern.compile(
        "\\b(?:rechazad[ao]|cancelad[ao]|no autorizad[ao]|no reconocid[ao]|intento|devoluci[oó]n)\\b",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern AMEX_SUMMARY=Pattern.compile(
        "^Gastaste \\$([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{1,13})\\.([0-9]{2}) Gastos de hoy: \\$(?:[0-9]{1,3}(?:,[0-9]{3})*|[0-9]{1,13})\\.[0-9]{2}$");
    private static final Pattern REVOLUT_INCOME=Pattern.compile(
        "^Recibiste \\$([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{1,13})(?:\\.([0-9]{2}))?(?: MXN)?$");
    /** Call only with explicit consent that bare-dollar Revolut income means MXN. */
    static SearsPurchaseParser.Purchase parseRevolutIncome(String pkg,String key,String title,String body,LocalDate date) {
        if(!PACKAGES.get("REVOLUT").equals(pkg)||key==null||key.isBlank()||date==null||title==null||body==null
            ||title.length()>100||body.length()>1000)return null;
        var amount=REVOLUT_INCOME.matcher(title.trim().replaceAll("[\\s\\p{Z}]+"," "));
        String text=body.trim().replaceAll("[\\s\\p{Z}]+"," ");
        if(!amount.matches()||!text.matches(".{1,120} te en(?:- )?vió un pago\\. Presiona aquí para obtener más información\\.?"))return null;
        return purchase(new BigDecimal(amount.group(1).replace(",","")+"."+(amount.group(2)==null?"00":amount.group(2))),
            date,"Ingreso Revolut","REVOLUT|INGRESO|"+key);
    }
    private static final Pattern NON_EXPENSE_PREFIX=Pattern.compile(
        "^(?:dep[oó]sito|abono|ingreso|devoluci[oó]n|transferencia|pago recibido|recibiste|te depositaron)\\b",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    static boolean isNonExpenseNotification(String title,String body) {
        String heading=title==null?"":title.trim().replaceAll("[\\s\\p{Z}]+"," ");
        String text=body==null?"":body.trim().replaceAll("[\\s\\p{Z}]+"," ");
        if(NON_EXPENSE_PREFIX.matcher(heading).find())return true;
        if(heading.matches("(?iu)^(?:compra|gastaste)\\b.*"))return false;
        return NON_EXPENSE_PREFIX.matcher(text).find();
    }
    static SearsPurchaseParser.Purchase parseNotification(String provider,String pkg,String suffix,String key,
            String title,String body,LocalDate date) {
        if("AMEX".equals(provider)&&PACKAGES.get("AMEX").equals(pkg)&&title!=null&&body!=null
            &&title.length()<=120&&body.length()<=1000&&key!=null&&!key.isBlank()&&date!=null) {
            if(isNonExpenseNotification(title,body)||NON_PURCHASE_TITLE.matcher(title).find())return null;
            var summary=AMEX_SUMMARY.matcher(body.trim().replaceAll("[\\s\\p{Z}]+"," "));
            // A configured card restriction cannot be verified from this cardless format.
            if(summary.matches()&&(suffix==null||suffix.isEmpty()))return purchase(
                new BigDecimal(summary.group(1).replace(",","")+"."+summary.group(2)),date,title.trim(),provider+"|"+key);
        }
        if("SANTANDER".equals(provider)&&isNonExpenseNotification(title,body))return null;
        if("SANTANDER".equals(provider)&&title!=null&&NON_PURCHASE_TITLE.matcher(title.replaceAll("[\\s\\p{Z}]+"," ")).find())return null;
        var direct=parse(provider,pkg,suffix,key,body,date);
        if(direct!=null||!"SANTANDER".equals(provider)||title==null||title.isBlank())return direct;
        return parse(provider,pkg,suffix,key,title.trim()+" "+(body==null?"":body.trim()),date);
    }
    static boolean hasBankEvent(String provider,String title,String body) {
        if(!"SANTANDER".equals(provider))return false;
        String text=body==null?"":body.trim();String heading=title==null?"":title.trim();
        return SANTANDER_CREDIT.matcher(text.replaceAll("\\s+"," ")).matches()
            ||SANTANDER_CREDIT.matcher((heading+" "+text).trim().replaceAll("\\s+"," ")).matches();
    }
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
