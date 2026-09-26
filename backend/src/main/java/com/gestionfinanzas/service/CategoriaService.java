package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CategoriaRequest;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransaccionRepository transaccionRepository;
    private final PresupuestoRepository presupuestoRepository;

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarCategorias(Long usuarioId) {
        return categoriaRepository.findDisponiblesParaUsuario(usuarioId)
                .stream()
                .map(CategoriaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarTodasDelUsuario(Long usuarioId) {
        return categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId)
                .stream()
                .map(CategoriaResponse::fromEntity)
                .toList();
    }

    @Transactional
    public CategoriaResponse crearCategoria(Long usuarioId, CategoriaRequest request) {
        validarTipoEditable(request.tipo());
        String nombre = request.nombre().trim();
        if (categoriaRepository.existsByUsuarioIdAndTipoAndNombreIgnoreCase(usuarioId, request.tipo(), nombre)) {
            throw new IllegalArgumentException("Ya existe una categoría con ese nombre y tipo");
        }
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        Categoria categoria = Categoria.builder()
                .usuario(usuario)
                .nombre(nombre)
                .tipo(request.tipo())
                .icono(normalizar(request.icono()))
                .color(normalizar(request.color()))
                .activo(true)
                .build();
        return CategoriaResponse.fromEntity(categoriaRepository.save(categoria));
    }

    @Transactional
    public CategoriaResponse actualizarCategoria(Long usuarioId, Long categoriaId, CategoriaRequest request) {
        validarTipoEditable(request.tipo());
        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría personalizada no encontrada"));
        if (categoria.getTipo() != request.tipo()
                && (transaccionRepository.existsByCategoriaId(categoriaId)
                || presupuestoRepository.existsByCategoriaId(categoriaId))) {
            throw new IllegalArgumentException("No se puede cambiar el tipo de una categoría que ya tiene movimientos o presupuestos");
        }
        String nombre = request.nombre().trim();
        if ((!categoria.getNombre().equalsIgnoreCase(nombre) || categoria.getTipo() != request.tipo())
                && categoriaRepository.existsByUsuarioIdAndTipoAndNombreIgnoreCase(usuarioId, request.tipo(), nombre)) {
            throw new IllegalArgumentException("Ya existe una categoría con ese nombre y tipo");
        }
        categoria.setNombre(nombre);
        categoria.setTipo(request.tipo());
        categoria.setIcono(normalizar(request.icono()));
        categoria.setColor(normalizar(request.color()));
        return CategoriaResponse.fromEntity(categoriaRepository.save(categoria));
    }

    @Transactional
    public void cambiarEstadoCategoria(Long usuarioId, Long categoriaId, boolean activa) {
        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría personalizada no encontrada"));
        categoria.setActivo(activa);
        categoriaRepository.save(categoria);
    }

    @Transactional(readOnly = true)
    public Categoria obtenerCategoriaAccesible(Long categoriaId, Long usuarioId) {
        return categoriaRepository.findAccessibleById(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada o no accesible"));
    }

    private void validarTipoEditable(TipoTransaccion tipo) {
        if (tipo != TipoTransaccion.INGRESO && tipo != TipoTransaccion.GASTO) {
            throw new IllegalArgumentException("Las categorías solo pueden ser de ingreso o gasto");
        }
    }

    private String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
