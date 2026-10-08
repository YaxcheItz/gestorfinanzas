package com.gestionfinanzas.ai;
import com.gestionfinanzas.dto.response.*;
import com.gestionfinanzas.model.enums.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class MotorChatReglasTest {
 private final MotorChatReglas motor=new MotorChatReglas();
 private final LocalDate hoy=LocalDate.of(2026,10,4);
 private CuentaResponse cuenta(long id,String nombre,String moneda){return new CuentaResponse(id,nombre,TipoCuenta.EFECTIVO,null,null,null,null,null,null,BigDecimal.ZERO,moneda,null,true,null);}
 private final List<CuentaResponse> cuentas=List.of(cuenta(1,"BBVA","MXN"),cuenta(2,"Nu","MXN"),cuenta(3,"Dolares","USD"));
 private final List<CategoriaResponse> categorias=List.of(new CategoriaResponse(8L,"Comida",TipoTransaccion.GASTO,null,null,true,true));
 private MotorChatReglas.Resultado interpretar(String texto){return motor.interpretar(texto,cuentas,categorias,List.of(),hoy);}
 @Test void gastoUsaHoyYMontoExacto(){var r=interpretar("Gast\u00e9 80.50 en tacos");assertEquals("GASTO",r.datos().get("tipo"));assertEquals(new BigDecimal("80.50"),r.datos().get("monto"));assertEquals("2026-10-04",r.datos().get("fecha"));assertEquals(8L,r.datos().get("categoriaId"));}
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
 @Test void complejoSeDelegaSinInventarRespuesta(){assertNull(interpretar("Compara mi reporte con el a\u00f1o pasado"));}
 @Test void cuentaDesconocidaPideAclaracion(){assertNull(interpretar("Gaste 50 usando Banorte").datos());}
 @Test void abreviaturaConCategoriaFunciona(){assertEquals("GASTO",interpretar("tacos 80").datos().get("tipo"));}
 @Test void confirmaMemoriaDeCategoriaYCuenta(){var t=new TransaccionResponse(1L,2L,"Nu",null,null,8L,"Comida",null,null,TipoTransaccion.GASTO,new BigDecimal("20"),null,null,"MXN",null,hoy,"Taqueria Pepe",null,false,null);var r=motor.interpretar("Gaste 70 en Pepe",cuentas,categorias,List.of(t),hoy);assertEquals(2L,r.datos().get("cuentaId"));assertEquals(8L,r.datos().get("categoriaId"));}
}
