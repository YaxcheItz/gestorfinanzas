package com.gestionfinanzas.service;

/**
 * El envio fallo. Se propaga como fallo de negocio para que quien llama decida,
 * en vez de tragarselo y dejar al usuario esperando un correo que no llega.
 */
public class MailDeliveryException extends RuntimeException {

    public MailDeliveryException(Throwable cause) {
        super("No se pudo entregar el correo", cause);
    }
}
