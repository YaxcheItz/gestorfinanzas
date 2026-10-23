package com.kaptal.app;

import org.junit.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.Assert.*;

public class SearsPurchaseParserTest {
    private final LocalDate today = LocalDate.of(2026,10,23);
    private String body = "COMPRA AUTORIZADA EN TIENDA QA CON TU TARJETA SEARS VISA 1234 POR $25.10 MXN EL 20261022 CON AAUTORIZACION 987654";
    private SearsPurchaseParser.Purchase parse(String text) {
        return SearsPurchaseParser.parse("12345","12345","1234",text,today);
    }
    @Test public void authorizedPurchaseIsExpenseFormatAndStable() {
        var result = parse(body);
        assertNotNull(result);
        assertEquals(new BigDecimal("25.10"),result.amount());
        assertEquals("TIENDA QA",result.merchant());
        assertEquals(64,result.eventId().length());
        assertEquals(result.eventId(),parse(body.replace("AAUTORIZACION","AUTORIZACION")).eventId());
        assertNotEquals(result.eventId(),parse(body.replace("987654","987655")).eventId());
    }
    @Test public void rejectsWrongSenderCardAndUnrelatedMessages() {
        assertNull(SearsPurchaseParser.parse("99999","12345","1234",body,today));
        assertNull(parse(body.replace("VISA 1234","VISA 5678")));
        assertNull(parse("Tu codigo es 123456"));
        assertNull(parse(body.replace("COMPRA AUTORIZADA","COMPRA RECHAZADA")));
        assertNull(parse(body + " codigo 123456"));
    }
    @Test public void rejectsImpossibleDatesAmountsAndSensitiveMerchant() {
        assertNull(parse(body.replace("20261022","20260230")));
        assertNull(parse(body.replace("20261022","20261024")));
        assertNull(parse(body.replace("20261022","20260801")));
        assertNull(parse(body.replace("$25.10","$0.00")));
        assertNull(parse(body.replace("TIENDA QA","OTP 123456")));
        assertNull(parse(body.replace("$25.10","$25,10")));
    }
    @Test public void acceptsGroupedThousands() {
        assertEquals(new BigDecimal("1250.10"),parse(body.replace("$25.10","$1,250.10")).amount());
    }
}
