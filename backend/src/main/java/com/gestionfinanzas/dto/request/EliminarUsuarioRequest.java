package com.gestionfinanzas.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * El borrado de la cuenta es irreversible: se pierde tambien el libro contable y la
 * auditoria. Por eso se exige la contrasena actual, que es la unica forma de comprobar
 * que quien pulsa el boton es el titular de la cuenta.
 */
public record EliminarUsuarioRequest(
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 20, message = "La contraseña debe tener entre 8 y 20 caracteres")
        String password
) {}
