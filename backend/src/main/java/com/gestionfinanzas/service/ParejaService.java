package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.AportacionParejaRequest;
import com.gestionfinanzas.dto.request.GastoParejaRequest;
import com.gestionfinanzas.dto.request.PagoParejaRequest;
import com.gestionfinanzas.dto.request.ParejaCrearRequest;
import com.gestionfinanzas.dto.response.ParejaResponse;
import com.gestionfinanzas.model.entity.AportacionPareja;
import com.gestionfinanzas.model.entity.GastoPareja;
import com.gestionfinanzas.model.entity.PagoPareja;
import com.gestionfinanzas.model.entity.Pareja;
import com.gestionfinanzas.model.entity.RepartoGasto;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoReparto;
import com.gestionfinanzas.repository.AportacionParejaRepository;
import com.gestionfinanzas.repository.GastoParejaRepository;
import com.gestionfinanzas.repository.PagoParejaRepository;
import com.gestionfinanzas.repository.ParejaRepository;
import com.gestionfinanzas.repository.RepartoGastoRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Gastos compartidos entre dos personas.
 *
 * El fondo común es virtual: nadie deposita nada en una cuenta. Lo que se
 * guarda es quién puso cuánto y qué se gastó, para poder responder quién le
 * debe qué a quién. Por eso aquí no se toca ninguna cuenta real ni ningún saldo
 * del usuario: un movimiento de pareja no mueve dinero de su billetera.
 *
 * Son dos personas por diseño, así que un solo dato del request alcanza para el
 * reparto y la otra parte se deduce restando. Esa forma de armarlo es lo que
 * garantiza que las dos partes sumen exacto el total, sin validarlo aparte y sin
 * que un redondeo deje el gasto descuadrado.
 */
@Service
@RequiredArgsConstructor
public class ParejaService {

    private static final int ESCALA = 2;
    private static final BigDecimal CIEN = new BigDecimal("100");

