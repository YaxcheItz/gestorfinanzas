package com.gestionfinanzas.ai;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Tiempos de espera solo para proveedores de IA, sin cambiar clientes de correo. */
public class AiHttpClient {
    public RestClient.Builder configurar(RestClient.Builder builder) {
        var factory=new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);factory.setReadTimeout(30000);
        return builder.clone().requestFactory(factory);
    }
    public RestClient.Builder configurarCaptura(RestClient.Builder builder) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(5000);
        return builder.clone().requestFactory(factory);
    }
}
