package com.kaptal.app;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Bundle;

// Emisor en el APK de instrumentación separado; no existe en release ni recibe texto externo.
public class SyntheticBankActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        NotificationManager manager = getSystemService(NotificationManager.class);
        String channel = "kaptal_qa_bank";
        manager.createNotificationChannel(new NotificationChannel(channel, "Avisos sintéticos QA", NotificationManager.IMPORTANCE_LOW));
        manager.notify(1723, new Notification.Builder(this, channel).setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Banco sintético QA").setContentText("Compra de prueba 17.23 MXN en Comercio QA")
            .setVisibility(Notification.VISIBILITY_PRIVATE).build());
        finish();
    }
}
