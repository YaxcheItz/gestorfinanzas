package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.gestionfinanzas.ai.MotorChatReglas;
import com.gestionfinanzas.controller.AvisoFinancieroController.*;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.LimiteAbuso;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

/** Signed events grant only this channel's operations, never a general user session. */
@Service @RequiredArgsConstructor
public class WhatsappEventoService {
    private final ConexionWhatsappService vinculacion;
    private final ConexionWhatsappRepository conexiones;
    private final EventoWhatsappRepository eventos;
    private final UsuarioRepository usuarios;
    private final CuentaService cuentas;
    private final WhatsappInterpretacionService interpretacion;
    private final AvisoFinancieroService avisos;
    private final Validator validator;
    private final LimiteAbuso limite;
    private final EntityManager em;
    public record Resultado(boolean responder,String respuesta,UUID conexionId,long generacion) {}
    private record Entrada(String id,String telefono,String tipo,String texto,Instant fecha,String clave,String huella) {}
    private Resultado ignorar(){return new Resultado(false,null,null,0);}

    private Entrada entrada(byte[] raw,String firma){
        JsonNode root=vinculacion.eventoFirmado(raw,firma),m=root.path("message"),k=m.path("kapso");
        if(root.has("batch")||!vinculacion.numeroBotId().equals(root.path("phone_number_id").asText())
                ||!m.isObject()||!k.isObject()||!"inbound".equals(k.path("direction").asText())||k.path("passive").asBoolean())return null;
        String phone=m.path("from").asText("").replaceFirst("^\\+","");
        String id=m.path("id").asText(""),stamp=m.path("timestamp").asText(""),type=m.path("type").asText("");
        if(!phone.matches("[1-9][0-9]{7,14}")||id.isBlank()||id.length()>512||!stamp.matches("[0-9]{1,12}"))return null;
        long epoch=Long.parseLong(stamp),now=Instant.now().getEpochSecond();
        if(epoch<now-86400||epoch>now+300)return null;
        String text=switch(type){case "text"->m.path("text").path("body").asText("");case "audio"->k.path("transcript").path("text").asText("");default->"";};
        if(text.length()>1200)return null;
        String key=hash(vinculacion.numeroBotId()+":"+phone+":"+id);
        // Same message ID with a different body must not replace a frozen result.
        return new Entrada(id,"+"+phone,type,text,Instant.ofEpochSecond(epoch),key,hash(Base64.getEncoder().encodeToString(raw)));
    }
    private ConexionWhatsapp conexion(Entrada e){
        var initial=conexiones.findByTelefonoActivoHash(hash(e.telefono())).orElse(null);
        if(initial==null)return null;
        var owner=usuarios.findByIdForUpdate(initial.getUsuario().getId()).orElse(null);
        if(owner==null)return null;em.refresh(owner);
        if(!owner.isActivo())return null;
        var c=conexiones.bloquearId(initial.getId()).orElse(null);
        if(c==null)return null;em.refresh(c,LockModeType.PESSIMISTIC_WRITE);
        return "VERIFICADA".equals(c.getEstado())&&e.telefono().equals(c.getTelefono())?c:null;
    }

    @Transactional
    public Resultado procesar(byte[] raw,String firma,String recibido,String firmaRelay){
        Instant recepcion=vinculacion.verificarRecepcion(raw,recibido,firmaRelay);
        Entrada e=entrada(raw,firma);if(e==null)return ignorar();
        boolean link=e.tipo().equals("text")&&e.texto().matches("vincular KAPTAL-[A-Za-z0-9_-]{32}");
        if(!link&&!vinculacion.operativo())throw new ConexionWhatsappService.ErrorCanal(HttpStatus.SERVICE_UNAVAILABLE,"El registro por WhatsApp aun no esta disponible.");
        if(link){
            var old=eventos.findById(e.clave()).orElse(null);
            if(old!=null){var c=conexion(e);return vigente(old,c,e)?resultado(old,c):ignorar();}
            if(!vinculacion.verificarEvento(raw,firma).verificado())return ignorar();
        }
        var c=conexion(e);if(c==null)return ignorar();
        var old=eventos.findById(e.clave()).orElse(null);
        if(old!=null)return vigente(old,c,e)?resultado(old,c):ignorar();
        if(!link&&recepcion.isBefore(c.getVerificada()))return ignorar();
        limite.comprobar("whatsapp-evento:"+c.getId(),60,Duration.ofMinutes(1));
        String respuesta=link?"Tu numero quedo vinculado a Kaptal. Puedes pedir ayuda o saldo.":resolver(c,e);
        var saved=new EventoWhatsapp();saved.setId(e.clave());saved.setConexion(c);saved.setGeneracion(c.getGeneracion());
        saved.setContenidoHash(e.huella());saved.setRespuesta(respuesta);saved.setCreado(Instant.now());
        eventos.saveAndFlush(saved);return resultado(saved,c);
    }
    private boolean vigente(EventoWhatsapp event,ConexionWhatsapp c,Entrada e){
        return c!=null&&event.getConexion().getId().equals(c.getId())&&event.getGeneracion()==c.getGeneracion()&&event.getContenidoHash().equals(e.huella());
    }
    private Resultado resultado(EventoWhatsapp event,ConexionWhatsapp c){return new Resultado(true,event.getRespuesta(),c.getId(),c.getGeneracion());}

    @Transactional
    public boolean autorizarRespuesta(byte[] raw,String firma,String recibido,String firmaRelay){
        vinculacion.verificarRecepcion(raw,recibido,firmaRelay);
        Entrada e=entrada(raw,firma);if(e==null||Instant.now().minusSeconds(86100).isAfter(e.fecha()))return false;
        var event=eventos.findById(e.clave()).orElse(null);return event!=null&&vigente(event,conexion(e),e);
    }

