package com.gestionfinanzas.service;

import com.gestionfinanzas.repository.TransaccionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

@Service
@RequiredArgsConstructor
@Slf4j
public class CuotasMsiAlCorte {
    private final TransaccionRepository repository;
    private final TransaccionService movimientos;

    @Scheduled(fixedDelayString="${app.msi.corte-intervalo-ms:60000}", initialDelayString="${app.msi.corte-inicio-ms:5000}")
    public void aplicarVencidas() {
        var hoy=CalendarioFinanciero.hoy();
        for(var ids:repository.cuotasPendientesAlCorte(hoy)) {
            try { movimientos.aplicarCuotaAlCorte((Long)ids[1],(Long)ids[0],hoy); }
            catch(RuntimeException error) { log.warn("No se pudo aplicar una cuota MSI pendiente; se reintentara."); }
        }
    }
}
