package com.kaptal.app;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class NotificationTextSelectorTest {
    @Test public void preservesCompactTextWhenExpandedIsAbsentOrEmpty() {
        assertEquals("Compra QA", NotificationTextSelector.choose(null, "Compra QA"));
        assertEquals("Compra QA", NotificationTextSelector.choose("  ", "Compra QA"));
        assertEquals("Compra ampliada QA", NotificationTextSelector.choose("Compra ampliada QA", "Compra QA"));
        assertEquals("", NotificationTextSelector.choose(null, null));
    }
}
