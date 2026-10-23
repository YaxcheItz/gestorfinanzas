package com.kaptal.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class CaptureActionTest {
    @Test public void acceptsOnlyThreeLocalActions() {
        for (String value : CaptureAction.VALUES) assertEquals(value, CaptureAction.parse(CaptureAction.PREFIX + value));
        for (String value : new String[]{null, "", "dictar", "https://other.example", CaptureAction.PREFIX + "logout"})
            assertNull(CaptureAction.parse(value));
    }
}
