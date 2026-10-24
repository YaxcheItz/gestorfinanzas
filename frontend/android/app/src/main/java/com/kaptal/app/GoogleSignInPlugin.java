package com.kaptal.app;

import android.app.KeyguardManager;
import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "GoogleSignIn")
public class GoogleSignInPlugin extends Plugin {
    private PluginCall pending;
    private CancellationSignal cancellation;

    @PluginMethod public void signIn(PluginCall call) {
        String clientId = call.getString("clientId");
        if (clientId == null || clientId.length() > 256
            || !clientId.matches("[0-9]+-[A-Za-z0-9_-]+\\.apps\\.googleusercontent\\.com")) {
            call.reject("El acceso Google no esta configurado.", "CONFIGURATION"); return;
        }
        getActivity().runOnUiThread(() -> {
            if (getContext().getSystemService(KeyguardManager.class).isKeyguardLocked()) {
                call.reject("Desbloquea el telefono para entrar.", "LOCKED"); return;
            }
            if (pending != null) { call.reject("Ya hay un acceso en curso.", "IN_PROGRESS"); return; }
            pending = call;
            cancellation = new CancellationSignal();
            try {
                var option = new GetSignInWithGoogleOption.Builder(clientId).build();
                var request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
                CredentialManager.create(getContext()).getCredentialAsync(
                    new MutableContextWrapper(getActivity()), request, cancellation,
                    ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            if (!finish(call)) return;
                            try {
                                if (!(response.getCredential() instanceof CustomCredential credential)
                                    || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    call.reject("Google no devolvio una credencial valida.", "INVALID_CREDENTIAL"); return;
                                }
                                String token = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                                if (token.isBlank() || token.length() > 8192) throw new IllegalArgumentException();
                                // Solo memoria: el backend existente verifica firma, audiencia, emisor y vencimiento.
                                call.resolve(new JSObject().put("credential", token));
                            } catch (RuntimeException ex) {
                                call.reject("Google no devolvio una credencial valida.", "INVALID_CREDENTIAL");
                            }
                        }
                        @Override public void onError(GetCredentialException error) {
                            if (!finish(call)) return;
                            call.reject("No se pudo completar el acceso con Google.",
                                error instanceof GetCredentialCancellationException ? "CANCELLED" : "GOOGLE_UNAVAILABLE");
                        }
                    });
            } catch (RuntimeException ex) {
                finish(call);
                call.reject("No se pudo abrir el acceso con Google.", "GOOGLE_UNAVAILABLE");
            }
        });
    }

    private boolean finish(PluginCall call) {
        if (pending != call) return false;
        pending = null; cancellation = null; return true;
    }

    @Override protected void handleOnDestroy() {
        if (cancellation != null) cancellation.cancel();
        if (pending != null) pending.reject("Acceso cancelado.", "CANCELLED");
        pending = null; cancellation = null;
    }
}
