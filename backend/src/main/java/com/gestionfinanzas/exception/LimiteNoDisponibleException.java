package com.gestionfinanzas.exception;

public class LimiteNoDisponibleException extends RuntimeException {
    public LimiteNoDisponibleException() {
        super("No se pudo comprobar el límite. Reintenta en un momento.");
    }
}
