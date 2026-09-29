package com.gestionfinanzas.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.AsientoContableResponse;
import com.gestionfinanzas.dto.response.AuditoriaTransaccionResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.dto.response.RespaldoFinancieroResponse;
import com.gestionfinanzas.dto.response.RestauracionRespaldoPreviewResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.entity.AsientoContable;
import com.gestionfinanzas.model.entity.AuditoriaTransaccion;
import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.LineaAsiento;
import com.gestionfinanzas.model.entity.PlantillaRecurrente;
import com.gestionfinanzas.model.entity.Presupuesto;
import com.gestionfinanzas.model.entity.Transaccion;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.AuditoriaTransaccionRepository;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class RestauracionRespaldoService {

    private static final int VERSION_COMPATIBLE = 1;
    private static final int MAX_REGISTROS = 20_000;
    private static final Map<String, CategoriaInicial> CATEGORIAS_INICIALES = Map.of(
            "Alimentos y Supermercado", new CategoriaInicial(TipoTransaccion.GASTO, "shopping-cart", "#f59e0b"),
            "Vivienda y Servicios", new CategoriaInicial(TipoTransaccion.GASTO, "home", "#ef4444"),
            "Transporte", new CategoriaInicial(TipoTransaccion.GASTO, "car", "#3b82f6"),
            "Salud y Bienestar", new CategoriaInicial(TipoTransaccion.GASTO, "heart", "#ec4899"),
            "Ocio y Salidas", new CategoriaInicial(TipoTransaccion.GASTO, "coffee", "#8b5cf6"),
            "Salario", new CategoriaInicial(TipoTransaccion.INGRESO, "briefcase", "#10b981"),
            "Inversiones", new CategoriaInicial(TipoTransaccion.INGRESO, "trending-up", "#06b6d4"),
            "Otros Ingresos", new CategoriaInicial(TipoTransaccion.INGRESO, "plus-circle", "#84cc16")
    );

    private final UsuarioRepository usuarioRepository;
    private final CuentaRepository cuentaRepository;
    private final CategoriaRepository categoriaRepository;
    private final PresupuestoRepository presupuestoRepository;
    private final PlantillaRecurrenteRepository plantillaRepository;
    private final TransaccionRepository transaccionRepository;
    private final AuditoriaTransaccionRepository auditoriaRepository;
    private final AsientoContableRepository asientoRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public RestauracionRespaldoPreviewResponse previsualizar(Long usuarioId, RespaldoFinancieroResponse respaldo) {
        validarContenido(respaldo);
        boolean vacio = destinoVacio(usuarioId);
        List<String> advertencias = new ArrayList<>();
        if (!vacio) {
            advertencias.add("Por seguridad, solo se puede restaurar en una cuenta nueva o que conserve intactos sus datos de inicio y no tenga movimientos.");
        } else if (tieneDatosIniciales(usuarioId)) {
            advertencias.add("Se reemplazarán la billetera y las categorías iniciales sin cambios ni movimientos por las incluidas en el respaldo.");
        }
        if (respaldo.relacionesCashback() == null
                && respaldo.transacciones().stream().anyMatch(TransaccionResponse::cashbackAutomatico)) {
            advertencias.add("Este respaldo antiguo no conserva el vínculo entre compras y sus movimientos automáticos de cashback.");
        }
        advertencias.add("Se conservarán tu correo, contraseña y preferencias actuales del perfil.");
        return new RestauracionRespaldoPreviewResponse(
                respaldo.version(), respaldo.generadoEn(), respaldo.cuentas().size(),
                respaldo.categoriasPersonalizadas().size(), respaldo.presupuestos().size(),
                respaldo.recurrencias().size(), respaldo.transacciones().size(),
                respaldo.historialMovimientos().size(), respaldo.libroDiario().size(),
                vacio, vacio, advertencias
        );
    }

    @Transactional
    public void restaurar(Long usuarioId, RespaldoFinancieroResponse respaldo) {
        validarContenido(respaldo);
        Usuario usuario = usuarioRepository.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró la cuenta de usuario."));
        if (!destinoVacio(usuarioId)) {
            throw new IllegalArgumentException("La restauración solo está disponible cuando la cuenta no tiene datos financieros. No se modificó ningún dato.");
        }
        eliminarDatosInicialesIntactos(usuarioId);

        Map<Long, Long> cuentas = restaurarCuentas(usuario, respaldo.cuentas());
        Map<Long, Long> categorias = restaurarCategorias(usuario, respaldo.categoriasPersonalizadas());
        Map<Long, Long> transacciones = restaurarTransacciones(usuario, respaldo.transacciones(), cuentas, categorias);
        restaurarCashback(respaldo.relacionesCashback(), transacciones);
        restaurarPresupuestos(usuario, respaldo.presupuestos(), categorias);
        restaurarRecurrencias(usuario, respaldo.recurrencias(), cuentas, categorias);
        restaurarHistorial(usuario, respaldo.historialMovimientos(), transacciones, cuentas, categorias);
        restaurarLibroDiario(usuario, respaldo.libroDiario(), transacciones, cuentas, categorias);

    }

    private boolean destinoVacio(Long usuarioId) {
        List<Cuenta> cuentas = cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId);
        List<Categoria> categorias = categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId);
        boolean cuentasSinUso = cuentas.isEmpty() || (cuentas.size() == 1 && esBilleteraInicialIntacta(cuentas.getFirst()));
        boolean categoriasSinUso = categorias.isEmpty() || sonCategoriasInicialesIntactas(categorias);
        return cuentasSinUso
                && categoriasSinUso
                && presupuestoRepository.findAllByUsuarioIdOrderByAnioDescMesDescIdAsc(usuarioId).isEmpty()
                && plantillaRepository.findAllByUsuarioIdOrderBySiguienteFechaAsc(usuarioId).isEmpty()
                && transaccionRepository.findAllByUsuarioIdOrderByFechaAscIdAsc(usuarioId).isEmpty()
                && auditoriaRepository.findAllByUsuarioIdOrderByFechaEventoAscIdAsc(usuarioId).isEmpty()
                && asientoRepository.findAllByUsuarioIdOrderByFechaOperacionAscIdAsc(usuarioId).isEmpty();
    }

    private boolean esBilleteraInicialIntacta(Cuenta cuenta) {
        return "Billetera / Efectivo".equals(cuenta.getNombre())
                && "Cuenta predeterminada de efectivo".equals(cuenta.getDescripcion())
                && cuenta.getTipo().name().equals("EFECTIVO")
                && "MXN".equals(cuenta.getMoneda())
                && cuenta.getSaldoActual().compareTo(BigDecimal.ZERO) == 0
                && cuenta.isActivo();
    }

    private boolean sonCategoriasInicialesIntactas(List<Categoria> categorias) {
        if (categorias.size() != CATEGORIAS_INICIALES.size()) return false;
        for (Categoria categoria : categorias) {
            CategoriaInicial inicial = CATEGORIAS_INICIALES.get(categoria.getNombre());
            if (inicial == null || categoria.getTipo() != inicial.tipo()
                    || !Objects.equals(categoria.getIcono(), inicial.icono())
                    || !Objects.equals(categoria.getColor(), inicial.color()) || !categoria.isActivo()) {
                return false;
            }
        }
        return true;
    }

    private void eliminarDatosInicialesIntactos(Long usuarioId) {
        cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).forEach(cuentaRepository::delete);
        categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).forEach(categoriaRepository::delete);
    }

    private boolean tieneDatosIniciales(Long usuarioId) {
        return !cuentaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).isEmpty()
                || !categoriaRepository.findByUsuarioIdOrderByActivoDescNombreAsc(usuarioId).isEmpty();
    }

    private void validarContenido(RespaldoFinancieroResponse respaldo) {
        if (respaldo == null || respaldo.version() != VERSION_COMPATIBLE || respaldo.generadoEn() == null
                || respaldo.perfil() == null || respaldo.cuentas() == null
                || respaldo.categoriasPersonalizadas() == null || respaldo.presupuestos() == null
                || respaldo.recurrencias() == null || respaldo.historialMovimientos() == null
                || respaldo.libroDiario() == null || respaldo.transacciones() == null) {
            throw new IllegalArgumentException("El archivo no tiene el formato de un respaldo Kaptal compatible.");
        }

        long total = (long) respaldo.cuentas().size() + respaldo.categoriasPersonalizadas().size()
                + respaldo.presupuestos().size() + respaldo.recurrencias().size()
                + respaldo.historialMovimientos().size() + respaldo.libroDiario().size()
                + respaldo.transacciones().size();
        if (total > MAX_REGISTROS) {
            throw new IllegalArgumentException("El respaldo supera el límite de registros permitido.");
        }

        Set<Long> cuentaIds = idsUnicos(respaldo.cuentas(), CuentaResponse::id, "cuentas");
        Set<Long> categoriaIds = idsUnicos(respaldo.categoriasPersonalizadas(), CategoriaResponse::id, "categorías");
        Set<Long> transaccionIds = idsUnicos(respaldo.transacciones(), TransaccionResponse::id, "movimientos");
        validarNombresCuentas(respaldo.cuentas());

        for (CuentaResponse cuenta : respaldo.cuentas()) {
            if (cuenta.nombre() == null || cuenta.nombre().isBlank() || cuenta.nombre().length() > 100
                    || cuenta.tipo() == null || cuenta.saldoActual() == null || cuenta.moneda() == null
                    || cuenta.moneda().length() < 3 || cuenta.moneda().length() > 10) {
                throw new IllegalArgumentException("El respaldo contiene una cuenta incompleta o no válida.");
            }
        }
        for (CategoriaResponse categoria : respaldo.categoriasPersonalizadas()) {
            if (!categoria.esPersonalizada() || categoria.nombre() == null || categoria.nombre().isBlank()
                    || categoria.nombre().length() > 80 || categoria.tipo() == null) {
                throw new IllegalArgumentException("El respaldo contiene una categoría no válida.");
            }
        }
        for (TransaccionResponse movimiento : respaldo.transacciones()) {
            if (movimiento.tipo() == null || movimiento.monto() == null
                    || movimiento.monto().compareTo(BigDecimal.ZERO) <= 0 || movimiento.fecha() == null
                    || movimiento.descripcion() == null || movimiento.descripcion().isBlank()
                    || movimiento.descripcion().length() > 200) {
                throw new IllegalArgumentException("El respaldo contiene un movimiento incompleto o no válido.");
            }
            validarReferencia(movimiento.cuentaId(), cuentaIds, "cuenta de un movimiento");
            validarReferencia(movimiento.cuentaDestinoId(), cuentaIds, "cuenta destino de un movimiento");
            if (movimiento.tipo() == TipoTransaccion.TRANSFERENCIA && movimiento.cuentaDestinoId() == null) {
                throw new IllegalArgumentException("El respaldo contiene una transferencia sin cuenta destino.");
            }
            validarCategoriaReferencia(movimiento.categoriaId(), categoriaIds,
                    movimiento.categoriaNombre(), movimiento.tipo());
        }
        if (respaldo.relacionesCashback() != null) {
            Set<Long> hijos = new HashSet<>();
            for (RespaldoFinancieroResponse.CashbackRespaldo relacion : respaldo.relacionesCashback()) {
                if (relacion == null || relacion.transaccionId() == null || relacion.origenId() == null
                        || !transaccionIds.contains(relacion.transaccionId())
                        || !transaccionIds.contains(relacion.origenId())
                        || relacion.transaccionId().equals(relacion.origenId())
                        || !hijos.add(relacion.transaccionId())) {
                    throw new IllegalArgumentException("El respaldo contiene una relación de cashback no válida.");
                }
            }
        }
        for (var presupuesto : respaldo.presupuestos()) {
            if (presupuesto == null) throw new IllegalArgumentException("El respaldo contiene un presupuesto no válido.");
            if (presupuesto.categoriaId() == null) {
                throw new IllegalArgumentException("El respaldo contiene un presupuesto sin categoría.");
            }
            validarCategoriaReferencia(presupuesto.categoriaId(), categoriaIds, null, null);
            if (presupuesto.montoLimite() == null || presupuesto.montoLimite().compareTo(BigDecimal.ZERO) <= 0
                    || presupuesto.mes() < 1 || presupuesto.mes() > 12 || presupuesto.anio() < 2000
                    || presupuesto.anio() > 2100) {
                throw new IllegalArgumentException("El respaldo contiene un presupuesto no válido.");
            }
        }
        for (PlantillaRecurrenteResponse recurrencia : respaldo.recurrencias()) {
            if (recurrencia == null) throw new IllegalArgumentException("El respaldo contiene una recurrencia no válida.");
            validarReferencia(recurrencia.cuentaId(), cuentaIds, "cuenta de una recurrencia");
            validarCategoriaReferencia(recurrencia.categoriaId(), categoriaIds,
                    recurrencia.categoriaNombre(), recurrencia.tipo());
            if (recurrencia.tipo() == null || recurrencia.monto() == null
                    || recurrencia.monto().compareTo(BigDecimal.ZERO) <= 0 || recurrencia.frecuencia() == null
                    || recurrencia.siguienteFecha() == null) {
                throw new IllegalArgumentException("El respaldo contiene una recurrencia no válida.");
            }
        }
        for (AuditoriaTransaccionResponse evento : respaldo.historialMovimientos()) {
            if (evento == null || evento.transaccionId() == null || evento.accion() == null
                    || evento.accion().length() > 12 || evento.fechaEvento() == null) {
                throw new IllegalArgumentException("El respaldo contiene un evento de historial no válido.");
            }
        }
        for (AsientoContableResponse asiento : respaldo.libroDiario()) {
            if (asiento == null || asiento.transaccionOrigenId() == null || asiento.tipoEvento() == null
                    || asiento.tipoEvento().length() > 24 || asiento.fechaOperacion() == null
                    || asiento.descripcion() == null || asiento.descripcion().length() > 200
                    || asiento.lineas() == null || asiento.lineas().size() < 2) {
                throw new IllegalArgumentException("El respaldo contiene un asiento contable no válido.");
            }
            Map<String, BigDecimal> diferenciasPorMoneda = new HashMap<>();
            for (var linea : asiento.lineas()) {
                if (linea.monto() == null || linea.monto().compareTo(BigDecimal.ZERO) <= 0
                        || linea.moneda() == null || linea.moneda().length() != 3 || linea.lado() == null
                        || linea.codigoCuenta() == null || linea.nombreCuenta() == null) {
                    throw new IllegalArgumentException("El respaldo contiene una partida contable no válida.");
                }
                if (linea.categoriaId() != null && !categoriaIds.contains(linea.categoriaId())
                        && categoriaRepository.findById(linea.categoriaId())
                                .map(categoria -> categoria.getUsuario() == null).orElse(false) == false) {
                    throw new IllegalArgumentException("El respaldo contiene una partida ligada a una categoría no disponible.");
                }
                BigDecimal signo = linea.lado().name().equals("DEBE") ? linea.monto() : linea.monto().negate();
                diferenciasPorMoneda.merge(linea.moneda(), signo, BigDecimal::add);
            }
            if (diferenciasPorMoneda.values().stream().anyMatch(diferencia -> diferencia.compareTo(BigDecimal.ZERO) != 0)) {
                throw new IllegalArgumentException("El respaldo contiene un asiento que no cuadra por moneda.");
            }
        }
    }

    private static <T> Set<Long> idsUnicos(List<T> elementos, Function<T, Long> idGetter, String nombre) {
        Set<Long> ids = new HashSet<>();
        for (T elemento : elementos) {
            Long id = elemento == null ? null : idGetter.apply(elemento);
            if (id == null || id <= 0 || !ids.add(id)) {
                throw new IllegalArgumentException("El respaldo contiene identificadores repetidos o no válidos en " + nombre + ".");
            }
        }
        return ids;
    }

    private static void validarNombresCuentas(List<CuentaResponse> cuentas) {
        Set<String> nombres = new HashSet<>();
        for (CuentaResponse cuenta : cuentas) {
            String nombreNormalizado = cuenta.nombre() == null ? "" : cuenta.nombre().trim().toLowerCase();
            if (!nombres.add(nombreNormalizado)) {
                throw new IllegalArgumentException("El respaldo contiene cuentas con nombres duplicados.");
            }
        }
    }

    private static void validarReferencia(Long id, Set<Long> ids, String campo) {
        if (id != null && !ids.contains(id)) {
            throw new IllegalArgumentException("El respaldo hace referencia a una " + campo + " que no existe dentro del archivo.");
        }
    }

    private void validarCategoriaReferencia(Long id, Set<Long> personalizadas, String nombre, TipoTransaccion tipo) {
        if (id != null && id <= 0) {
            throw new IllegalArgumentException("El respaldo contiene una categoría con identificador no válido.");
        }
        if (id == null || personalizadas.contains(id)) return;
        boolean globalEncontrada = (nombre != null && tipo != null
                && categoriaRepository.findFirstByUsuarioIsNullAndTipoAndNombreIgnoreCase(tipo, nombre).isPresent())
                || categoriaRepository.findById(id).map(categoria -> categoria.getUsuario() == null).orElse(false);
        if (!globalEncontrada) {
            throw new IllegalArgumentException("El respaldo hace referencia a una categoría que no está incluida ni disponible.");
        }
    }

    private Map<Long, Long> restaurarCuentas(Usuario usuario, List<CuentaResponse> respaldadas) {
        Map<Long, Long> mapa = new HashMap<>();
        for (CuentaResponse origen : respaldadas) {
            Cuenta guardada = cuentaRepository.save(Cuenta.builder()
                    .usuario(usuario)
                    .nombre(origen.nombre())
                    .tipo(origen.tipo())
                    .institucionFinanciera(origen.institucionFinanciera())
                    .cashbackPorcentaje(origen.cashbackPorcentaje())
                    .cashbackLimiteMensual(origen.cashbackLimiteMensual())
                    .limiteCredito(origen.limiteCredito())
                    .diaCorte(origen.diaCorte())
                    .diaPago(origen.diaPago())
                    .saldoActual(origen.saldoActual())
                    .moneda(origen.moneda())
                    .descripcion(origen.descripcion())
                    .activo(origen.activo())
                    .build());
            mapa.put(origen.id(), guardada.getId());
        }
        return mapa;
    }

    private Map<Long, Long> restaurarCategorias(Usuario usuario, List<CategoriaResponse> respaldadas) {
        Map<Long, Long> mapa = new HashMap<>();
        for (CategoriaResponse origen : respaldadas) {
            Categoria guardada = categoriaRepository.save(Categoria.builder()
                    .usuario(usuario)
                    .nombre(origen.nombre())
                    .tipo(origen.tipo())
                    .icono(origen.icono())
                    .color(origen.color())
                    .activo(origen.activo())
                    .build());
            mapa.put(origen.id(), guardada.getId());
        }
        return mapa;
    }

    private Map<Long, Long> restaurarTransacciones(
            Usuario usuario, List<TransaccionResponse> respaldadas,
            Map<Long, Long> cuentas, Map<Long, Long> categorias
    ) {
        Map<Long, Long> mapa = new HashMap<>();
        for (TransaccionResponse origen : respaldadas) {
            Cuenta cuenta = buscarCuenta(origen.cuentaId(), cuentas);
            Cuenta destino = buscarCuenta(origen.cuentaDestinoId(), cuentas);
            Categoria categoria = buscarCategoria(origen.categoriaId(), origen.categoriaNombre(), origen.tipo(), categorias);
            Transaccion guardada = transaccionRepository.save(Transaccion.builder()
                    .usuario(usuario)
                    .cuenta(cuenta)
                    .cuentaDestino(destino)
                    .cuentaNombreHistorico(cuenta == null ? origen.cuentaNombre() : null)
                    .cuentaMonedaHistorica(cuenta == null ? origen.moneda() : null)
                    .cuentaDestinoNombreHistorico(destino == null ? origen.cuentaDestinoNombre() : null)
                    .cuentaDestinoMonedaHistorica(destino == null ? origen.monedaDestino() : null)
                    .categoria(categoria)
                    .tipo(origen.tipo())
                    .monto(origen.monto())
                    .montoDestino(origen.montoDestino())
                    .tasaCambio(origen.tasaCambio())
                    .fecha(origen.fecha())
                    .descripcion(origen.descripcion())
                    .notas(origen.notas())
                    .build());
            mapa.put(origen.id(), guardada.getId());
        }
        return mapa;
    }

    private void restaurarCashback(List<RespaldoFinancieroResponse.CashbackRespaldo> relaciones, Map<Long, Long> transacciones) {
        if (relaciones == null) return;
        for (var relacion : relaciones) {
            Transaccion movimiento = transaccionRepository.findById(transacciones.get(relacion.transaccionId())).orElseThrow();
            Transaccion origen = transaccionRepository.findById(transacciones.get(relacion.origenId())).orElseThrow();
            movimiento.setCashbackOrigen(origen);
            transaccionRepository.save(movimiento);
        }
    }

    private void restaurarPresupuestos(Usuario usuario, List<RespaldoFinancieroResponse.PresupuestoRespaldo> respaldados,
                                       Map<Long, Long> categorias) {
        for (var origen : respaldados) {
            Categoria categoria = categoriaRepository.findById(resolverCategoriaId(origen.categoriaId(), categorias))
                    .orElseThrow(() -> new IllegalArgumentException("No se pudo encontrar una categoría del presupuesto."));
            presupuestoRepository.save(Presupuesto.builder()
                    .usuario(usuario).categoria(categoria).montoLimite(origen.montoLimite())
                    .moneda(origen.moneda()).mes(origen.mes()).anio(origen.anio()).build());
        }
    }

    private void restaurarRecurrencias(Usuario usuario, List<PlantillaRecurrenteResponse> respaldadas,
                                       Map<Long, Long> cuentas, Map<Long, Long> categorias) {
        for (PlantillaRecurrenteResponse origen : respaldadas) {
            Cuenta cuenta = cuentaRepository.findById(cuentas.get(origen.cuentaId())).orElseThrow();
            Categoria categoria = origen.categoriaId() == null ? null
                    : categoriaRepository.findById(resolverCategoriaId(origen.categoriaId(), categorias)).orElse(null);
            plantillaRepository.save(PlantillaRecurrente.builder()
                    .usuario(usuario).cuenta(cuenta).categoria(categoria).tipo(origen.tipo())
                    .monto(origen.monto()).notas(origen.notas()).frecuencia(origen.frecuencia())
                    .siguienteFecha(origen.siguienteFecha()).activa(origen.activa()).build());
        }
    }

    private void restaurarHistorial(Usuario usuario, List<AuditoriaTransaccionResponse> eventos,
                                    Map<Long, Long> transacciones, Map<Long, Long> cuentas,
                                    Map<Long, Long> categorias) {
        for (AuditoriaTransaccionResponse origen : eventos) {
            AuditoriaTransaccion guardado = auditoriaRepository.save(AuditoriaTransaccion.builder()
                    .usuario(usuario)
                    .transaccionId(resolverIdHistorico(origen.transaccionId(), transacciones))
                    .accion(origen.accion())
                    .antesJson(serializar(mapearSnapshot(origen.antes(), transacciones, cuentas, categorias)))
                    .despuesJson(serializar(mapearSnapshot(origen.despues(), transacciones, cuentas, categorias)))
                    .fechaEvento(origen.fechaEvento())
                    .build());
            auditoriaRepository.restaurarFechaEvento(guardado.getId(), origen.fechaEvento());
        }
    }

    private void restaurarLibroDiario(Usuario usuario, List<AsientoContableResponse> asientos,
                                      Map<Long, Long> transacciones, Map<Long, Long> cuentas,
                                      Map<Long, Long> categorias) {
        for (AsientoContableResponse origen : asientos) {
            AsientoContable asiento = AsientoContable.builder()
                    .usuario(usuario)
                    .transaccionOrigenId(resolverIdHistorico(origen.transaccionOrigenId(), transacciones))
                    .tipoEvento(origen.tipoEvento()).tipoMovimiento(origen.tipoMovimiento())
                    .fechaOperacion(origen.fechaOperacion()).descripcion(origen.descripcion())
                    .tasaCambio(origen.tasaCambio()).build();
            for (var linea : origen.lineas()) {
                asiento.agregarLinea(LineaAsiento.builder()
                        .codigoCuenta(linea.codigoCuenta()).nombreCuenta(linea.nombreCuenta())
                        .monto(linea.monto()).moneda(linea.moneda()).lado(linea.lado())
                        .cuentaFinancieraId(resolverIdHistorico(linea.cuentaFinancieraId(), cuentas))
                        .categoriaId(resolverCategoriaHistorica(linea.categoriaId(), categorias))
                        .build());
            }
            AsientoContable guardado = asientoRepository.save(asiento);
            if (origen.fechaCreacion() != null) {
                asientoRepository.restaurarFechaCreacion(guardado.getId(), origen.fechaCreacion());
            }
        }
    }

    private TransaccionResponse mapearSnapshot(TransaccionResponse origen, Map<Long, Long> transacciones,
                                              Map<Long, Long> cuentas, Map<Long, Long> categorias) {
        if (origen == null) return null;
        return new TransaccionResponse(
                resolverIdHistorico(origen.id(), transacciones),
                resolverIdHistorico(origen.cuentaId(), cuentas), origen.cuentaNombre(),
                resolverIdHistorico(origen.cuentaDestinoId(), cuentas), origen.cuentaDestinoNombre(),
                resolverCategoriaHistorica(origen.categoriaId(), categorias), origen.categoriaNombre(),
                origen.categoriaIcono(), origen.categoriaColor(), origen.tipo(), origen.monto(),
                origen.montoDestino(), origen.tasaCambio(), origen.moneda(), origen.monedaDestino(),
                origen.fecha(), origen.descripcion(), origen.notas(), origen.cashbackAutomatico(), origen.fechaCreacion()
        );
    }

    private Categoria buscarCategoria(Long id, String nombre, TipoTransaccion tipo, Map<Long, Long> categorias) {
        if (id == null) return null;
        Long nuevaId = categorias.get(id);
        if (nuevaId != null) return categoriaRepository.findById(nuevaId).orElse(null);
        return categoriaRepository.findFirstByUsuarioIsNullAndTipoAndNombreIgnoreCase(tipo, nombre).orElse(null);
    }

    private Cuenta buscarCuenta(Long id, Map<Long, Long> cuentas) {
        if (id == null) return null;
        Long nuevaId = cuentas.get(id);
        if (nuevaId == null) {
            throw new IllegalArgumentException("No se pudo mapear una cuenta incluida en el respaldo.");
        }
        return cuentaRepository.findById(nuevaId).orElseThrow();
    }

    private Long resolverCategoriaId(Long id, Map<Long, Long> categorias) {
        Long nueva = categorias.get(id);
        if (nueva != null) return nueva;
        return categoriaRepository.findById(id).filter(categoria -> categoria.getUsuario() == null)
                .map(Categoria::getId)
                .orElseThrow(() -> new IllegalArgumentException("No se pudo mapear una categoría incluida en el respaldo."));
    }

    private static Long resolverIdHistorico(Long original, Map<Long, Long> mapa) {
        if (original == null) return null;
        return mapa.getOrDefault(original, -original);
    }

    private static Long resolverCategoriaHistorica(Long original, Map<Long, Long> categorias) {
        if (original == null) return null;
        return categorias.getOrDefault(original, original);
    }

    private String serializar(TransaccionResponse movimiento) {
        if (movimiento == null) return null;
        try {
            return objectMapper.writeValueAsString(movimiento);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("No se pudo restaurar un evento del historial.", exception);
        }
    }

    private record CategoriaInicial(TipoTransaccion tipo, String icono, String color) {}
}
