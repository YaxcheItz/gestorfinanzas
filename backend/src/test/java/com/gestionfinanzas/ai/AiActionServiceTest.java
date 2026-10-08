package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.PresupuestoResumenResponse;
import com.gestionfinanzas.service.CategoriaService;
import com.gestionfinanzas.service.CuentaService;
import com.gestionfinanzas.service.PlantillaRecurrenteService;
import com.gestionfinanzas.service.PresupuestoService;
import com.gestionfinanzas.service.TransaccionService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiActionServiceTest {
    private final java.util.Map<String,com.gestionfinanzas.model.entity.PropuestaChat> filas=new java.util.HashMap<>();
    private final com.gestionfinanzas.repository.PropuestaChatRepository propuestas=mock(com.gestionfinanzas.repository.PropuestaChatRepository.class);
    private final com.gestionfinanzas.repository.UsuarioRepository usuarios=mock(com.gestionfinanzas.repository.UsuarioRepository.class);
    private final PropuestaChatService almacen=new PropuestaChatService(propuestas,usuarios,new ObjectMapper().findAndRegisterModules(),mock(jakarta.persistence.EntityManager.class));
    @Test
    void confirmacionDeVozPersisteOrigenSinSobrescribirNotas() {
        var proposal = service.interpret(7L, "Registra un gasto de 25 pesos");
        service.marcarCapturaPorVoz(7L, proposal.action());
        service.confirm(7L, proposal.action().id());
        verify(transaccionService).crearTransaccion(eq(7L), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.isNull(), eq(com.gestionfinanzas.model.enums.MetodoCaptura.VOZ));
    }
    private final AiProvider provider = mock(AiProvider.class);
    private final AiFinancialContextService contextService = mock(AiFinancialContextService.class);
    private final CuentaService cuentaService = mock(CuentaService.class);
    private final CategoriaService categoriaService = mock(CategoriaService.class);
    private final PresupuestoService presupuestoService = mock(PresupuestoService.class);
    private final TransaccionService transaccionService = mock(TransaccionService.class);
    private final PlantillaRecurrenteService plantillaService = mock(PlantillaRecurrenteService.class);
    private final PresupuestoResumenResponse budgetSummary = mock(PresupuestoResumenResponse.class);
    private final AiActionService service = new AiActionService(
            provider, contextService, cuentaService, categoriaService, presupuestoService,
            transaccionService, plantillaService, new ObjectMapper().findAndRegisterModules(),
            Validation.buildDefaultValidatorFactory().getValidator(), almacen
    );

    @BeforeEach
    void configureContext() {
        when(usuarios.findByIdForUpdate(anyLong())).thenAnswer(inv -> java.util.Optional.of(com.gestionfinanzas.model.entity.Usuario.builder().id(inv.getArgument(0)).activo(true).build()));
        when(propuestas.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> { var p=(com.gestionfinanzas.model.entity.PropuestaChat)inv.getArgument(0); filas.put(p.getId(),p); return p; });
        when(propuestas.bloquear(org.mockito.ArgumentMatchers.anyString(),anyLong())).thenAnswer(inv -> java.util.Optional.ofNullable(filas.get(inv.getArgument(0))).filter(p -> p.getUsuario().getId().equals(inv.getArgument(1))));
        when(contextService.buildContext(anyLong())).thenReturn("{}");
        when(cuentaService.listarCuentas(anyLong(), anyBoolean())).thenReturn(List.of());
        when(categoriaService.listarCategorias(anyLong())).thenReturn(List.of());
        when(transaccionService.listarRecientes(anyLong())).thenReturn(List.of());
        when(presupuestoService.obtenerResumenPeriodo(anyLong(), eq(null), eq(null))).thenReturn(budgetSummary);
        when(budgetSummary.presupuestos()).thenReturn(List.of());
        when(plantillaService.listar(anyLong())).thenReturn(List.of());
        when(provider.generate(org.mockito.ArgumentMatchers.anyString(), anyInt())).thenReturn("""
                {"answer":"Voy a registrar el gasto.","action":{
                  "type":"CREATE_TRANSACTION",
                  "summary":"Registrar gasto de 25 MXN",
                  "data":{"cuentaId":1,"tipo":"GASTO","monto":25,"fecha":"2026-09-28"}
                }}
                """);
    }

    @Test
    void propuestaSoloSeEjecutaUnaVezTrasConfirmar() {
        var proposal = service.interpret(7L, "Registra un gasto de 25 pesos");

        service.confirm(7L, proposal.action().id());

        verify(transaccionService).crearTransaccion(eq(7L), org.mockito.ArgumentMatchers.any());
        assertEquals("Listo. Registrar gasto de 25 MXN", service.confirm(7L, proposal.action().id()));
        verify(transaccionService).crearTransaccion(eq(7L), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void propuestaNoPuedeConfirmarseDesdeOtraCuentaDeUsuario() {
        var proposal = service.interpret(7L, "Registra un gasto de 25 pesos");

        assertThrows(IllegalArgumentException.class, () -> service.confirm(8L, proposal.action().id()));
        verify(transaccionService, never()).crearTransaccion(anyLong(), org.mockito.ArgumentMatchers.any());

        service.confirm(7L, proposal.action().id());
        verify(transaccionService).crearTransaccion(eq(7L), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void devuelveUnGraficoFinancieroEstructuradoConLaRespuesta() {
        when(provider.generate(org.mockito.ArgumentMatchers.anyString(), anyInt())).thenReturn("""
                {"answer":"Tus gastos principales son comida y transporte.","action":null,
                 "report":{"title":"Gastos por categoría","labels":["Comida","Transporte"],
                 "values":[1200,800],"unit":"MXN"}}
                """);

        var response = service.interpret(7L, "Muéstrame una gráfica de gastos por categoría");

        org.junit.jupiter.api.Assertions.assertNull(response.report(),"Las cifras de IA no se publican como un reporte calculado.");
    }

    @Test
    void rechazaGraficosFinancierosConValoresNoNumericos() {
        when(provider.generate(org.mockito.ArgumentMatchers.anyString(), anyInt())).thenReturn("""
                {"answer":"Aquí está el gráfico.","action":null,
                 "report":{"title":"Gastos","labels":["Comida"],"values":["mucho"],"unit":"MXN"}}
                """);

        assertThrows(AiProviderException.class,
                () -> service.interpret(7L, "Muéstrame una gráfica de mis gastos"));
    }
}
