package com.kaptal.app;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.Locale;
import java.util.regex.Pattern;

/** Extracts only the explicit purchase format; originals and card details stay on device. */
final class SearsPurchaseParser {
    private static final Pattern PURCHASE = Pattern.compile(
        "^COMPRA AUTORIZADA EN (.{1,120}?) CON TU TARJETA SEARS VISA ([0-9]{4}) POR \\$([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{1,13})\\.([0-9]{2}) MXN EL ([0-9]{8}) CON A{1,2}UTORIZACION ([0-9]{1,20})[.]?$",
        Pattern.CASE_INSENSITIVE);
    record Purchase(String eventId, BigDecimal amount, LocalDate date, String merchant) {}

    static boolean matchesWithoutConfiguredCard(String body,LocalDate today) {
        if(body==null||body.length()>1000)return false;
        var match=PURCHASE.matcher(body.trim().replaceAll("\\s+"," "));
        return match.matches()&&parse("shape","shape",match.group(2),body,today)!=null;
    }

    static Purchase parse(String sender, String expectedSender, String suffix, String body, LocalDate today) {
        if (sender == null || !sender.equals(expectedSender) || suffix == null || !suffix.matches("[0-9]{4}")
                || body == null || body.length() > 1000 || today == null) return null;
        String normalized = body.trim().replaceAll("\\s+", " ");
        var match = PURCHASE.matcher(normalized);
        if (!match.matches() || !suffix.equals(match.group(2))) return null;
        try {
            String merchant = match.group(1).trim();
            // Do not forward codes or account numbers hidden in the merchant field.
            String upper = merchant.toUpperCase(Locale.ROOT);
            if (merchant.isBlank() || merchant.matches(".*[0-9]{6,}.*")
                    || upper.matches(".*\\b(OTP|NIP|CVV|CVC|TOKEN|CODIGO|CLAVE)\\b.*")) return null;
            var date = LocalDate.parse(match.group(5), DateTimeFormatter.ofPattern("uuuuMMdd")
                .withResolverStyle(ResolverStyle.STRICT));
            if (date.isAfter(today) || date.isBefore(today.minusDays(31))) return null;
            var amount = new BigDecimal(match.group(3).replace(",", "") + "." + match.group(4));
            if (amount.signum() <= 0 || amount.precision() > 15) return null;
            // Same bank reference survives notification updates, process death and redelivery.
            String identity = "SEARS|" + suffix + "|" + date + "|" + match.group(6);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.UTF_8));
            var hex = new StringBuilder(64);
            for (byte value : digest) hex.append(String.format(Locale.ROOT, "%02x", value & 255));
            return new Purchase(hex.toString(), amount, date, merchant);
        } catch (java.time.DateTimeException | NumberFormatException | java.security.NoSuchAlgorithmException ex) {
            return null;
        }
    }
}
