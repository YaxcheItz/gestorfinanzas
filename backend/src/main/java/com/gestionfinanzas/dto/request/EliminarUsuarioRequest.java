package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.Size;

/** Prueba de titularidad con contraseña local o una credencial reciente de Google. */
public record EliminarUsuarioRequest(
        @Size(min = 8, max = 20, message = "La contraseña debe tener entre 8 y 20 caracteres")
        String password,
        @Size(max = 4096, message = "La credencial de Google no es válida")
        String googleCredential
) {
    public EliminarUsuarioRequest(String password) {
        this(password, null);
    }
}
