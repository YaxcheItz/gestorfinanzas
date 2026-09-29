package com.gestionfinanzas.service;

public record RecuperacionCorreoEvent(Long usuarioId, String email, String token) {}
