package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.dto.response.PresupuestoResponse;
import com.gestionfinanzas.dto.response.PresupuestoResumenResponse;
import com.gestionfinanzas.dto.response.ListaResponse;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
            Validation.buildDefaultValidatorFactory().getValidator(), almacen,
            new com.gestionfinanzas.security.LimiteAbuso()
    );

    @BeforeEach
    void configureContext() {
        when(usuarios.findByIdForUpdate(anyLong())).thenAnswer(inv -> java.util.Optional.of(com.gestionfinanzas.model.entity.Usuario.builder().id(inv.getArgument(0)).activo(true).build()));
        when(propuestas.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> { var p=(com.gestionfinanzas.model.entity.PropuestaChat)inv.getArgument(0); filas.put(p.getId(),p); return p; });
        when(propuestas.bloquear(org.mockito.ArgumentMatchers.anyString(),anyLong())).thenAnswer(inv -> java.util.Optional.ofNullable(filas.get(inv.getArgument(0))).filter(p -> p.getUsuario().getId().equals(inv.getArgument(1))));
        when(contextService.buildContext(anyLong())).thenReturn("{}");
        when(contextService.listarListas(anyLong())).thenReturn(List.of());
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

    @Test
    void presupuestosNoPresentaEvidenciaDeUnAgregadoConOtroAlcance() {
        var fecha=java.time.LocalDate.of(2026,10,20);
        when(presupuestoService.obtenerResumenPeriodo(7L,10,2026)).thenReturn(budgetSummary);
        when(presupuestoService.obtenerResumenPeriodo(7L,79L,10,2026)).thenReturn(budgetSummary);
        when(budgetSummary.presupuestos()).thenReturn(List.of(new PresupuestoResponse(
                1L,8L,"Comida",null,null,new java.math.BigDecimal("500"),"MXN",
                new java.math.BigDecimal("120"),new java.math.BigDecimal("380"),
                new java.math.BigDecimal("24"),10,2026,"EN_RANGO",79L,"Viaje",80)));
        var reglas=new MotorChatReglas.Resultado(null,null,List.of(),null,"PRESUPUESTOS",
                fecha.withDayOfMonth(1),fecha,"MXN",null,8L,null,"Comida");

        var response=service.resolverReporteLocal(7L,reglas);

        assertEquals(List.of(),response.evidence());
        assertNull(response.report());
        assertTrue(response.answer().contains("No hay movimientos navegables dentro del mismo alcance"));
        verify(contextService,never()).reporteLocal(anyLong(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void evidenciaDePresupuestoUsaElMismoMesMonedaCategoriaListaYAutor() {
        var fecha=java.time.LocalDate.of(2026,10,20);
        var desde=fecha.withDayOfMonth(1);var hasta=fecha.withDayOfMonth(fecha.lengthOfMonth());
        var expense=new AiEvidence("Comida",desde,hasta,"MXN",com.gestionfinanzas.model.enums.TipoTransaccion.GASTO,
                2,new java.math.BigDecimal("120"),null,8L,null,"Comida",false,79L,"Vacaciones",7L);
        when(presupuestoService.obtenerResumenPeriodo(7L,10,2026)).thenReturn(budgetSummary);
        when(presupuestoService.obtenerResumenPeriodo(7L,79L,10,2026)).thenReturn(budgetSummary);
        when(budgetSummary.presupuestos()).thenReturn(List.of(new PresupuestoResponse(
                1L,8L,"Comida",null,null,new java.math.BigDecimal("500"),"MXN",
                new java.math.BigDecimal("120"),new java.math.BigDecimal("380"),
                new java.math.BigDecimal("24"),10,2026,"EN_RANGO",79L,"Vacaciones",80)));
        when(contextService.listarListas(7L)).thenReturn(List.of(
                new ListaResponse(79L,"Vacaciones","🌴","MXN",false,false,"PROPIETARIO",List.of())));
        when(contextService.reporteLocal(7L,"CATEGORIAS",desde,hasta,"MXN",null,8L,null,"Comida",79L,"Vacaciones"))
                .thenReturn(new AiActionService.AiActionResult("Gastos exactos",null,List.of(),null,List.of(),null,List.of(expense)));
        var reglas=new MotorChatReglas.Resultado(null,null,List.of(),null,"PRESUPUESTOS",
                fecha.withDayOfMonth(1),fecha,"MXN",null,8L,null,"Comida",79L,"Vacaciones");

        var response=service.resolverReporteLocal(7L,reglas);

        assertEquals(List.of(expense),response.evidence());
        assertTrue(response.answer().contains("disponible 380 MXN"));
        verify(contextService).reporteLocal(7L,"CATEGORIAS",desde,hasta,"MXN",null,8L,null,"Comida",79L,"Vacaciones");
    }

    @Test
    void gastoFijoListaSoloPlantillasDeGastoYExplicaCuentaFrecuenciaYFecha() {
        when(plantillaService.listar(7L)).thenReturn(List.of(
                new com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse(1L,2L,"Nu",8L,"Comida",
                        com.gestionfinanzas.model.enums.TipoTransaccion.GASTO,new java.math.BigDecimal("500"),"MXN",
                        null,com.gestionfinanzas.model.enums.FrecuenciaRecurrencia.MENSUAL,
                        java.time.LocalDate.of(2026,11,5),true),
                new com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse(2L,2L,"Nu",9L,"Sueldo",
                        com.gestionfinanzas.model.enums.TipoTransaccion.INGRESO,new java.math.BigDecimal("15000"),"MXN",
                        null,com.gestionfinanzas.model.enums.FrecuenciaRecurrencia.MENSUAL,
                        java.time.LocalDate.of(2026,11,1),true)));
        var reglas=new MotorChatReglas.Resultado(null,null,List.of(),null,"RECURRENTES_GASTO",
                java.time.LocalDate.of(2026,10,1),java.time.LocalDate.of(2026,10,20),"MXN",
                2L,8L,"Nu","Comida");

        var response=service.resolverReporteLocal(7L,reglas);

        assertTrue(response.answer().contains("Nu"));
        assertTrue(response.answer().contains("mensual"));
        assertTrue(response.answer().contains("2026-11-05"));
        assertTrue(!response.answer().contains("Sueldo"));
        assertTrue(response.answer().contains("no son movimientos ya ejecutados"));
    }
}
