package com.kaptal.app;

/** A system authentication result is single-use and belongs to one live Activity. */
final class NativeAuthenticationGate {
    private long generation, started, successAt;
    private boolean resumed, authorized, destroyed, prompted;
    long begin(long now) { prompted = true; authorized = false; started = now; return ++generation; }
    void resume() { if (!destroyed) resumed = true; }
    void pause() { pause(false); }
    void pause(boolean authenticating) {
        resumed = false; authorized = false;
        if (!authenticating) prompted = false;
    }
    boolean shouldPrompt(boolean enabled, boolean locked, boolean authenticating) {
        if (destroyed || !resumed || !enabled || !locked || authenticating || prompted) return false;
        prompted = true; return true;
    }
    void cancel() { generation++; authorized = false; }
    void destroy() { destroyed = true; resumed = false; cancel(); }
    boolean isCurrent(long attempt) { return !destroyed && attempt == generation; }
    void success(long attempt, long now) {
        if (!destroyed && attempt == generation && now >= started && now - started <= 120_000) {
            generation++; authorized = true; successAt = now;
        }
    }
    boolean consume(long now) {
        if (destroyed || !resumed || !authorized) return false;
        authorized = false;
        return now >= successAt && now - successAt <= 5_000;
    }
}
