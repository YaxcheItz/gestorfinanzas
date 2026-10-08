package com.gestionfinanzas.controller;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HealthControllerTest {
    @Test void readinessRequiereConexionValidaYLaCierra() throws Exception {
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(source.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true);
        assertEquals(200, new HealthController(source).healthCheck().getStatusCode().value());
        verify(connection).close();
        when(connection.isValid(2)).thenReturn(false);
        assertEquals(503, new HealthController(source).healthCheck().getStatusCode().value());
    }

    @Test void falloDeBaseNoPublicaCredencialesNiDiceUP() throws Exception {
        DataSource source = mock(DataSource.class);
        when(source.getConnection()).thenThrow(new SQLException("password=secreto-sintetico"));
        var response = new HealthController(source).healthCheck();
        assertEquals(503, response.getStatusCode().value());
        assertEquals("DOWN", response.getBody().get("status"));
        assertFalse(response.getBody().toString().contains("secreto"));
    }
}
