package com.kaptal.app;

import org.junit.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.Assert.*;

public class BankPurchaseParserTest {
    @Test public void normalizesAmexTitleBeforeRejectingCodesAndNonPurchases() {
        String body="Gastaste $25.10 Gastos de hoy: $80.20";
        for(String title:new String[]{"OTP\n123456","Compra no\nautorizada","Compra no\u00a0reconocida"})
            assertNull(BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),null,"qa",title,body,date));
        var purchase=BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),null,"qa","COMERCIO\nQA",body,date);
        assertNotNull(purchase);assertEquals("COMERCIO QA",purchase.merchant());
    }
    @Test public void recognizesRevolutIncomeWithoutForwardingSender() {
        String body="PERSONA QA te en- vió un pago. Presiona aquí para obtener más información";
        var result=BankPurchaseParser.parseRevolutIncome(BankPurchaseParser.PACKAGES.get("REVOLUT"),"qa","Recibiste $250",body,date);
        assertNotNull(result);assertEquals(new BigDecimal("250.00"),result.amount());
        assertEquals("Ingreso Revolut",result.merchant());
        assertEquals(result,BankPurchaseParser.parseRevolutIncome(BankPurchaseParser.PACKAGES.get("REVOLUT"),"qa",
            "Recibiste $250.00 MXN",body.replace("en- vió","envió"),date));
        assertNull(parse("REVOLUT",null,"Recibiste $250 "+body));
    }
    @Test public void rejectsForeignIncompleteAndImpersonatedRevolutIncome() {
        String pkg=BankPurchaseParser.PACKAGES.get("REVOLUT");
        String body="PERSONA QA te envió un pago. Presiona aquí para obtener más información";
        for(String title:new String[]{"Recibiste $0","Recibiste $-25","Recibiste $25 USD","Recibiste €25",
            "Recibiste $1,23.10","Recibiste $25.1","Recibiste $25 EUR","Gastaste $25"})
            assertNull(BankPurchaseParser.parseRevolutIncome(pkg,"qa",title,body,date));
        assertNull(BankPurchaseParser.parseRevolutIncome("com.example.fake","qa","Recibiste $25",body,date));
        assertNull(BankPurchaseParser.parseRevolutIncome(pkg,"qa","Recibiste $25",body+" Cancelado",date));
        assertNull(BankPurchaseParser.parseRevolutIncome(pkg,"qa","Recibiste $25","Transferencia pendiente",date));
        assertNull(BankPurchaseParser.parseRevolutIncome(pkg,"","Recibiste $25",body,date));
    }
    @Test public void acceptsAmexMerchantTitleAndKeepsDailyTotalSeparate() {
        var result=BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),null,
            "event-qa","COMERCIO QA","Gastaste $25.10 Gastos de hoy: $80.20",date);
        assertNotNull(result);
        assertEquals(new BigDecimal("25.10"),result.amount());
        assertEquals("COMERCIO QA",result.merchant());
        assertEquals(date,result.date());
        assertEquals(result,BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),null,
            "event-qa","COMERCIO QA","Gastaste $25.10\nGastos de hoy: $80.20",date));
    }
    @Test public void rejectsAmbiguousAmexOriginsCardsAndBodies() {
        String body="Gastaste $25.10 Gastos de hoy: $80.20";
        for(String provider:new String[]{"SANTANDER","BBVA","REVOLUT"})
            assertNull(BankPurchaseParser.parseNotification(provider,BankPurchaseParser.PACKAGES.get(provider),null,
                "qa","COMERCIO QA",body,date));
        assertNull(BankPurchaseParser.parseNotification("AMEX","com.example.fake",null,"qa","COMERCIO QA",body,date));
        assertNull(BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),"1234","qa","COMERCIO QA",body,date));
        for(String title:new String[]{"","Compra rechazada","Devolución","OTP 123456","X".repeat(121)})
            assertNull(BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),null,"qa",title,body,date));
        for(String invalid:new String[]{"Gastaste $25.10",body+" USD",body+" texto adicional",
            body.replace("$25.10","$0.00"),body.replace("$25.10","$-25.10"),
            body.replace("$25.10","$1,23.10"),body.replace("Gastaste","Recibiste")})
            assertNull(BankPurchaseParser.parseNotification("AMEX",BankPurchaseParser.PACKAGES.get("AMEX"),null,"qa","COMERCIO QA",invalid,date));
    }
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
    @Test public void reconstructsSantanderNotificationWithPurchasePrefixInTitle() {
        String title="Compra con tarjeta en TIENDA QA";
        String body="por $25.10 MXN con tarjeta de credito **1234, el 23/10/2026 a las 09:12:34 hrs.";
        var split=BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),"1234","qa",title,body,date);
        var full=parse("SANTANDER","1234",title+" "+body);
        assertNotNull(split);assertEquals(full,split);
        assertTrue(BankPurchaseParser.hasBankEvent("SANTANDER",title,body));
        assertNull(BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),"5678","qa",title,body,date));
        assertNull(BankPurchaseParser.parseNotification("SANTANDER","test.fake","1234","qa",title,body,date));
        assertNull(BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),"1234","qa",
            "Compra rechazada",title+" "+body,date));
        assertNull(BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),"1234","qa",
            "Aviso: compra no autorizada",title+" "+body,date));
        assertNull(BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),"1234","qa",
            "Compra no\nautorizada",title+" "+body,date));
        String complete=title+" "+body;
        for(int boundary=complete.indexOf(' ');boundary>=0;boundary=complete.indexOf(' ',boundary+1))
            assertEquals(full,BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),"1234","qa",
                complete.substring(0,boundary),complete.substring(boundary+1),date));
    }
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
    @Test public void ignoresSantanderIncomeButKeepsExpenseMerchantWords() {
        assertTrue(BankPurchaseParser.isNonExpenseNotification("Depósito recibido","Recibiste un ingreso QA"));
        assertTrue(BankPurchaseParser.isNonExpenseNotification("Santander","Abono a tu cuenta QA"));
        assertFalse(BankPurchaseParser.isNonExpenseNotification("Compra con tarjeta en","DEPOSITO QA por un importe"));
        assertNull(BankPurchaseParser.parseNotification("SANTANDER",santanderPackage(),null,"qa","Depósito recibido",
            santander("TIENDA QA","25.10","1234","23/10/2026","09:12:34"),date));
    }
}
