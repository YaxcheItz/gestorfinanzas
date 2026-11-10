package com.gestionfinanzas.service;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ComprasMsiAnterioresPaginaTest {
 private TransaccionResponse movimiento(long id,String fecha){var t=mock(TransaccionResponse.class);when(t.id()).thenReturn(id);when(t.fecha()).thenReturn(LocalDate.parse(fecha));return t;}
 @Test void distribuyeSinFijarNiDuplicar(){
  var primero=movimiento(10,"2026-11-10");var ultimo=movimiento(8,"2026-11-08");var siguiente=movimiento(6,"2026-11-06");var finalPagina=movimiento(4,"2026-11-04");
  var nueva=movimiento(11,"2026-11-11");var intermedia=movimiento(7,"2026-11-07");var antigua=movimiento(3,"2026-11-03");var compras=List.of(antigua,nueva,intermedia);
  var p0=new PageImpl<>(List.of(primero,ultimo),PageRequest.of(0,2),4);var p1=new PageImpl<>(List.of(siguiente,finalPagina),PageRequest.of(1,2),4);
  assertEquals(List.of(nueva,intermedia),ComprasMsiAnteriores.enPagina(compras,p0,siguiente));assertEquals(List.of(antigua),ComprasMsiAnteriores.enPagina(compras,p1,null));
 }
 @Test void sinMovimientosContablesConservaProyeccion(){var compra=movimiento(4,"2026-11-04");assertEquals(List.of(compra),ComprasMsiAnteriores.enPagina(List.of(compra),new PageImpl<>(List.of(),PageRequest.of(0,20),0),null));}
 @Test void usaIdParaFechasIguales(){var primero=movimiento(9,"2026-11-01");var siguiente=movimiento(5,"2026-11-01");var anterior=movimiento(7,"2026-11-01");var posterior=movimiento(3,"2026-11-01");
  var p0=new PageImpl<>(List.of(primero),PageRequest.of(0,1),2);var p1=new PageImpl<>(List.of(siguiente),PageRequest.of(1,1),2);
  assertEquals(List.of(anterior),ComprasMsiAnteriores.enPagina(List.of(anterior,posterior),p0,siguiente));assertEquals(List.of(posterior),ComprasMsiAnteriores.enPagina(List.of(anterior,posterior),p1,null));}
}
