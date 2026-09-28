package com.gestionfinanzas.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.AuditoriaTransaccionResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import com.gestionfinanzas.repository.AuditoriaTransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditoriaTransaccionService {

    private final AuditoriaTransaccionRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void registrar(Long usuarioId, Long transaccionId, String accion,
                          TransaccionResponse antes, TransaccionResponse despues) {
        auditoriaRepository.save(AuditoriaTransaccion.builder()
                .usuario(usuarioRepository.getReferenceById(usuarioId))
                .transaccionId(transaccionId)
                .accion(accion)
                .antesJson(serializar(antes))
                .despuesJson(serializar(despues))
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditoriaTransaccionResponse> listar(Long usuarioId, Pageable pageable) {
        return auditoriaRepository.findByUsuarioIdOrderByFechaEventoDescIdDesc(usuarioId, pageable)
                .map(this::mapear);
    }

    @Transactional(readOnly = true)
    public List<AuditoriaTransaccionResponse> listarParaRespaldo(Long usuarioId) {
        return auditoriaRepository.findAllByUsuarioIdOrderByFechaEventoAscIdAsc(usuarioId).stream()
                .map(this::mapear)
                .toList();
    }

    private AuditoriaTransaccionResponse mapear(AuditoriaTransaccion auditoria) {
        return new AuditoriaTransaccionResponse(
                auditoria.getId(),
                auditoria.getTransaccionId(),
                auditoria.getAccion(),
                deserializar(auditoria.getAntesJson()),
                deserializar(auditoria.getDespuesJson()),
                auditoria.getFechaEvento()
        );
    }

    private String serializar(TransaccionResponse transaccion) {
        if (transaccion == null) return null;
        try {
            return objectMapper.writeValueAsString(transaccion);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No fue posible guardar el historial del movimiento.", exception);
        }
    }

    private TransaccionResponse deserializar(String snapshot) {
        if (snapshot == null) return null;
        try {
            return objectMapper.readValue(snapshot, TransaccionResponse.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No fue posible leer el historial del movimiento.", exception);
        }
    }
}
