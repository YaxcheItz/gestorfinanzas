package com.gestionfinanzas.controller;

import com.gestionfinanzas.dto.request.TransaccionFiltroRequest;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.security.CustomUserDetails;
import com.gestionfinanzas.service.TransaccionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transacciones")
@RequiredArgsConstructor
public class TransaccionController {

    private final TransaccionService transaccionService;

    @PostMapping
    public ResponseEntity<ApiResponse<TransaccionResponse>> crearTransaccion(
            @Valid @RequestBody TransaccionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        TransaccionResponse transaccion = transaccionService.crearTransaccion(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Movimiento registrado exitosamente", transaccion));
    }

    @GetMapping("/recientes")
    public ResponseEntity<ApiResponse<List<TransaccionResponse>>> listarRecientes(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<TransaccionResponse> recientes = transaccionService.listarRecientes(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok("Movimientos recientes obtenidos correctamente", recientes));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<TransaccionResponse>>> listarPaginadas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TipoTransaccion tipo,
            @RequestParam(required = false) Long cuentaId,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(required = false) String busqueda,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "fecha", "id"));
        TransaccionFiltroRequest filtro = new TransaccionFiltroRequest(tipo, cuentaId, categoriaId, fechaInicio, fechaFin, busqueda);
        Page<TransaccionResponse> resultado = transaccionService.listarConFiltros(userDetails.getId(), filtro, pageRequest);
        return ResponseEntity.ok(ApiResponse.ok("Transacciones obtenidas correctamente", resultado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TransaccionResponse>> obtenerPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        TransaccionResponse transaccion = transaccionService.obtenerPorId(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Transacción obtenida correctamente", transaccion));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> eliminarTransaccion(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        transaccionService.eliminarTransaccion(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Transacción eliminada y saldos recalculados correctamente", null));
    }
}
