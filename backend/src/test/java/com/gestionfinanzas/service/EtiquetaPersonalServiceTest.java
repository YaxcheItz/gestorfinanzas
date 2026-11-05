package com.gestionfinanzas.service;
import com.gestionfinanzas.model.entity.EtiquetaPersonal;
import com.gestionfinanzas.repository.EtiquetaPersonalRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class EtiquetaPersonalServiceTest {
 private final EtiquetaPersonalRepository repo=mock(EtiquetaPersonalRepository.class);
 private final EtiquetaPersonalService service=new EtiquetaPersonalService(repo);
 @Test void normalizaYRechazaDuplicados() {
  when(repo.existsByUsuarioIdAndNombre(7L,"viaje")).thenReturn(true);
  assertThrows(IllegalArgumentException.class,()->service.crear(7L,"#VIAJE")); verify(repo,never()).save(any());
 }
 @Test void eliminarSoloAccedeAlCatalogoDelUsuario() {
  var e=EtiquetaPersonal.builder().id(2L).usuarioId(7L).nombre("viaje").build();
  when(repo.findByIdAndUsuarioId(2L,7L)).thenReturn(Optional.of(e));
  service.eliminar(7L,2L); verify(repo).delete(e);
  assertThrows(IllegalArgumentException.class,()->service.eliminar(8L,2L));
 }
}
