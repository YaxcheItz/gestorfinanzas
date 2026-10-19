package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.exception.TooManyRequestsException;
import com.gestionfinanzas.model.entity.ConexionWhatsapp;
import com.gestionfinanzas.repository.ConexionWhatsappRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import com.gestionfinanzas.security.LimiteAbuso;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ConexionWhatsappService {
    private static final SecureRandom RANDOM=new SecureRandom();
    private static final Duration VIGENCIA=Duration.ofMinutes(10);
    private final ConexionWhatsappRepository conexiones;
    private final UsuarioRepository usuarios;
    private final ObjectMapper mapper;
    private final LimiteAbuso limite;
    @Value("${whatsapp.channel.enabled:false}") private boolean habilitado;
    @Value("${whatsapp.channel.bot-phone:}") private String telefonoBot;
    @Value("${whatsapp.channel.phone-number-id:}") private String numeroId;
    @Value("${whatsapp.channel.webhook-secret:}") private String secreto;

    public record Estado(boolean disponible,String estado,UUID conexionId,String telefono,
                         Instant vence,Instant verificada,long generacion) {}
    public record Desafio(String codigo,String urlWhatsapp,Instant vence) {}
    public record Confirmacion(boolean verificado) {}
    public static class ErrorCanal extends RuntimeException {
        public final HttpStatus status;
        public ErrorCanal(HttpStatus status,String mensaje){super(mensaje);this.status=status;}
    }

    private boolean disponible(){return habilitado&&telefonoBot.matches("\\+[1-9][0-9]{7,14}")
            &&numeroId.matches("[0-9]+")&&secreto.length()>=32;}
    private void exigirDisponible(){if(!disponible())throw new ErrorCanal(HttpStatus.SERVICE_UNAVAILABLE,"La vinculacion de WhatsApp aun no esta disponible.");}

    @Transactional(readOnly=true)
    public Estado estado(Long usuarioId){
        return conexiones.findByUsuarioId(usuarioId).map(this::vista)
                .orElseGet(()->new Estado(disponible(),"DESCONECTADA",null,null,null,null,0));
    }
    private Estado vista(ConexionWhatsapp c){
        String estado=c.getEstado();
        if("PENDIENTE".equals(estado)&&!c.getVence().isAfter(Instant.now()))estado="CADUCADA";
        String telefono=c.getTelefono()==null?null:"•••• "+c.getTelefono().substring(c.getTelefono().length()-4);
        return new Estado(disponible(),estado,c.getId(),telefono,c.getVence(),c.getVerificada(),c.getGeneracion());
    }

    @Transactional
    public Desafio iniciar(Long usuarioId,String telefono){
        exigirDisponible();
        if(telefono==null||!telefono.matches("\\+[1-9][0-9]{7,14}"))throw new IllegalArgumentException("Usa el formato internacional, por ejemplo +525512345678.");
        limite.comprobar("whatsapp-alta:"+usuarioId,6,Duration.ofHours(1));
        var usuario=usuarios.findByIdForUpdate(usuarioId).orElseThrow(()->new IllegalArgumentException("Usuario no encontrado."));
        var c=conexiones.findByUsuarioId(usuarioId).orElseGet(()->{
            var nueva=new ConexionWhatsapp();nueva.setId(UUID.randomUUID());nueva.setUsuario(usuario);return nueva;
        });
        Instant ahora=Instant.now();
        if("VERIFICADA".equals(c.getEstado()))throw new ErrorCanal(HttpStatus.CONFLICT,"Desconecta la vinculacion actual antes de cambiar el numero.");
        if(c.getEmitida()!=null&&c.getEmitida().plusSeconds(60).isAfter(ahora))throw new TooManyRequestsException("Espera un minuto antes de solicitar otro codigo.",60);
        byte[] bytes=new byte[24];RANDOM.nextBytes(bytes);
        String codigo="KAPTAL-"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        c.setTelefono(telefono);c.setTelefonoActivoHash(null);c.setEstado("PENDIENTE");
        c.setDesafioHash(hash(codigo));c.setEmitida(ahora);c.setVence(ahora.plus(VIGENCIA));
        c.setVerificada(null);c.setRevocada(null);c.setGeneracion(c.getGeneracion()+1);
        conexiones.saveAndFlush(c);
        String url="https://wa.me/"+telefonoBot.substring(1)+"?text="+URLEncoder.encode("vincular "+codigo,StandardCharsets.UTF_8);
        return new Desafio(codigo,url,c.getVence());
    }

    @Transactional
    public Estado desconectar(Long usuarioId){
        usuarios.findByIdForUpdate(usuarioId).orElseThrow(()->new IllegalArgumentException("Usuario no encontrado."));
        var c=conexiones.findByUsuarioId(usuarioId).orElse(null);
        if(c!=null&&!"DESCONECTADA".equals(c.getEstado())){
            c.setEstado("DESCONECTADA");c.setTelefono(null);c.setTelefonoActivoHash(null);c.setDesafioHash(null);
            c.setVence(null);c.setVerificada(null);c.setRevocada(Instant.now());c.setGeneracion(c.getGeneracion()+1);
            conexiones.saveAndFlush(c);
        }
        return c==null?new Estado(disponible(),"DESCONECTADA",null,null,null,null,0):vista(c);
    }

    @Transactional
    public Confirmacion verificarEvento(byte[] raw,String firma){
        exigirDisponible();
        if(!firmaValida(raw,firma))throw new ErrorCanal(HttpStatus.UNAUTHORIZED,"Firma de webhook invalida.");
        JsonNode evento;
        try{evento=mapper.readTree(raw);}catch(java.io.IOException ex){throw new IllegalArgumentException("Evento JSON invalido.");}
        if(evento==null||!evento.isObject())throw new IllegalArgumentException("Evento JSON invalido.");
        var mensaje=evento.path("message");var kapso=mensaje.path("kapso");
        if(evento.has("batch")||!numeroId.equals(evento.path("phone_number_id").asText())
                ||!mensaje.isObject()||!kapso.isObject()||!"inbound".equals(kapso.path("direction").asText())
                ||kapso.path("passive").asBoolean()||!"text".equals(mensaje.path("type").asText()))return new Confirmacion(false);
        String id=mensaje.path("id").asText("");String stamp=mensaje.path("timestamp").asText("");
        if(id.isBlank()||id.length()>512||!stamp.matches("[0-9]{1,12}"))return new Confirmacion(false);
        long segundos=Long.parseLong(stamp),ahora=Instant.now().getEpochSecond();
        if(segundos<ahora-600||segundos>ahora+300)return new Confirmacion(false);
        String texto=mensaje.path("text").path("body").asText("");
        if(!texto.matches("vincular KAPTAL-[A-Za-z0-9_-]{32}"))return new Confirmacion(false);
        String remitente=mensaje.path("from").asText("");
        if(remitente.startsWith("+"))remitente=remitente.substring(1);
        if(!remitente.matches("[1-9][0-9]{7,14}"))return new Confirmacion(false);
        var c=conexiones.bloquearDesafio(hash(texto.substring(9))).orElse(null);
        if(c==null||!"PENDIENTE".equals(c.getEstado())||!c.getVence().isAfter(Instant.now())
                ||!("+"+remitente).equals(c.getTelefono()))return new Confirmacion(false);
        String activoHash=hash(c.getTelefono());
        // Unverified requests never reserve another person's telephone number.
        if(conexiones.existsByTelefonoActivoHash(activoHash))return new Confirmacion(false);
        c.setEstado("VERIFICADA");c.setTelefonoActivoHash(activoHash);c.setDesafioHash(null);
        c.setVence(null);c.setVerificada(Instant.now());conexiones.saveAndFlush(c);
        return new Confirmacion(true);
    }

    private boolean firmaValida(byte[] raw,String firma){
        if(firma==null||!firma.matches("[0-9a-f]{64}"))return false;
        try{
            Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            return MessageDigest.isEqual(mac.doFinal(raw),HexFormat.of().parseHex(firma));
        }catch(GeneralSecurityException ex){throw new IllegalStateException("No se pudo comprobar la firma.");}
    }
    private static String hash(String texto){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8)));}
        catch(GeneralSecurityException ex){throw new IllegalStateException("No se pudo preparar la vinculacion.");}
    }
}
