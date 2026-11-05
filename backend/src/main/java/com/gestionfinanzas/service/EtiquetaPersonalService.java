package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.EtiquetaPersonal;
import com.gestionfinanzas.repository.EtiquetaPersonalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class EtiquetaPersonalService {
    private final EtiquetaPersonalRepository repositorio;
    @Transactional(readOnly=true)
    public List<EtiquetaPersonal> listar(Long usuarioId) { return repositorio.findByUsuarioIdOrderByNombreAsc(usuarioId); }
    @Transactional
    public EtiquetaPersonal crear(Long usuarioId, String nombre) {
        String limpio=EtiquetasFinancieras.normalizar(List.of(nombre)).iterator().next();
        if (repositorio.existsByUsuarioIdAndNombre(usuarioId, limpio)) throw new IllegalArgumentException("Ya existe esa etiqueta.");
        return repositorio.save(EtiquetaPersonal.builder().usuarioId(usuarioId).nombre(limpio).build());
    }
    @Transactional
    public void eliminar(Long usuarioId, Long id) {
        var etiqueta=repositorio.findByIdAndUsuarioId(id, usuarioId).orElseThrow(() -> new IllegalArgumentException("Etiqueta no encontrada."));
        repositorio.delete(etiqueta);
    }
}
