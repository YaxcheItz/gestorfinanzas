package com.kaptal.app;

/** Choose the expanded text only when it actually contains content. */
final class NotificationTextSelector {
    private NotificationTextSelector() {}
    static CharSequence choose(CharSequence expanded, CharSequence compact) {
        if (expanded != null && !expanded.toString().trim().isEmpty()) return expanded;
        return compact == null ? "" : compact;
    }
}