    private String resolver(ConexionWhatsapp c,Entrada e){
        if(!e.fecha().atZone(ZoneId.of("America/Mexico_City")).toLocalDate().equals(CalendarioFinanciero.hoy()))
            return "Tu mensaje quedo pendiente desde otro dia. Envialo otra vez con fecha explicita. No se registro dinero.";
        if(e.tipo().equals("audio")){
            if(e.texto().isBlank())return "No pude obtener la transcripcion. No se registro dinero. Envia el movimiento por texto.";
            c.setAudioTexto(e.texto());c.setAudioCodigo(claveFinanciera(c.getUsuario().getId(),"whatsapp-audio",e.id()).toString().substring(0,8));
            c.setAudioVence(Instant.now().plusSeconds(900));c.setAudioFecha(CalendarioFinanciero.hoy());
            return "Entendi: \""+e.texto()+"\"\nRevisa importe y cuenta. Responde: confirmar audio "+c.getAudioCodigo()+"\nO escribe cancelar. Caduca en 15 minutos.";
        }
        if(!e.tipo().equals("text"))return "Envia texto o una nota de voz para registrar un movimiento.";
        String texto=e.texto(),normal=MotorChatReglas.normalizar(texto);
        if(normal.equals("cancelar")){ConexionWhatsappService.limpiarContexto(c);return "Borrador cancelado. No se registro dinero.";}
        if(normal.equals("ayuda")||normal.equals("/ayuda"))return "Puedes pedir saldo, movimientos recientes, resumen de este mes o escribir: gaste 180 en comida con Nombre de cuenta.\nSi falta la cuenta, te la preguntare. Los avisos y posibles duplicados se revisan en Kaptal.";
        if(texto.startsWith("/codex "))return "Solicitud para revision humana. No se ejecutan comandos desde WhatsApp.";
        if(normal.startsWith("confirmar audio ")){
            if(c.getAudioTexto()==null||!normal.substring(16).equals(c.getAudioCodigo())||!c.getAudioVence().isAfter(Instant.now())||!CalendarioFinanciero.hoy().equals(c.getAudioFecha()))
                return "Ese audio ya no esta disponible. Envia texto o una nueva nota de voz.";
            texto=c.getAudioTexto();c.setAudioTexto(null);c.setAudioCodigo(null);c.setAudioVence(null);c.setAudioFecha(null);
        }
        if(c.getContexto()!=null&&c.getContextoVence().isAfter(Instant.now())){
            String selection=MotorChatReglas.normalizar(texto).replaceFirst("^(con|desde|cuenta) ","");
            var matches=cuentas.listarCuentas(c.getUsuario().getId(),true).stream().filter(a->a.activo()&&MotorChatReglas.normalizar(a.nombre()).equals(selection)).toList();
            if(matches.size()==1)texto=c.getContexto()+" desde "+matches.get(0).nombre();
        }
        if(texto.length()>1200)return "El mensaje es demasiado largo. Envialo de nuevo con importe y cuenta.";
        var r=interpretacion.interpretar(c.getUsuario().getId(),texto).data();
        c.setContexto(r.contexto());c.setContextoVence(r.contexto()==null?null:Instant.now().plusSeconds(900));
        if(!"PROPUESTA".equals(r.tipo()))return r.respuesta()+(r.sugerencias().isEmpty()?"":"\n"+String.join("\n",r.sugerencias()));
        var d=r.propuesta();
        if(!validator.validate(d).isEmpty())return "Revisa los datos en Kaptal. No pude preparar un movimiento valido.";
        UUID key=claveFinanciera(c.getUsuario().getId(),"whatsapp-chat",e.id());
        Clase clase=switch(d.tipo()){case GASTO->Clase.COMPRA;case INGRESO->Clase.INGRESO;case TRANSFERENCIA->Clase.TRANSFERENCIA;default->Clase.SIN_CLASIFICAR;};
        var aviso=avisos.recibir(c.getUsuario().getId(),new Nuevo(Origen.WHATSAPP,key.toString(),d.descripcion().substring(0,Math.min(200,d.descripcion().length())),clase,r.moneda(),d,key));
        if(c.isGuardarAutomaticamente()&&aviso.coincidencias().isEmpty()&&d.frecuenciaRecurrencia()==null&&d.fechaFinRecurrencia()==null&&d.msi()==null)
            aviso=avisos.confirmar(c.getUsuario().getId(),aviso.id(),new Decision(aviso.version(),false));
        return "REGISTRADO".equals(aviso.estado())?"Movimiento registrado en Kaptal.":"Aviso pendiente en Kaptal. Revisalo antes de guardar; si hay movimientos parecidos, confirma si es otra operacion.";
    }

    static String hash(String text){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
    public static UUID claveFinanciera(Long owner,String source,String id){
        try{
            var sha=MessageDigest.getInstance("SHA-1");sha.update(HexFormat.of().parseHex("6ba7b8119dad11d180b400c04fd430c8"));
            byte[] bytes=Arrays.copyOf(sha.digest(("kaptal:"+owner+":"+source+":"+id).getBytes(StandardCharsets.UTF_8)),16);
            bytes[6]=(byte)((bytes[6]&15)|80);bytes[8]=(byte)((bytes[8]&63)|128);
            var buffer=java.nio.ByteBuffer.wrap(bytes);return new UUID(buffer.getLong(),buffer.getLong());
        }catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
}
