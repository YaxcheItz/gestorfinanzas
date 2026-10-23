package com.kaptal.app;

final class CaptureAction {
    static final String PREFIX = "com.kaptal.app.capture.";
    static final String[] VALUES = {"nuevo-gasto", "nuevo-ingreso", "dictar"};

    static String parse(String action) {
        for (String value : VALUES) if ((PREFIX + value).equals(action)) return value;
        return null;
    }
}
