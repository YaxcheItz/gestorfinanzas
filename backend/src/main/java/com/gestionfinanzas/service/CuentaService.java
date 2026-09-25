package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.model.entity.Cuenta;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CuentaService {

    private final CuentaRepository cuentaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<CuentaResponse> listarCuentas(Long usuarioId) {
        return cuentaRepository.findByUsuarioIdAndActivoTrue(usuarioId)
                .stream()
                .map(CuentaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public CuentaResponse obtenerCuenta(Long usuarioId, Long cuentaId) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));
        return CuentaResponse.fromEntity(cuenta);
    }

    @Transactional
    public CuentaResponse crearCuenta(Long usuarioId, CuentaRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        String nombreTrim = request.nombre().trim();
        if (cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(usuarioId, nombreTrim)) {
            throw new IllegalArgumentException("Ya existe una cuenta con el nombre '" + nombreTrim + "'");
        }

        BigDecimal saldoInicial = request.saldoInicial() != null ? request.saldoInicial() : BigDecimal.ZERO;
        String moneda = (request.moneda() != null && !request.moneda().isBlank()) 
                ? request.moneda().trim().toUpperCase() 
                : "MXN";

        Cuenta cuenta = Cuenta.builder()
                .usuario(usuario)
                .nombre(nombreTrim)
                .tipo(request.tipo())
                .saldoActual(saldoInicial)
                .moneda(moneda)
                .descripcion(request.descripcion() != null ? request.descripcion().trim() : null)
                .activo(true)
                .build();

        Cuenta guardada = cuentaRepository.save(cuenta);
        return CuentaResponse.fromEntity(guardada);
    }

    @Transactional
    public CuentaResponse actualizarCuenta(Long usuarioId, Long cuentaId, CuentaRequest request) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));

        String nombreTrim = request.nombre().trim();
        if (!cuenta.getNombre().equalsIgnoreCase(nombreTrim) 
                && cuentaRepository.existsByUsuarioIdAndNombreIgnoreCase(usuarioId, nombreTrim)) {
            throw new IllegalArgumentException("Ya existe otra cuenta con el nombre '" + nombreTrim + "'");
        }

        cuenta.setNombre(nombreTrim);
        cuenta.setTipo(request.tipo());
        if (request.moneda() != null && !request.moneda().isBlank()) {
            cuenta.setMoneda(request.moneda().trim().toUpperCase());
        }
        cuenta.setDescripcion(request.descripcion() != null ? request.descripcion().trim() : null);

        Cuenta actualizada = cuentaRepository.save(cuenta);
        return CuentaResponse.fromEntity(actualizada);
    }

    @Transactional
    public void desactivarCuenta(Long usuarioId, Long cuentaId) {
        Cuenta cuenta = cuentaRepository.findByIdAndUsuarioId(cuentaId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada o no autorizada"));

        cuenta.setActivo(false);
        cuentaRepository.save(cuenta);
    }

    @Transactional
    public Cuenta crearCuentaPredeterminada(Usuario usuario) {
        Cuenta cuentaInicial = Cuenta.builder()
                .usuario(usuario)
                .nombre("Billetera / Efectivo")
                .tipo(TipoCuenta.EFECTIVO)
                .saldoActual(BigDecimal.ZERO)
                .moneda("MXN")
                .descripcion("Cuenta predeterminada de efectivo")
                .activo(true)
                .build();

        return cuentaRepository.save(cuentaInicial);
    }
}
