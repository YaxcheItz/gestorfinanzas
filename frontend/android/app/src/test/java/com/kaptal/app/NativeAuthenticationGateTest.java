package com.kaptal.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class NativeAuthenticationGateTest {
    @Test public void enteringShowsSystemPromptWithoutLoopingAfterCancellation() {
        var gate = new NativeAuthenticationGate(); gate.resume();
        assertTrue(gate.shouldPrompt(true, true, false));
        assertFalse(gate.shouldPrompt(true, true, false));
        gate.begin(100);
        gate.pause(true); gate.resume();
        assertFalse(gate.shouldPrompt(true, true, true));
        gate.cancel();
        assertFalse(gate.shouldPrompt(true, true, false));
        gate.pause(false); gate.resume();
        assertTrue(gate.shouldPrompt(true, true, false));
    }
    @Test public void automaticPromptNeverAppearsForUnlockedOrDisabledScreen() {
        var gate = new NativeAuthenticationGate(); gate.resume();
        assertFalse(gate.shouldPrompt(false, true, false));
        assertFalse(gate.shouldPrompt(true, false, false));
        assertFalse(gate.shouldPrompt(true, true, true));
        gate.destroy(); assertFalse(gate.shouldPrompt(true, true, false));
    }
    @Test public void successIsSingleUseAndRequiresResume() {
        var gate = new NativeAuthenticationGate();
        long attempt = gate.begin(100);
        assertFalse(gate.consume(101));
        gate.success(attempt, 102);
        assertFalse(gate.consume(103));
        gate.resume();
        assertTrue(gate.consume(104));
        assertFalse(gate.consume(105));
        gate.success(attempt, 106);
        assertFalse(gate.consume(107));
    }
    @Test public void returningFromBackgroundDoesNotReuseEarlierSuccess() {
        var gate = new NativeAuthenticationGate(); gate.resume();
        long attempt = gate.begin(100); gate.success(attempt, 101);
        gate.pause(); gate.resume();
        assertFalse(gate.consume(102));
    }
    @Test public void oldOrCancelledCallbackCannotAuthorizeNewRequest() {
        var gate = new NativeAuthenticationGate(); gate.resume();
        long old = gate.begin(100); gate.cancel();
        long current = gate.begin(101);
        gate.success(old, 102); assertFalse(gate.consume(103));
        gate.success(current, 104); assertTrue(gate.consume(105));
    }
    @Test public void lateCredentialResultExpiresAndDestroyAlwaysRejects() {
        var gate = new NativeAuthenticationGate();
        long attempt = gate.begin(100); gate.success(attempt, 101);
        gate.resume(); assertFalse(gate.consume(5102));
        long next = gate.begin(6000); gate.destroy();
        gate.success(next, 6001); gate.resume();
        assertFalse(gate.consume(6002));
    }
}
