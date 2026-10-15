package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.ListaRequest;
import com.gestionfinanzas.dto.response.ListaResponse;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class ListaService {
    private final ListaRepository listas;
    private final ListaMiembroRepository miembros;
    private final UsuarioRepository usuarios;

    @Transactional
    public ListaFinanciera personal(Long usuarioId) {
        var existente = listas.findByPropietarioIdAndClave(usuarioId, "PERSONAL");
        if (existente.isPresent()) return existente.get();
        var usuario = usuarios.findByIdForUpdate(usuarioId).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        // Serializa únicamente la creación inicial para evitar dos listas Personal.
        return listas.findByPropietarioIdAndClave(usuarioId, "PERSONAL").orElseGet(() -> {
            var lista = listas.save(ListaFinanciera.builder().propietario(usuario).nombre("Personal").clave("PERSONAL").build());
            miembros.save(ListaMiembro.builder().lista(lista).usuario(usuario).rol("PROPIETARIO").build());
            return lista;
        });
    }

    @Transactional
    public List<ListaResponse> listar(Long usuarioId) {
        personal(usuarioId);
        return miembros.findByUsuarioIdOrderByIdAsc(usuarioId).stream().map(m -> respuesta(m.getLista(), m.getRol())).toList();
    }

    @Transactional
    public ListaResponse crear(Long usuarioId, ListaRequest request) {
        var usuario = usuarios.findByIdForUpdate(usuarioId).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        if (listas.countByPropietarioId(usuarioId) >= 30) throw new IllegalArgumentException("Puedes tener hasta 30 listas propias.");
        var lista = listas.save(ListaFinanciera.builder().propietario(usuario).nombre(request.nombre().trim())
                .emoji(request.emoji().trim()).moneda(request.moneda()).build());
        miembros.save(ListaMiembro.builder().lista(lista).usuario(usuario).rol("PROPIETARIO").build());
        return respuesta(lista, "PROPIETARIO");
    }

    @Transactional(readOnly = true)
    public ListaFinanciera leer(Long usuarioId, Long listaId) {
        return miembros.findByListaIdAndUsuarioId(listaId, usuarioId)
                .orElseThrow(() -> new PermisoCompartidoException("No tienes acceso a esta lista.")).getLista();
    }

    @Transactional
    public ListaFinanciera escribir(Long usuarioId, Long listaId) {
        if (listaId == null) return personal(usuarioId);
        var lista = listas.bloquear(listaId).orElseThrow(() -> new PermisoCompartidoException("No tienes acceso a esta lista."));
        var miembro = miembros.findByListaIdAndUsuarioId(listaId, usuarioId)
                .orElseThrow(() -> new PermisoCompartidoException("No tienes acceso a esta lista."));
        if (lista.isArchivada() || miembro.getRol().equals("LECTOR")) throw new PermisoCompartidoException("Esta lista es de solo lectura. Elige otra para registrar.");
        return lista;
    }

    private ListaFinanciera administrar(Long usuarioId, Long id) {
        var lista = listas.bloquear(id).orElseThrow(() -> new PermisoCompartidoException("Lista no disponible."));
        if (lista.getPropietario() == null || !lista.getPropietario().getId().equals(usuarioId)) throw new PermisoCompartidoException("Solo el propietario puede administrar esta lista.");
        return lista;
    }

    @Transactional
    public ListaResponse editar(Long usuarioId, Long id, ListaRequest request) {
        var lista = administrar(usuarioId, id);
        lista.setNombre(request.nombre().trim()); lista.setEmoji(request.emoji().trim()); lista.setMoneda(request.moneda());
        // La moneda es de presentación: no transforma las monedas/importes de las cuentas.
        return respuesta(lista, "PROPIETARIO");
    }

    @Transactional
    public void archivar(Long usuarioId, Long id, boolean archivada) {
        var lista = administrar(usuarioId, id);
        if (lista.getClave() != null) throw new IllegalArgumentException("Personal se conserva para tus registros predeterminados.");
        lista.setArchivada(archivada);
        lista.setInvitacionHash(null); lista.setInvitacionVence(null);
    }

    public record Invitacion(String codigo, Instant vence, String rol) {}
    @Transactional
    public Invitacion invitar(Long usuarioId, Long id, String rol) {
        var lista = administrar(usuarioId, id);
        if (lista.isArchivada() || lista.getClave() != null) throw new IllegalArgumentException("Crea una lista activa distinta de Personal para compartir.");
        if (!Set.of("EDITOR", "LECTOR").contains(rol)) throw new IllegalArgumentException("Elige acceso de editor o lector.");
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        String codigo = HexFormat.of().formatHex(bytes);
        var vence = Instant.now().plus(Duration.ofDays(7));
        lista.setInvitacionHash(hash(codigo)); lista.setInvitacionVence(vence); lista.setInvitacionRol(rol);
        return new Invitacion(codigo, vence, rol);
    }

    @Transactional
    public void revocar(Long usuarioId, Long id) {
        var lista = administrar(usuarioId, id); lista.setInvitacionHash(null); lista.setInvitacionVence(null);
    }

    @Transactional
    public ListaResponse unirse(Long usuarioId, String codigo) {
        if (codigo == null || !codigo.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("La invitación no es válida o ya venció.");
        var lista = listas.buscarInvitacion(hash(codigo)).orElseThrow(() -> new IllegalArgumentException("La invitación no es válida o ya venció."));
        if (lista.isArchivada() || lista.getInvitacionVence() == null || !lista.getInvitacionVence().isAfter(Instant.now())) throw new IllegalArgumentException("La invitación no es válida o ya venció.");
        var actual = miembros.findByListaIdAndUsuarioId(lista.getId(), usuarioId);
        if (actual.isPresent()) return respuesta(lista, actual.get().getRol());
        if (miembros.countByListaId(lista.getId()) >= 20) throw new IllegalArgumentException("Esta lista ya tiene 20 participantes.");
        miembros.save(ListaMiembro.builder().lista(lista).usuario(usuarios.getReferenceById(usuarioId)).rol(lista.getInvitacionRol()).build());
        return respuesta(lista, lista.getInvitacionRol());
    }

    @Transactional
    public void quitarMiembro(Long usuarioId, Long listaId, Long miembroId) {
        var lista = listas.bloquear(listaId).orElseThrow(() -> new PermisoCompartidoException("Lista no disponible."));
        leer(usuarioId, listaId);
        boolean propietario = lista.getPropietario() != null && lista.getPropietario().getId().equals(usuarioId);
        if (!propietario && !usuarioId.equals(miembroId)) throw new PermisoCompartidoException("No puedes cambiar otros participantes.");
        if (lista.getPropietario() != null && lista.getPropietario().getId().equals(miembroId)) throw new IllegalArgumentException("El propietario no puede salir de su propia lista.");
        miembros.findByListaIdAndUsuarioId(listaId, miembroId).ifPresent(miembros::delete);
        lista.setInvitacionHash(null); lista.setInvitacionVence(null);
    }

    /** Después de borrar los movimientos propios: conserva los del resto de participantes. */
    @Transactional
    public void eliminarUsuario(Long usuarioId) {
        for (var lista : listas.findByPropietarioId(usuarioId)) {
            var restantes = miembros.findByListaIdOrderByIdAsc(lista.getId()).stream().filter(m -> !m.getUsuario().getId().equals(usuarioId)).toList();
            lista.setInvitacionHash(null); lista.setInvitacionVence(null);
            if (restantes.isEmpty()) { miembros.deleteByListaId(lista.getId()); listas.delete(lista); }
            else {
                var nuevo = restantes.getFirst(); nuevo.setRol("PROPIETARIO");
                lista.setPropietario(nuevo.getUsuario()); lista.setClave(null);
            }
        }
        miembros.deleteByUsuarioId(usuarioId);
    }

    private ListaResponse respuesta(ListaFinanciera lista, String rol) {
        return new ListaResponse(lista.getId(), lista.getNombre(), lista.getEmoji(), lista.getMoneda(), lista.getClave() != null,
                lista.isArchivada(), rol, miembros.findByListaIdOrderByIdAsc(lista.getId()).stream()
                .map(m -> new ListaResponse.Miembro(m.getUsuario().getId(), m.getUsuario().getNombre(), m.getRol())).toList());
    }
    private static String hash(String codigo) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(codigo.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
