package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CategoriaRequest;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final com.gestionfinanzas.repository.CategoriaHistoricaRepository historicas;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransaccionRepository transaccionRepository;
    private final PresupuestoRepository presupuestoRepository;
    private final PlantillaRecurrenteRepository plantillaRecurrenteRepository;
    private final com.gestionfinanzas.repository.LineaAsientoRepository lineaAsientoRepository;

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
        validarLongitudNombre(nombre);
        // Share the bank-receipt lock before checking whether its category already exists.
        Usuario usuario = usuarioRepository.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (categoriaRepository.existsByUsuarioIdAndTipoAndNombreIgnoreCase(usuarioId, request.tipo(), nombre)) {
            throw new IllegalArgumentException("Ya existe una categoría con ese nombre y tipo");
        }
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
        String nombre = request.nombre().trim();
        if (!nombre.equals(categoria.getNombre())) validarLongitudNombre(nombre);
        if (categoria.getTipo() != request.tipo()
                && (transaccionRepository.existsByCategoriaId(categoriaId)
                || presupuestoRepository.existsByCategoriaId(categoriaId))) {
            throw new IllegalArgumentException("No se puede cambiar el tipo de una categoría que ya tiene movimientos o presupuestos");
        }
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

    @Transactional
    public void eliminarCategoria(Long usuarioId, Long categoriaId) {
        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categoría personalizada no encontrada"));
        var presupuestos=presupuestoRepository.findAllByCategoriaId(categoriaId);
        var recurrentes=plantillaRecurrenteRepository.findAllByCategoriaId(categoriaId);
        var actual=java.time.YearMonth.from(CalendarioFinanciero.hoy());
        if (presupuestos.stream().anyMatch(p -> !java.time.YearMonth.of(p.getAnio(),p.getMes()).isBefore(actual))
                || recurrentes.stream().anyMatch(com.gestionfinanzas.model.entity.PlantillaRecurrente::isActiva)) {
            throw new IllegalArgumentException("Reasigna los presupuestos vigentes y movimientos recurrentes activos antes de eliminar.");
        }
        var movimientos=transaccionRepository.findAllByCategoriaId(categoriaId);
        if (!presupuestos.isEmpty() || !recurrentes.isEmpty() || !movimientos.isEmpty() || lineaAsientoRepository.existsByCategoriaId(categoriaId)) {
            var copia=historicas.saveAndFlush(com.gestionfinanzas.model.entity.CategoriaHistorica.copiar(categoria));
            presupuestos.forEach(p -> p.conservarCategoria(copia));
            recurrentes.forEach(p -> p.conservarCategoria(copia));
            movimientos.forEach(p -> p.conservarCategoria(copia));
            presupuestoRepository.flush();
        }
        categoriaRepository.delete(categoria);
    }

    public record Referencias(long movimientos, long presupuestos, long recurrencias, long lineasLibro, long presupuestosActivos, long recurrenciasActivas) {}
    @Transactional(readOnly = true)
    public Referencias referencias(Long usuarioId, Long categoriaId) {
        categoriaRepository.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categor\u00eda no encontrada."));
        return new Referencias(transaccionRepository.countByCategoriaId(categoriaId), presupuestoRepository.countByCategoriaId(categoriaId),
                plantillaRecurrenteRepository.countByCategoriaId(categoriaId), lineaAsientoRepository.countByCategoriaId(categoriaId),
                presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(usuarioId).stream().filter(p->p.getCategoria().getId().equals(categoriaId)).filter(p->!java.time.YearMonth.of(p.getAnio(),p.getMes()).isBefore(java.time.YearMonth.from(CalendarioFinanciero.hoy()))).count(),
                plantillaRecurrenteRepository.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).stream().filter(p->p.isActiva()&&p.getCategoria()!=null&&p.getCategoria().getId().equals(categoriaId)).count());
    }

    @Transactional
    public void reasignarYEliminar(Long usuarioId,Long id,Long destinoId) {
        if (destinoId != null) reasignarActivos(usuarioId,id,destinoId);
        eliminarCategoria(usuarioId,id);
    }

    public record Reasignacion(int presupuestos, int recurrencias) {}

    @Transactional
    public Reasignacion reasignarActivos(Long usuarioId, Long origenId, Long destinoId) {
        if (origenId.equals(destinoId)) throw new IllegalArgumentException("Elige una categor\u00eda distinta.");
        Categoria origen = categoriaRepository.findByIdAndUsuarioId(origenId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categor\u00eda de origen no encontrada."));
        Categoria destino = categoriaRepository.findAccessibleById(destinoId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Categor\u00eda de destino no disponible."));
        if (origen.getTipo() != destino.getTipo()) throw new IllegalArgumentException("Elige una categor\u00eda del mismo tipo.");
        java.time.YearMonth actual = java.time.YearMonth.from(CalendarioFinanciero.hoy());
        var presupuestos = presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(usuarioId).stream()
                .filter(p -> p.getCategoria().getId().equals(origenId))
                .filter(p -> !java.time.YearMonth.of(p.getAnio(), p.getMes()).isBefore(actual)).toList();
        for (var p : presupuestos) {
            Long listaId = p.getLista() == null ? null : p.getLista().getId();
            var existente = listaId == null
                    ? presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaIsNull(usuarioId, destinoId, p.getMes(), p.getAnio())
                    : presupuestoRepository.findByUsuarioIdAndCategoriaIdAndMesAndAnioAndListaId(usuarioId, destinoId, p.getMes(), p.getAnio(), listaId);
            if (existente.isPresent()) throw new IllegalArgumentException("La categor\u00eda de destino ya tiene un presupuesto en el mismo periodo y lista. Resuelve el conflicto antes de continuar.");
        }
        var recurrentes = plantillaRecurrenteRepository.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).stream()
                .filter(p -> p.isActiva() && p.getCategoria() != null && p.getCategoria().getId().equals(origenId)).toList();
        presupuestos.forEach(p -> p.setCategoria(destino));
        recurrentes.forEach(p -> p.setCategoria(destino));
        presupuestoRepository.saveAll(presupuestos); plantillaRecurrenteRepository.saveAll(recurrentes);
        return new Reasignacion(presupuestos.size(), recurrentes.size());
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

    private void validarLongitudNombre(String nombre) {
        if (nombre.length() < 2 || nombre.length() > 20) {
            throw new IllegalArgumentException("El nombre debe tener entre 2 y 20 caracteres");
        }
    }

    private String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
