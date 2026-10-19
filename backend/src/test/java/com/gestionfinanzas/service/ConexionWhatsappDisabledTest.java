package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.repository.ConexionWhatsappRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.LimiteAbuso;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConexionWhatsappDisabledTest {
    @Test void sinConfiguracionNoCreaConexionesNiInterpretaWebhooks(){
        var conexiones=mock(ConexionWhatsappRepository.class);
        var usuarios=mock(UsuarioRepository.class);
        var service=new ConexionWhatsappService(conexiones,usuarios,new ObjectMapper(),new LimiteAbuso());
        ReflectionTestUtils.setField(service,"telefonoBot","");
        ReflectionTestUtils.setField(service,"numeroId","");
        ReflectionTestUtils.setField(service,"secreto","");
        when(conexiones.findByUsuarioId(7L)).thenReturn(Optional.empty());
        assertFalse(service.estado(7L).disponible());
        assertThrows(ConexionWhatsappService.ErrorCanal.class,()->service.iniciar(7L,"+15555550123"));
        assertThrows(ConexionWhatsappService.ErrorCanal.class,()->service.verificarEvento(new byte[0],null));
        verifyNoInteractions(usuarios);
        verify(conexiones,never()).saveAndFlush(any());
    }
}
