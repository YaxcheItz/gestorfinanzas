package com.gestionfinanzas.ai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiConfiguration {
    @org.springframework.context.annotation.Bean
    public AiHttpClient clienteIa() { return new AiHttpClient(); }
}
