package com.gestionfinanzas.service;

/**
 * Envio de correo transaccional. Hay dos implementaciones porque el plan
 * gratuito de Render bloquea el trafico saliente por SMTP (puertos 25, 465 y
 * 587), asi que ahi se usa Resend, que va por HTTPS.
 */
public interface EnvioCorreo {

    void enviar(String destinatario, String asunto, String cuerpo);
}
