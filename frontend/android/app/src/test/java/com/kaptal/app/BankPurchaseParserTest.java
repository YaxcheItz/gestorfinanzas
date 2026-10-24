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
}
