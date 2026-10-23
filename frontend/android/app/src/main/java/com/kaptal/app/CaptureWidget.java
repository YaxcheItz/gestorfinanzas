package com.kaptal.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.widget.RemoteViews;
import java.util.ArrayList;

public class CaptureWidget extends AppWidgetProvider {
    static Intent intent(Context context, String action) {
        return new Intent(context, MainActivity.class).setAction(CaptureAction.PREFIX + action)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    }

    static void publishShortcuts(Context context) {
        if (Build.VERSION.SDK_INT < 25) return;
        int[] labels = {R.string.capture_expense, R.string.capture_income, R.string.capture_voice};
        var shortcuts = new ArrayList<ShortcutInfo>();
        for (int i = 0; i < CaptureAction.VALUES.length; i++) {
            String action = CaptureAction.VALUES[i];
            shortcuts.add(new ShortcutInfo.Builder(context, action)
                .setShortLabel(context.getString(labels[i])).setRank(i)
                .setIcon(Icon.createWithResource(context, R.drawable.kaptal_icon))
                .setIntent(intent(context, action)).build());
        }
        try {
            context.getSystemService(ShortcutManager.class).setDynamicShortcuts(shortcuts);
        } catch (IllegalStateException ignored) {
            // El launcher puede estar bloqueado durante el arranque del dispositivo.
        }
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        int[] buttons = {R.id.capture_expense, R.id.capture_income, R.id.capture_voice};
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.capture_widget);
            for (int i = 0; i < buttons.length; i++) {
                views.setOnClickPendingIntent(buttons[i], PendingIntent.getActivity(context, i,
                    intent(context, CaptureAction.VALUES[i]), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            manager.updateAppWidget(id, views);
        }
    }
}
