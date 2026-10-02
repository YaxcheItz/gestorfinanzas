package com.gestionfinanzas.dto.response;

public record AuthResponse(
    String token,
    String tokenType,
    Long id,
    String nombre,
    String email,
    boolean googleLinked
) {
    public static AuthResponse of(String token, Long id, String nombre, String email, boolean googleLinked) {
        return new AuthResponse(token, "Bearer", id, nombre, email, googleLinked);
    }
}
