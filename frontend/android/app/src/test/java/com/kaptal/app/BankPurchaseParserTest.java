package com.kaptal.app;

import org.junit.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.Assert.*;

public class BankPurchaseParserTest {
    private final LocalDate date=LocalDate.of(2026,10,23);
    private SearsPurchaseParser.Purchase parse(String provider,String suffix,String text) {
        return BankPurchaseParser.parse(provider,BankPurchaseParser.PACKAGES.get(provider),suffix,"event-qa",text,date);
    }
    @Test public void acceptsExplicitPurchasesForTheFourProfiles() {
        for(String provider:BankPurchaseParser.PACKAGES.keySet()) {
            var result=parse(provider,"1234","Gastaste $25.10 MXN en TIENDA QA con tu tarjeta *1234");
            assertNotNull(provider,result); assertEquals(new BigDecimal("25.10"),result.amount());
            assertEquals("TIENDA QA",result.merchant()); assertEquals(date,result.date());
        }
    }
    @Test public void pesosAndMexicanProfilesAllowLocalDollarFormat() {
        assertNotNull(parse("BBVA",null,"Gastaste $25.10 en TIENDA QA con tu tarjeta"));
        assertNotNull(parse("REVOLUT",null,"Gastaste 25.10 pesos en TIENDA QA con tu tarjeta"));
        assertNull(parse("REVOLUT",null,"Gastaste $25.10 en TIENDA QA con tu tarjeta"));
    }
    @Test public void rejectsDifferentCurrencyIncompleteAndRejectedPurchases() {
        assertNull(parse("AMEX",null,"Gastaste $25.10 USD en TIENDA QA con tu tarjeta"));
        assertNull(parse("AMEX","5678","Gastaste $25.10 MXN en TIENDA QA con tu tarjeta *1234"));
        assertNull(parse("AMEX",null,"Compra rechazada por $25.10 MXN"));
        assertNull(parse("AMEX",null,"Gastaste $25.10 MXN en OTP 123456 con tu tarjeta"));
        assertNull(parse("AMEX",null,"Gastaste $0.00 MXN en TIENDA QA con tu tarjeta"));
    }
    @Test public void rejectsImpersonatingPackages() {
        assertNull(BankPurchaseParser.parse("BBVA","com.example.fake",null,"event-qa",
            "Gastaste $25.10 MXN en TIENDA QA con tu tarjeta",date));
    }
    private String santander(String merchant,String amount,String suffix,String day,String time) {
        return "Compra con tarjeta en "+merchant+" por $"+amount+" MXN con tarjeta de credito **"+suffix
            +", el "+day+" a las "+time+" hrs.";
    }
    @Test public void acceptsSantanderCreditPurchaseAndPreservesBankDate() {
        String body=santander("TIENDA QA","1,234.50","1234","22/10/2026","09:12:34");
        var result=parse("SANTANDER","1234",body);
        assertNotNull(result); assertEquals(new BigDecimal("1234.50"),result.amount());
        assertEquals("TIENDA QA",result.merchant()); assertEquals(date.minusDays(1),result.date());
        assertNotNull(parse("SANTANDER",null,body.replace("credito","crédito")));
        assertNull(parse("BBVA",null,body));
        assertNull(BankPurchaseParser.parse("SANTANDER","com.example.fake",null,"qa",body,date));
    }
    @Test public void santanderRedeliveryUsesBankEventNotAndroidNotificationKey() {
        String body=santander("TIENDA QA","25.10","1234","23/10/2026","09:12:34");
        var first=BankPurchaseParser.parse("SANTANDER",santanderPackage(),"1234","qa-first",body,date);
        var again=BankPurchaseParser.parse("SANTANDER",santanderPackage(),"1234","qa-other",body,date);
        assertNotNull(first); assertEquals(first.eventId(),again.eventId());
        assertNotEquals(first.eventId(),parse("SANTANDER","1234",body.replace("09:12:34","09:12:35")).eventId());
        assertNotEquals(first.eventId(),parse("SANTANDER",null,body.replace("**1234","**5678")).eventId());
    }
    private String santanderPackage() { return BankPurchaseParser.PACKAGES.get("SANTANDER"); }
    @Test public void santanderRejectsAmbiguousRejectedForeignAndInvalidValues() {
        String body=santander("TIENDA QA","25.10","1234","23/10/2026","09:12:34");
        assertNull(parse("SANTANDER","5678",body));
        for(String invalid:new String[]{body.replace("Compra con","Compra rechazada con"),
            body.replace("Compra con","Intento de compra con"),body.replace("Compra con","Pago con"),
            body.replace("Compra con","Transferencia con"),body.replace(" MXN "," USD "),
            body.replace("$25.10","$0.00"),body.replace("$25.10","$-25.10"),
            body.replace("$25.10","$1,23.10"),body.replace("23/10/2026","31/02/2026"),
            body.replace("23/10/2026","24/10/2026"),body.replace("23/10/2026","01/09/2026"),
            body.replace("09:12:34","25:12:34"),body.replace("TIENDA QA","OTP 123456"),
            body.replace("TIENDA QA","CUENTA 123456789"),body+" Mensaje adicional"}) {
            assertNull(parse("SANTANDER",null,invalid));
        }
    }
}
