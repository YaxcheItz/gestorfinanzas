package com.kaptal.app;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private AppLockController appLock;
    AppLockController appLock() { return appLock; }
    boolean isAppLocked() { return appLock != null && appLock.isLocked(); }
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharedNoticePlugin.class);
        registerPlugin(NativeSessionPlugin.class);
        registerPlugin(BankNotificationsPlugin.class);
        registerPlugin(AutomaticBankPlugin.class);
        registerPlugin(CaptureActionPlugin.class);
        registerPlugin(GoogleSignInPlugin.class);
        registerPlugin(ScreenPrivacyPlugin.class);
        registerPlugin(AppLockPlugin.class);
        super.onCreate(savedInstanceState);
        ScreenPrivacyPlugin.applySavedPolicy(this);
        appLock = new AppLockController(this);
        CaptureWidget.publishShortcuts(this);
        // Permite probar la WebView real sin exponer la instalacion release.
        WebView.setWebContentsDebuggingEnabled(
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
    }
    @Override public void onResume() { super.onResume(); if (appLock != null) appLock.resume(); }
    @Override public void onPause() { if (appLock != null) appLock.pause(); super.onPause(); }
    @Override public void onDestroy() { if (appLock != null) appLock.destroy(); super.onDestroy(); }
}
