package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.ListaRequest;
import com.gestionfinanzas.dto.response.*;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.ListaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/listas") @RequiredArgsConstructor
public class ListaController {
    private final ListaService servicio;
    private final com.gestionfinanzas.repository.TransaccionRepository transacciones;
    public record Estado(@NotNull Boolean archivada) {}
    public record Rol(@NotNull @Pattern(regexp = "EDITOR|LECTOR") String rol) {}
    public record Codigo(@NotBlank @Size(max = 64) String codigo) {}
    @GetMapping public ApiResponse<List<ListaResponse>> listar(@AuthenticationPrincipal CustomUserDetails u) { return ApiResponse.ok("Listas", servicio.listar(u.getId())); }
    @GetMapping("/{id}/etiquetas") public ApiResponse<List<String>> etiquetas(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) { servicio.leer(u.getId(), id); return ApiResponse.ok("Etiquetas", transacciones.etiquetasDeLista(id)); }
    @PostMapping public ApiResponse<ListaResponse> crear(@AuthenticationPrincipal CustomUserDetails u, @Valid @RequestBody ListaRequest r) { return ApiResponse.ok("Lista creada", servicio.crear(u.getId(), r)); }
    @PutMapping("/{id}") public ApiResponse<ListaResponse> editar(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id, @Valid @RequestBody ListaRequest r) { return ApiResponse.ok("Lista actualizada", servicio.editar(u.getId(), id, r)); }
    @PatchMapping("/{id}/estado") public ApiResponse<Void> estado(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id, @Valid @RequestBody Estado r) { servicio.archivar(u.getId(), id, r.archivada()); return ApiResponse.ok("Lista actualizada", null); }
    @PostMapping("/{id}/invitacion") public ApiResponse<ListaService.Invitacion> invitar(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id, @Valid @RequestBody Rol r) { return ApiResponse.ok("Invitación creada", servicio.invitar(u.getId(), id, r.rol())); }
    @DeleteMapping("/{id}/invitacion") public ApiResponse<Void> revocar(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) { servicio.revocar(u.getId(), id); return ApiResponse.ok("Invitación revocada", null); }
    @PostMapping("/unirse") public ApiResponse<ListaResponse> unirse(@AuthenticationPrincipal CustomUserDetails u, @Valid @RequestBody Codigo r) { return ApiResponse.ok("Te uniste a la lista", servicio.unirse(u.getId(), r.codigo())); }
    @DeleteMapping("/{id}/miembros/{miembro}") public ApiResponse<Void> salir(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id, @PathVariable Long miembro) { servicio.quitarMiembro(u.getId(), id, miembro); return ApiResponse.ok("Acceso retirado", null); }
    @PatchMapping("/{id}/miembros/{miembro}/rol") public ApiResponse<ListaResponse> cambiarRol(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id, @PathVariable Long miembro, @Valid @RequestBody Rol r) { return ApiResponse.ok("Permiso actualizado", servicio.cambiarRol(u.getId(), id, miembro, r.rol())); }
}