    private final ParejaRepository parejaRepository;
    private final AportacionParejaRepository aporteRepository;
    private final GastoParejaRepository gastoRepository;
    private final RepartoGastoRepository repartoRepository;
    private final PagoParejaRepository pagoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public ParejaResponse crear(Long usuarioId, ParejaCrearRequest request) {
        Usuario yo = buscarUsuario(usuarioId);

        if (parejaRepository.contarActivasDeUsuario(usuarioId) > 0) {
            throw new IllegalArgumentException(
                    "Ya tienes una pareja activa. Desvincúlala antes de agregar a otra persona.");
        }

        String correo = request.email().trim();
        Usuario otro = usuarioRepository.findByEmailIgnoreCase(correo)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No encontramos ninguna cuenta con el correo " + correo + ". Para compartir gastos, "
                                + "la otra persona necesita registrarse en Kaptal primero."));

        if (otro.getId().equals(usuarioId)) {
            throw new IllegalArgumentException("No puedes vincularte a ti mismo como pareja.");
        }
        if (!otro.isActivo()) {
            throw new IllegalArgumentException("Esa cuenta está desactivada y no se puede vincular.");
        }
        if (parejaRepository.contarActivasDeUsuario(otro.getId()) > 0) {
            throw new IllegalArgumentException("Esa persona ya tiene una pareja activa.");
        }

        Pareja pareja = parejaRepository.save(Pareja.builder()
                .usuarioA(yo)
                .usuarioB(otro)
                .moneda(yo.getMonedaPreferida() == null ? "MXN" : yo.getMonedaPreferida())
                .activa(true)
                .build());

        return construirEstado(pareja, yo);
    }

    @Transactional(readOnly = true)
    public ParejaResponse obtener(Long usuarioId) {
        Pareja pareja = buscarParejaDe(usuarioId);
        if (pareja == null) return null;
        return construirEstado(pareja, buscarUsuario(usuarioId));
    }

    @Transactional
    public ParejaResponse agregarAporte(Long usuarioId, AportacionParejaRequest request) {
        Pareja pareja = exigirPareja(usuarioId);
        Usuario yo = buscarUsuario(usuarioId);

        aporteRepository.save(AportacionPareja.builder()
                .pareja(pareja)
                .usuario(yo)
                .monto(request.monto())
                .moneda(pareja.getMoneda())
                .fecha(request.fecha())
                .notas(normalizar(request.notas()))
                .build());

        return construirEstado(pareja, yo);
    }

    @Transactional
    public ParejaResponse eliminarAporte(Long usuarioId, Long aporteId) {
        Pareja pareja = exigirPareja(usuarioId);
        AportacionPareja aporte = aporteRepository.findByIdAndParejaId(aporteId, pareja.getId())
                .orElseThrow(() -> new IllegalArgumentException("El aporte no existe o no te pertenece."));
        aporteRepository.delete(aporte);
        return construirEstado(pareja, buscarUsuario(usuarioId));
    }

    @Transactional
    public ParejaResponse agregarGasto(Long usuarioId, GastoParejaRequest request) {
        Pareja pareja = exigirPareja(usuarioId);
        Usuario yo = buscarUsuario(usuarioId);
        Usuario otro = laOtra(pareja, yo);

        // @Digits ya impide que entren más de dos decimales, así que este
        // redondeo no debería tener nada que resolver. Se deja HALF_UP y no
        // UNNECESSARY para que, si el servicio llega a invocarse por dentro, un
        // decimal de más no reviente con una ArithmeticException sin manejar.
        BigDecimal total = request.monto().setScale(ESCALA, RoundingMode.HALF_UP);
        BigDecimal partePareja = calcularParteDeLaPareja(request, total);
        BigDecimal partePropia = total.subtract(partePareja);

        GastoPareja gasto = gastoRepository.save(GastoPareja.builder()
                .pareja(pareja)
                .pagadoPor(yo)
                .monto(total)
                .moneda(pareja.getMoneda())
                .fecha(request.fecha())
                .descripcion(request.descripcion().trim())
                .build());

        // La parte de quien registra sale por resta, así que las dos filas suman
        // el total exacto sin importar cómo se redondeó la parte de la pareja.
        guardarReparto(gasto, yo, partePropia, request.tipoReparto(), porcentajeDe(total, partePropia));
        guardarReparto(gasto, otro, partePareja, request.tipoReparto(), porcentajeDe(total, partePareja));

        return construirEstado(pareja, yo);
    }

    @Transactional
    public ParejaResponse eliminarGasto(Long usuarioId, Long gastoId) {
        Pareja pareja = exigirPareja(usuarioId);
        GastoPareja gasto = gastoRepository.findByIdAndParejaId(gastoId, pareja.getId())
                .orElseThrow(() -> new IllegalArgumentException("El gasto no existe o no te pertenece."));
        // Los repartos salen primero: apuntan al gasto con llave foránea.
        repartoRepository.deleteByGastoId(gasto.getId());
        gastoRepository.delete(gasto);
        return construirEstado(pareja, buscarUsuario(usuarioId));
    }

    @Transactional
    public ParejaResponse registrarPago(Long usuarioId, PagoParejaRequest request) {
        Pareja pareja = exigirPareja(usuarioId);
        Usuario yo = buscarUsuario(usuarioId);

        Usuario pagador = resolverMiembro(pareja, request.pagadorId(), "quien paga");
        Usuario beneficiario = resolverMiembro(pareja, request.beneficiarioId(), "quien recibe");

        if (pagador.getId().equals(beneficiario.getId())) {
            throw new IllegalArgumentException("El pago no puede hacerse a ti mismo.");
        }

        pagoRepository.save(PagoPareja.builder()
                .pareja(pareja)
                .pagador(pagador)
                .beneficiario(beneficiario)
                .monto(request.monto())
                .moneda(pareja.getMoneda())
                .fecha(request.fecha())
                .notas(normalizar(request.notas()))
                .build());

        return construirEstado(pareja, yo);
    }

    @Transactional
    public ParejaResponse eliminarPago(Long usuarioId, Long pagoId) {
        Pareja pareja = exigirPareja(usuarioId);
        PagoPareja pago = pagoRepository.findByIdAndParejaId(pagoId, pareja.getId())
                .orElseThrow(() -> new IllegalArgumentException("El pago no existe o no te pertenece."));
        pagoRepository.delete(pago);
        return construirEstado(pareja, buscarUsuario(usuarioId));
    }

    @Transactional
    public void desvincular(Long usuarioId, Long parejaId) {
        Pareja pareja = parejaRepository.findByIdAndActivaTrue(parejaId)
                .orElseThrow(() -> new IllegalArgumentException("La pareja no existe o ya no está activa."));
        if (!pertenece(pareja, usuarioId)) {
            throw new IllegalArgumentException("La pareja no existe o no te pertenece.");
        }
        // Se desactiva en vez de borrarse: el historial de aportes y gastos de los
        // dos deja de tener sentido si desaparece, y volver a vincular más adelante
        // debe poder retomar lo que había.
        pareja.setActiva(false);
        parejaRepository.save(pareja);
    }

    // ---------------------------------------------------------------- reparto

    /**
     * La parte que le toca a la pareja, ya redondeada a centavos.
     *
     * @throws IllegalArgumentException si el reparto deja a alguna de las dos
     *                                  personas con parte cero o negativa. Un
     *                                  importe así dejaría un gasto sin cargo
     *                                  para alguien.
     */
    private BigDecimal calcularParteDeLaPareja(GastoParejaRequest request, BigDecimal total) {
        return switch (request.tipoReparto()) {
            case IGUAL -> total.divide(BigDecimal.valueOf(2), ESCALA, RoundingMode.HALF_UP);
            case PORCENTAJE -> {
                BigDecimal porcentaje = request.porcentajePareja();
                if (porcentaje == null) {
                    throw new IllegalArgumentException("Indica qué porcentaje le toca a tu pareja.");
                }
                if (porcentaje.compareTo(BigDecimal.ZERO) <= 0 || porcentaje.compareTo(CIEN) >= 0) {
                    throw new IllegalArgumentException("El porcentaje de tu pareja debe estar entre 0 y 100, "
                            + "para que las dos partes queden positivas.");
                }
                yield total.multiply(porcentaje).divide(CIEN, ESCALA, RoundingMode.HALF_UP);
            }
            case EXACTO -> {
                BigDecimal exacto = request.montoExactoPareja();
                if (exacto == null) {
                    throw new IllegalArgumentException("Indica cuánto le toca exactamente a tu pareja.");
                }
                if (exacto.compareTo(BigDecimal.ZERO) <= 0 || exacto.compareTo(total) >= 0) {
                    throw new IllegalArgumentException("El monto exacto de tu pareja debe estar entre 0 y el total "
                            + "del gasto, para que las dos partes queden positivas.");
                }
                yield exacto.setScale(ESCALA, RoundingMode.HALF_UP);
            }
        };
    }

    private void guardarReparto(GastoPareja gasto, Usuario usuario, BigDecimal monto,
                                TipoReparto tipo, BigDecimal porcentaje) {
        repartoRepository.save(RepartoGasto.builder()
                .gasto(gasto)
                .usuario(usuario)
                .monto(monto)
                .tipo(tipo)
                .porcentaje(porcentaje)
                .build());
    }

    private static BigDecimal porcentajeDe(BigDecimal total, BigDecimal parte) {
        if (total.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return parte.multiply(CIEN).divide(total, ESCALA, RoundingMode.HALF_UP);
    }

    /**
     * La regla con la que se registró el gasto. Vive en los repartos y no en el
     * gasto, y las dos filas siempre se guardan con la misma, así que basta con
     * la primera. Se lee de la lista ya cargada para no consultar dos veces.
     */
    static TipoReparto tipoRepartoDe(List<RepartoGasto> repartos) {
        return repartos.stream().findFirst().map(RepartoGasto::getTipo).orElse(null);
    }

    // ---------------------------------------------------------------- estado

    /**
     * Arma la respuesta completa.
     *
     * Todos los totales se calculan en memoria sobre las mismas listas que se
     * devuelven, para que la cifra que ve el usuario siempre cuadre con los
     * movimientos que tiene enumerados arriba. Consultar los totales por aparte y
     * luego armar las listas dejaría la puerta abierta a que mostraran números de
     * distintas consultas y no significaran nada entre sí.
     */
    private ParejaResponse construirEstado(Pareja pareja, Usuario yo) {
        Usuario otro = laOtra(pareja, yo);
        Long yoId = yo.getId();
        Long otroId = otro.getId();

        List<AportacionPareja> aportes = aporteRepository.findByParejaIdOrderByFechaDescIdDesc(pareja.getId());
        List<GastoPareja> gastos = gastoRepository.findByParejaIdOrderByFechaDescIdDesc(pareja.getId());
        List<PagoPareja> pagos = pagoRepository.findByParejaIdOrderByFechaDescIdDesc(pareja.getId());

        BigDecimal aportadoYo = BigDecimal.ZERO;
        BigDecimal aportadoOtro = BigDecimal.ZERO;
        for (AportacionPareja aporte : aportes) {
            if (aporte.getUsuario().getId().equals(yoId)) {
                aportadoYo = aportadoYo.add(aporte.getMonto());
            } else if (aporte.getUsuario().getId().equals(otroId)) {
                aportadoOtro = aportadoOtro.add(aporte.getMonto());
            }
        }

        BigDecimal consumidoYo = BigDecimal.ZERO;
        BigDecimal consumidoOtro = BigDecimal.ZERO;
        BigDecimal totalGastado = BigDecimal.ZERO;
        List<ParejaResponse.Gasto> gastosResponse = new ArrayList<>(gastos.size());
        for (GastoPareja gasto : gastos) {
            List<RepartoGasto> repartos = repartoRepository.findByGastoIdOrderByIdAsc(gasto.getId());
            BigDecimal miParte = BigDecimal.ZERO;
            List<ParejaResponse.Parte> partes = new ArrayList<>(repartos.size());
            for (RepartoGasto reparto : repartos) {
                if (reparto.getUsuario().getId().equals(yoId)) {
                    consumidoYo = consumidoYo.add(reparto.getMonto());
                    miParte = reparto.getMonto();
                } else if (reparto.getUsuario().getId().equals(otroId)) {
                    consumidoOtro = consumidoOtro.add(reparto.getMonto());
                }
                partes.add(new ParejaResponse.Parte(
                        reparto.getUsuario().getId(),
                        reparto.getUsuario().getNombre(),
                        reparto.getMonto(),
                        porcentajeDe(gasto.getMonto(), reparto.getMonto())
                ));
            }
            totalGastado = totalGastado.add(gasto.getMonto());
            gastosResponse.add(new ParejaResponse.Gasto(
                    gasto.getId(),
                    gasto.getPagadoPor().getId(),
                    gasto.getPagadoPor().getNombre(),
                    gasto.getMonto(),
                    gasto.getMoneda(),
                    gasto.getFecha(),
                    gasto.getDescripcion(),
                    tipoRepartoDe(repartos),
                    partes,
                    miParte,
                    gasto.getFechaCreacion()
            ));
        }

        BigDecimal pagadoYo = BigDecimal.ZERO;
        BigDecimal pagadoOtro = BigDecimal.ZERO;
        BigDecimal cobradoYo = BigDecimal.ZERO;
        BigDecimal cobradoOtro = BigDecimal.ZERO;
        for (PagoPareja pago : pagos) {
            if (pago.getPagador().getId().equals(yoId)) {
                pagadoYo = pagadoYo.add(pago.getMonto());
            } else if (pago.getPagador().getId().equals(otroId)) {
                pagadoOtro = pagadoOtro.add(pago.getMonto());
            }
            if (pago.getBeneficiario().getId().equals(yoId)) {
                cobradoYo = cobradoYo.add(pago.getMonto());
            } else if (pago.getBeneficiario().getId().equals(otroId)) {
                cobradoOtro = cobradoOtro.add(pago.getMonto());
            }
        }

        // Saldo = lo que puso, más lo que pagó, menos lo que le pagaron, menos
        // lo que consumió. Los pagos se cancelan entre los dos porque son un
        // traspaso interno, no dinero que entre o salga del fondo. Por eso la suma
        // de los dos saldos es exactamente lo que queda en el fondo común, que
        // es la propiedad que sostiene toda la aritmética de la pantalla.
        BigDecimal saldoYo = aportadoYo.add(pagadoYo).subtract(cobradoYo).subtract(consumidoYo);
        BigDecimal saldoOtro = aportadoOtro.add(pagadoOtro).subtract(cobradoOtro).subtract(consumidoOtro);

        BigDecimal totalAportado = aportadoYo.add(aportadoOtro);
        BigDecimal fondoDisponible = totalAportado.subtract(totalGastado);

        return new ParejaResponse(
                pareja.getId(),
                pareja.getMoneda(),
                pareja.getFechaCreacion(),
                new ParejaResponse.Miembro(yoId, yo.getNombre(), yo.getEmail(),
                        aportadoYo, consumidoYo, pagadoYo, cobradoYo, saldoYo),
                new ParejaResponse.Miembro(otroId, otro.getNombre(), otro.getEmail(),
                        aportadoOtro, consumidoOtro, pagadoOtro, cobradoOtro, saldoOtro),
                construirResumen(totalAportado, totalGastado, fondoDisponible,
                        aportes.size(), gastos.size(), pagos.size(),
                        yoId, otroId, saldoYo, saldoOtro),
                aportes.stream()
                        .map(aporte -> new ParejaResponse.Aporte(
                                aporte.getId(), aporte.getUsuario().getId(), aporte.getUsuario().getNombre(),
                                aporte.getMonto(), aporte.getMoneda(), aporte.getFecha(),
                                aporte.getNotas(), aporte.getFechaCreacion()))
                        .toList(),
                gastosResponse,
                pagos.stream()
                        .map(pago -> new ParejaResponse.Pago(
                                pago.getId(), pago.getPagador().getId(), pago.getPagador().getNombre(),
                                pago.getBeneficiario().getId(), pago.getBeneficiario().getNombre(),
                                pago.getMonto(), pago.getMoneda(), pago.getFecha(),
                                pago.getNotas(), pago.getFechaCreacion()))
                        .toList()
        );
    }

    private static ParejaResponse.Resumen construirResumen(
            BigDecimal totalAportado, BigDecimal totalGastado, BigDecimal fondoDisponible,
            int aportes, int gastos, int pagos,
            Long yoId, Long otroId, BigDecimal saldoYo, BigDecimal saldoOtro) {

        // Con el fondo en rojo no le estamos pidiendo a nadie que pague nada: los
        // dos gastaron más de lo que pusieron y no hay a quién reclamarle. Sin
        // este caso la app le informaría a uno de los dos que le debe a su
        // pareja, cuando en realidad no hay dinero en ninguna parte.
        Long idQuienDebe = null;
        BigDecimal montoDeuda = BigDecimal.ZERO.setScale(ESCALA, RoundingMode.HALF_UP);
        if (fondoDisponible.compareTo(BigDecimal.ZERO) >= 0) {
            if (saldoYo.compareTo(BigDecimal.ZERO) < 0) {
                idQuienDebe = yoId;
                montoDeuda = saldoYo.negate();
            } else if (saldoOtro.compareTo(BigDecimal.ZERO) < 0) {
                idQuienDebe = otroId;
                montoDeuda = saldoOtro.negate();
            }
        }

        return new ParejaResponse.Resumen(
                fondoDisponible.setScale(ESCALA, RoundingMode.HALF_UP),
                totalAportado.setScale(ESCALA, RoundingMode.HALF_UP),
                totalGastado.setScale(ESCALA, RoundingMode.HALF_UP),
                (long) aportes,
                (long) gastos,
                (long) pagos,
                idQuienDebe,
                montoDeuda
        );
    }

    // --------------------------------------------------------------- helpers

    private Pareja buscarParejaDe(Long usuarioId) {
        return parejaRepository.findActivaDeUsuario(usuarioId).stream().findFirst().orElse(null);
    }

    private Pareja exigirPareja(Long usuarioId) {
        Pareja pareja = buscarParejaDe(usuarioId);
        if (pareja == null) {
            throw new IllegalArgumentException("Todavía no tienes una pareja vinculada.");
        }
        return pareja;
    }

    private Usuario buscarUsuario(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró tu cuenta de usuario."));
    }

    private static boolean pertenece(Pareja pareja, Long usuarioId) {
        return pareja.getUsuarioA().getId().equals(usuarioId) || pareja.getUsuarioB().getId().equals(usuarioId);
    }

    private static Usuario laOtra(Pareja pareja, Usuario usuario) {
        return usuario.getId().equals(pareja.getUsuarioA().getId()) ? pareja.getUsuarioB() : pareja.getUsuarioA();
    }

    private static Usuario resolverMiembro(Pareja pareja, Long usuarioId, String rol) {
        if (usuarioId == null) {
            throw new IllegalArgumentException("Debes indicar " + rol + ".");
        }
        if (usuarioId.equals(pareja.getUsuarioA().getId())) return pareja.getUsuarioA();
        if (usuarioId.equals(pareja.getUsuarioB().getId())) return pareja.getUsuarioB();
        throw new IllegalArgumentException("El usuario indicado como " + rol + " no pertenece a esta pareja.");
    }

    private static String normalizar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
