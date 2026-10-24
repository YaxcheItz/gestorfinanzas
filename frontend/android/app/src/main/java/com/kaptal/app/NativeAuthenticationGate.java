package com.kaptal.app;

/** A system authentication result is single-use and belongs to one live Activity. */
final class NativeAuthenticationGate {
    private long generation, started, successAt;
    private boolean resumed, authorized, destroyed;
    long begin(long now) { authorized = false; started = now; return ++generation; }
    void resume() { if (!destroyed) resumed = true; }
    void pause() { resumed = false; authorized = false; }
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
