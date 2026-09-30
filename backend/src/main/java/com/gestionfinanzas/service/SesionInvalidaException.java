package com.gestionfinanzas.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * La cookie de refresh no sirve: expiró, ya se rotó, se revocó o nunca existió.
 *
 * Se traduce a 401 para que el frontend la trate como "sesión muerta" y mande al login, en lugar
 * de inventar un error de red que el usuario no podría hacer nada.
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class SesionInvalidaException extends RuntimeException {

    public SesionInvalidaException() {
        super("La sesión expiró. Inicia sesión nuevamente.");
    }
}
