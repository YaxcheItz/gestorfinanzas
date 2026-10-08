package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.*;
import com.gestionfinanzas.model.entity.PropuestaChat;
import com.gestionfinanzas.repository.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

/** El estado y la operación confirmada participan en la misma transacción. */
@Service @RequiredArgsConstructor
public class PropuestaChatService {
    private final PropuestaChatRepository propuestas;
    private final UsuarioRepository usuarios;
    private final ObjectMapper mapper;
    private final EntityManager entityManager;

    @Transactional
    public PropuestaChat crear(Long usuarioId,String tipo,String resumen,JsonNode datos) {
        var usuario=usuarios.findByIdForUpdate(usuarioId).orElseThrow(() -> new IllegalArgumentException("Cuenta no disponible."));
        entityManager.refresh(usuario);
        if (!usuario.isActivo()) throw new IllegalArgumentException("Cuenta no disponible.");
        if (pendientes(usuarioId).size()>=50) throw new IllegalArgumentException("Tienes demasiadas propuestas pendientes. Guarda o descarta alguna.");
        if (resumen.length()>500 || datos.toString().length()>20000) throw new IllegalArgumentException("La propuesta es demasiado larga.");
        return propuestas.save(PropuestaChat.builder().id(UUID.randomUUID().toString()).usuario(usuario).tipo(tipo)
            .resumen(resumen).datos(datos.toString()).vence(Instant.now().plusSeconds(86400)).build());
    }
    @Transactional(readOnly=true)
    public List<PropuestaChat> pendientes(Long usuarioId) {
        return propuestas.findByUsuarioIdAndCompletadaFalseAndDescartadaFalseAndVenceAfterOrderByVenceAsc(usuarioId,Instant.now());
    }
    /** Siempre adquirir usuario antes de propuesta, igual que el borrado de cuenta. */
    public PropuestaChat bloquear(Long usuarioId,String id) {
        var usuario=usuarios.findByIdForUpdate(usuarioId).orElseThrow(() -> new IllegalArgumentException("Cuenta no disponible."));
        entityManager.refresh(usuario);
        if (!usuario.isActivo()) throw new IllegalArgumentException("Cuenta no disponible.");
        var propuesta=propuestas.bloquear(id,usuarioId).orElseThrow(() -> new IllegalArgumentException("Propuesta no disponible para esta cuenta."));
        entityManager.refresh(propuesta);
        return propuesta;
    }
    public void exigirPendiente(PropuestaChat p) {
        if (p.isDescartada() || p.isCompletada() || !p.getVence().isAfter(Instant.now()))
            throw new IllegalArgumentException("La propuesta ya no está pendiente. Recupera la lista o prepara otra.");
    }
    public JsonNode datos(PropuestaChat p) {
        try { return mapper.readTree(p.getDatos()); }
        catch (java.io.IOException ex) { throw new IllegalArgumentException("No se pudo leer la propuesta."); }
    }
    public AiActionService.ActionProposal dto(PropuestaChat p) {
        return new AiActionService.ActionProposal(p.getId(),p.getTipo(),p.getResumen(),datos(p),p.getVersion());
    }
    public AiActionService.ActionProposal guardar(PropuestaChat p) {
        return dto(propuestas.saveAndFlush(p));
    }
    public record NuevaPropuesta(String tipo,String resumen,JsonNode datos) {}
    @Transactional
    public List<AiActionService.ActionProposal> crearLote(Long usuarioId,List<NuevaPropuesta> lote) {
        if(lote.isEmpty() || lote.size()>8)throw new IllegalArgumentException("Prepara entre uno y ocho movimientos por mensaje.");
        return lote.stream().map(p -> dto(crear(usuarioId,p.tipo(),p.resumen(),p.datos()))).toList();
    }
}
