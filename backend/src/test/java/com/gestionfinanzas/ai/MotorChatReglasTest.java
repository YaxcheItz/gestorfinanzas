package com.gestionfinanzas.ai;
import com.gestionfinanzas.dto.response.*;
import com.gestionfinanzas.model.enums.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class MotorChatReglasTest {
 @Test void compraMsiConservaMontoPlazoCategoriaYFecha(){
  var tarjeta=new CuentaResponse(7L,"Tarjeta ficticia",TipoCuenta.CREDITO,null,null,null,null,null,null,BigDecimal.ZERO,"MXN",null,true,null);
  var r=motor.interpretar("Compre 900 con Tarjeta ficticia a 3 meses sin intereses categoria Comida 2026-10-02",List.of(tarjeta),categorias,List.of(),hoy);
  assertNotNull(r.datos()); assertEquals(new BigDecimal("900.00"),r.datos().get("monto"));assertEquals(3,r.datos().get("msi"));assertEquals(8L,r.datos().get("categoriaId"));assertEquals("2026-10-02",r.datos().get("fecha"));
 }
 @Test void msiInvalidoONoCreditoNoProduceGastoOrdinario(){
  assertNull(interpretar("Compre 900 con BBVA a 3 MSI").datos());
  assertNull(interpretar("Compre 900 a 61 meses sin intereses").datos());
  assertNull(interpretar("Compre 900 a meses sin intereses").datos());
 }
 @Test void comparacionMensualUsaConsultaSinPropuestaNiImporte(){var r=interpretar("Compárame este mes con el anterior en MXN");assertEquals("COMPARACION_MENSUAL",r.reporte());assertEquals(LocalDate.of(2026,10,1),r.desde());assertEquals(hoy,r.hasta());assertEquals("MXN",r.moneda());assertNull(r.datos());}
 @Test void comparacionConListaOCategoriaNoPierdeElFiltro(){var r=interpretar("Compara este mes con el anterior en comida");assertEquals("COMPARACION_MENSUAL",r.reporte());assertEquals(8L,r.categoriaId());var lista=interpretar("Compara este mes con el anterior en la lista vacaciones");assertNotNull(lista);assertNull(lista.reporte());}
 @Test void consultaReconoceCategoriaCuentaYRangoExplicito(){var r=interpretar("Gastos de comida desde BBVA del 2026-10-01 al 2026-10-04");assertNotNull(r);assertEquals("RESUMEN",r.reporte());assertEquals(LocalDate.of(2026,10,1),r.desde());assertEquals(LocalDate.of(2026,10,4),r.hasta());assertEquals(1L,r.cuentaId());assertEquals(8L,r.categoriaId());}
 @Test void filtroDeCuentaDesconocidaNoSeConvierteEnConsultaGlobal(){var r=interpretar("Gastos de comida desde Banorte este mes");assertNotNull(r);assertNull(r.reporte());assertTrue(r.respuesta().toLowerCase().contains("cuenta"));}
 @Test void categoriaDesconocidaNoSeConvierteEnConsultaGlobal(){var r=interpretar("Gastos de viajes este mes");assertNotNull(r);assertNull(r.reporte());assertTrue(r.respuesta().toLowerCase().contains("categor"));}
 @Test void reporteResuelveListaAccesibleYConservaSuAlcance(){var lista=new ListaResponse(12L,"Vacaciones","🌴","MXN",false,false,"EDITOR",List.of());var r=motor.interpretar("Gastos de comida en la lista Vacaciones este mes",cuentas,categorias,List.of(),hoy,false,List.of(lista));assertEquals("RESUMEN",r.reporte());assertEquals(12L,r.listaId());assertEquals("Vacaciones",r.listaNombre());assertEquals(8L,r.categoriaId());}
 @Test void listaDesconocidaPideAclaracionYNoGeneraReporteGlobal(){var lista=new ListaResponse(12L,"Vacaciones","🌴","MXN",false,false,"EDITOR",List.of());var r=motor.interpretar("Gastos en la lista Familiar este mes",cuentas,categorias,List.of(),hoy,false,List.of(lista));assertNotNull(r);assertNull(r.reporte());assertTrue(r.respuesta().toLowerCase().contains("lista"));}
 private final MotorChatReglas motor=new MotorChatReglas();
 private final LocalDate hoy=LocalDate.of(2026,10,4);
 private CuentaResponse cuenta(long id,String nombre,String moneda){return new CuentaResponse(id,nombre,TipoCuenta.EFECTIVO,null,null,null,null,null,null,BigDecimal.ZERO,moneda,null,true,null);}
 private final List<CuentaResponse> cuentas=List.of(cuenta(1,"BBVA","MXN"),cuenta(2,"Nu","MXN"),cuenta(3,"Dolares","USD"));
 private final List<CategoriaResponse> categorias=List.of(new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true));
 private MotorChatReglas.Resultado interpretar(String texto){return motor.interpretar(texto,cuentas,categorias,List.of(),hoy);}
 @Test void gastoUsaHoyYMontoExacto(){var r=interpretar("Gast\u00e9 80.50 en tacos");assertEquals("GASTO",r.datos().get("tipo"));assertEquals(new BigDecimal("80.50"),r.datos().get("monto"));assertEquals("2026-10-04",r.datos().get("fecha"));assertEquals(8L,r.datos().get("categoriaId"));}
 @Test void restaurantesEnPluralSeAsociaAComida(){assertEquals(8L,interpretar("Gaste 80 en restaurantes").datos().get("categoriaId"));}
 @Test void categoriasAmbiguasNoSeEligenSegunOrden(){var opciones=List.of(new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true),new CategoriaResponse(9L,"Alimentacion",TipoTransaccion.GASTO,null,null,true,true));assertNull(motor.interpretar("Gaste 80 en restaurantes",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));}
 @Test void prefiereComidaPrecisamenteAunqueLaCategoriaMixtaSeaPersonal(){var opciones=List.of(new CategoriaResponse(9L,"Alimentos y Supermercado",TipoTransaccion.GASTO,null,null,true,true),new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true));assertEquals(8L,motor.interpretar("Gaste 80 en restaurantes",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));}
 @Test void categoriaPersonalSePrefiereSobreGenericaCuandoEsUnica(){var opciones=List.of(new CategoriaResponse(9L,"Alimentos y Supermercado",TipoTransaccion.GASTO,null,null,false,true),new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true));assertEquals(8L,motor.interpretar("Gaste 80 en restaurantes",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));}
 @Test void restauranteConAmexReconoceCuentaYCategoriaPersonal(){var opciones=List.of(new CategoriaResponse(9L,"Alimentos y Supermercado",TipoTransaccion.GASTO,null,null,false,true),new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true));var r=motor.interpretar("Pague 50 en restaurantes con Amex",List.of(cuenta(4,"American Express","MXN")),opciones,List.of(),hoy);assertEquals(8L,r.datos().get("categoriaId"));assertEquals(4L,r.datos().get("cuentaId"));}
 @Test void nombreDuplicadoPrefiereCategoriaPersonal(){var opciones=List.of(new CategoriaResponse(9L,"Comida",TipoTransaccion.GASTO,null,null,false,true),new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true));assertEquals(8L,motor.interpretar("Gaste 80 en comida",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));}
 @Test void conceptosDistintosNoSeResuelvenPorSerPersonalizadaUnaCategoria(){var opciones=List.of(new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true),new CategoriaResponse(9L,"Transporte",TipoTransaccion.GASTO,null,null,false,true));assertNull(motor.interpretar("Gaste 80 en tacos y gasolina",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));}
 @Test void identificaModismosEnCategoriasPersonales(){var opciones=List.of(new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true),new CategoriaResponse(9L,"Gimnasio",TipoTransaccion.GASTO,null,null,true,true));assertEquals(8L,motor.interpretar("Pague 80 en la fondita",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));assertEquals(9L,motor.interpretar("Pague 80 en el gym",cuentas,opciones,List.of(),hoy).datos().get("categoriaId"));}
 @Test void reconoceModismoEnTorta(){assertEquals(8L,interpretar("Me eche 50 en una torta").datos().get("categoriaId"));}
 @Test void restaurantesSeAsociaACategoriaPredeterminadaDeAlimentos(){var categoriasPorDefecto=List.of(new CategoriaResponse(9L,"Alimentos y Supermercado",TipoTransaccion.GASTO,null,null,true,true));assertEquals(9L,motor.interpretar("Gaste 80 en restaurantes",cuentas,categoriasPorDefecto,List.of(),hoy).datos().get("categoriaId"));}
 @Test void ingresoReconoceAcentosYAyer(){var r=interpretar("Recib\u00ed 900 de sueldo ayer");assertEquals("INGRESO",r.datos().get("tipo"));assertEquals("2026-10-03",r.datos().get("fecha"));}
 @Test void fechaNoSeConfundeConImporte(){var r=interpretar("Gasto 50 en tacos 2026-09-30");assertEquals("2026-09-30",r.datos().get("fecha"));assertEquals(new BigDecimal("50.00"),r.datos().get("monto"));}
 @Test void fechaInvalidaPreguntaSinPropuesta(){assertNull(interpretar("Gasto 50 31/02/2026").datos());}
 @Test void transferenciaResuelveDosCuentas(){var r=interpretar("transfer\u00ed 200 de BBVA a Nu");assertEquals(1L,r.datos().get("cuentaId"));assertEquals(2L,r.datos().get("cuentaDestinoId"));assertNull(r.datos().get("categoriaId"));}
 @Test void transferenciaPideDestino(){var r=interpretar("transferi 200 desde BBVA");assertNull(r.datos());assertTrue(r.contexto().endsWith(" a"));assertFalse(r.sugerencias().isEmpty());}
 @Test void monedaDiferenteExigeTasa(){assertNull(interpretar("transferi 200 de BBVA a Dolares").datos());var r=interpretar("transferi 200 de BBVA a Dolares tasa 0.05");assertEquals(new BigDecimal("0.05"),r.datos().get("tasaCambio"));}
 @Test void montoNegativoNoSeConvierteEnPositivo(){assertNull(interpretar("Gasto -50 en tacos").datos());assertNull(interpretar("Gasto 0 en tacos").datos());}
 @Test void variosImportesNoSeSuman(){assertNull(interpretar("Gaste 50 en tacos y 20 en cafe"));}
 @Test void reporteEsLocalConPeriodo(){var r=interpretar("Reporte de hoy");assertEquals("RESUMEN",r.reporte());assertEquals(hoy,r.desde());assertEquals(hoy,r.hasta());}
 @Test void categoriasYMonedaSeReconocen(){var r=interpretar("Top categor\u00edas de este mes USD");assertEquals("CATEGORIAS",r.reporte());assertEquals("USD",r.moneda());assertEquals(hoy.withDayOfMonth(1),r.desde());}
 @Test void reconoceConsultasDeGastosEIngresosRecurrentes(){assertEquals("RECURRENTES_GASTO",interpretar("Muéstrame mi gasto fijo").reporte());assertEquals("RECURRENTES_GASTO",interpretar("Muéstrame mis gastos fijos").reporte());assertEquals("RECURRENTES_INGRESO",interpretar("Ingresos recurrentes").reporte());assertEquals("RECURRENTES",interpretar("Muéstrame mis movimientos recurrentes").reporte());assertEquals("GASTO",interpretar("Gasté 80 en pizza recurrente").datos().get("tipo"));}
 @Test void complejoSeDelegaSinInventarRespuesta(){assertNull(interpretar("Compara mi reporte con el a\u00f1o pasado"));}
 @Test void cuentaDesconocidaPideAclaracion(){assertNull(interpretar("Gaste 50 usando Banorte").datos());}
 @Test void abreviaturaConCategoriaFunciona(){assertEquals("GASTO",interpretar("tacos 80").datos().get("tipo"));}
 @Test void confirmaMemoriaDeCategoriaYCuenta(){var t=new TransaccionResponse(1L,2L,"Nu",null,null,8L,"Comida",null,null,TipoTransaccion.GASTO,new BigDecimal("20"),null,null,"MXN",null,hoy,"Taqueria Pepe",null,false,null);var r=motor.interpretar("Gaste 70 en Pepe",cuentas,categorias,List.of(t),hoy);assertEquals(2L,r.datos().get("cuentaId"));assertEquals(8L,r.datos().get("categoriaId"));}
 @Test void aliasAmexReconoceSoloLaCuentaCorrespondiente(){var cs=List.of(cuenta(5,"American Express","MXN"),cuenta(6,"BBVA","MXN"));var r=motor.interpretar("Pague 50 en tacos con Amex",cs,categorias,List.of(),hoy,true);assertEquals(5L,r.datos().get("cuentaId"));assertEquals("tacos",r.datos().get("descripcion"));}
 @Test void aliasAmexAmbiguoPideElegirCuenta(){var cs=List.of(cuenta(5,"American Express Oro","MXN"),cuenta(6,"American Express Azul","MXN"));var r=motor.interpretar("Pague 50 en tacos con Amex",cs,categorias,List.of(),hoy,true);assertNull(r.datos());assertTrue(r.respuesta().contains("varias cuentas"));}
 @Test void reconoceTaqueriaComoComida(){assertEquals(8L,interpretar("Pague 50 en taqueria").datos().get("categoriaId"));}
 @Test void ingresoPorDefectoEsSalarioYRespetaOtraCategoria(){
  var cats=List.of(new CategoriaResponse(10L,"Salario",TipoTransaccion.INGRESO,null,null,true,true),new CategoriaResponse(11L,"Regalo",TipoTransaccion.INGRESO,null,null,true,true));
  var efectivo=List.of(cuenta(4,"Efectivo","MXN"));
  assertEquals(10L,motor.interpretar("Ingresé 200 en efectivo",efectivo,cats,List.of(),hoy,true).datos().get("categoriaId"));
  assertEquals(11L,motor.interpretar("Recibí 200 de regalo en efectivo",efectivo,cats,List.of(),hoy,true).datos().get("categoriaId"));
  assertNull(motor.interpretar("Ingresé 200 en efectivo categoría desconocida",efectivo,cats,List.of(),hoy,true));
 }
}
