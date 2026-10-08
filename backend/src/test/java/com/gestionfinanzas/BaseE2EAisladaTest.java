package com.gestionfinanzas;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BaseE2EAisladaTest {
    @Test void aceptaSoloBasesDePruebasAisladas() {
        assertDoesNotThrow(() -> BackendApplication.validarBaseE2E("jdbc:h2:mem:e2e"));
        assertDoesNotThrow(() -> BackendApplication.validarBaseE2E("jdbc:postgresql://127.0.0.1:15432/kaptal_stage6_e2e"));
        for (String url : new String[]{"jdbc:h2:file:./real", "jdbc:postgresql://db.example:5432/kaptal_stage6_e2e",
                "jdbc:postgresql://127.0.0.1:5432/produccion", "jdbc:postgresql://127.0.0.1:5432/kaptal_stage6_e2e?other=true"}) {
            assertThrows(IllegalStateException.class, () -> BackendApplication.validarBaseE2E(url));
        }
        assertThrows(IllegalStateException.class, () -> BackendApplication.validarBaseE2E(null));
    }
}
