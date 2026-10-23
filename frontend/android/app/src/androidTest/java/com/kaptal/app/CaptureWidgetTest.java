package com.kaptal.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class CaptureWidgetTest {
    @Test public void widgetIntentsAreExplicitDistinctAndContainNoFinancialExtras() {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PendingIntent previous = null;
        for (String action : CaptureAction.VALUES) {
            var intent = CaptureWidget.intent(context, action);
            assertEquals(new ComponentName(context, MainActivity.class), intent.getComponent());
            assertEquals(action, CaptureAction.parse(intent.getAction()));
            assertNull(intent.getData());
            assertNull(intent.getExtras());
            var pending = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            assertNotEquals(previous, pending);
            previous = pending;
            pending.cancel();
        }
    }

    @Test public void providerIsRegisteredOnlyForHomeScreen() {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        var providers = AppWidgetManager.getInstance(context).getInstalledProviders();
        var component = new ComponentName(context, CaptureWidget.class);
        var provider = providers.stream().filter(p -> component.equals(p.provider)).findFirst().orElseThrow();
        assertEquals(android.appwidget.AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN, provider.widgetCategory);
        assertEquals(0, provider.updatePeriodMillis);
    }
}
