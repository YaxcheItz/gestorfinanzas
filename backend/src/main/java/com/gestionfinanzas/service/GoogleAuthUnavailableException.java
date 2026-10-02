package com.gestionfinanzas.service;

public class GoogleAuthUnavailableException extends RuntimeException {
    public GoogleAuthUnavailableException() {
        super("El inicio de sesión con Google no está configurado.");
    }
}
