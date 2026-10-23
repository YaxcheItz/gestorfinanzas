package com.kaptal.app;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharedNoticePlugin.class);
        registerPlugin(NativeSessionPlugin.class);
        registerPlugin(BankNotificationsPlugin.class);
        registerPlugin(AutomaticBankPlugin.class);
        registerPlugin(CaptureActionPlugin.class);
        super.onCreate(savedInstanceState);
        CaptureWidget.publishShortcuts(this);
        // Permite probar la WebView real sin exponer la instalacion release.
        WebView.setWebContentsDebuggingEnabled(
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
    }
}
