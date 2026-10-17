package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.controller.AvisoFinancieroController.*;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.*;
import com.gestionfinanzas.repository.*;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class AvisoFinancieroService {
    private final AvisoFinancieroRepository avisos;
    private final UsuarioRepository usuarios;
    private final CuentaRepository cuentas;
    private final TransaccionRepository movimientos;
    private final TransaccionService transacciones;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final jakarta.persistence.EntityManager entityManager;

    public record Vista(String id,String origen,String resumen,String clase,String estado,String moneda,
                        TransaccionRequest datos,Long version,Instant creadoEn,Long transaccionId,List<Long> coincidencias) {}
    private Usuario propietario(Long id) {
        var u=usuarios.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Cuenta no disponible"));
        entityManager.refresh(u);
        if(!u.isActivo())throw new IllegalArgumentException("Cuenta no disponible");
        return u;
    }
    private String json(Object value) {
        try{return mapper.writeValueAsString(value);}catch(Exception ex){throw new IllegalArgumentException("Datos no validos");}
    }
    private TransaccionRequest datos(AvisoFinanciero aviso) {
        try{return aviso.getDatos()==null?null:mapper.readValue(aviso.getDatos(),TransaccionRequest.class);}
        catch(Exception ex){throw new IllegalArgumentException("No se pudo leer el aviso");}
    }
    private String hash(String value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
    private void seguro(String resumen,TransaccionRequest datos) {
        String texto=resumen+" "+(datos==null?"":json(datos));
        String descripcion=resumen+" "+(datos==null?"":Objects.toString(datos.descripcion(),"")+" "+Objects.toString(datos.notas(),""));
        if(texto.length()>6000 || texto.matches("(?is).*\\b(otp|cvv|cvc|nip|pin|contrase[nñ]a|c[oó]digo de (?:seguridad|verificaci[oó]n))\\b.*") || descripcion.matches("(?s).*(?<!\\d)(?:\\d[ -]?){13,19}(?!\\d).*"))
            throw new IllegalArgumentException("Comparte solo los datos del movimiento, sin claves ni codigos de seguridad");
    }
    @Transactional(readOnly=true)
    public Page<Vista> listar(Long uid,String estado,int page) {
        if(!Set.of("PENDIENTE","REGISTRADO","DESCARTADO").contains(estado)||page<0)throw new IllegalArgumentException("Filtro no valido");
        return avisos.findByUsuarioIdAndEstado(uid,estado,PageRequest.of(page,20,Sort.by(Sort.Direction.DESC,"creadoEn").and(Sort.by("id")))).map(this::vista);
    }
    @Transactional
    public Vista recibir(Long uid,Nuevo body) {
        var usuario=propietario(uid);seguro(body.resumen(),body.datos());
        String identidad=hash(body.identificador()),contenido=hash(json(List.of(body.resumen(),body.clase(),body.moneda(),body.datos()==null?"":body.datos(),body.claveRegistro()==null?"":body.claveRegistro())));
        var existente=avisos.findByUsuarioIdAndOrigenAndIdentificadorHash(uid,body.origen().name(),identidad);
        if(existente.isPresent()){
            if(!existente.get().getRecepcionHash().equals(contenido))throw new IllegalArgumentException("El identificador ya corresponde a otro aviso; no se reemplazaron datos");
            return vista(existente.get());
        }
        if(body.datos()!=null)contexto(uid,body.datos(),body.moneda());
        var aviso=AvisoFinanciero.builder().id(UUID.randomUUID().toString()).usuario(usuario).origen(body.origen().name())
            .identificadorHash(identidad).recepcionHash(contenido).claveRegistro(body.claveRegistro()==null?UUID.randomUUID():body.claveRegistro())
            .resumen(body.resumen().strip()).clase(body.clase().name()).estado("PENDIENTE").moneda(body.moneda())
            .datos(body.datos()==null?null:json(body.datos())).creadoEn(Instant.now()).build();
        return vista(avisos.saveAndFlush(aviso));
    }
    private AvisoFinanciero bloquear(Long uid,String id) {
        propietario(uid);
        return avisos.bloquear(id,uid).orElseThrow(()->new IllegalArgumentException("Aviso no disponible"));
    }
    private void pendiente(AvisoFinanciero a,Long version) {
        if(!"PENDIENTE".equals(a.getEstado()))throw new IllegalArgumentException("El aviso ya no esta pendiente");
        if(!Objects.equals(a.getVersion(),version))throw new IllegalArgumentException("El aviso cambio. Recarga antes de continuar");
    }
    private Cuenta contexto(Long uid,TransaccionRequest d,String moneda) {
        transacciones.validarListaCaptura(uid,d.listaId());
        Cuenta origen=null;
        if(d.cuentaId()!=null){origen=cuentas.findByIdAndUsuarioId(d.cuentaId(),uid).orElseThrow(()->new IllegalArgumentException("Cuenta no disponible"));
            if(!origen.isActivo()||!moneda.equals(origen.getMoneda()))throw new IllegalArgumentException("La moneda no coincide con la cuenta; no se convierten importes");}
        if(d.cuentaDestinoId()!=null)cuentas.findByIdAndUsuarioId(d.cuentaDestinoId(),uid).orElseThrow(()->new IllegalArgumentException("Cuenta de destino no disponible"));
        return origen;
    }
    @Transactional
    public Vista editar(Long uid,String id,Edicion body) {
        var a=bloquear(uid,id);pendiente(a,body.version());seguro(a.getResumen(),body.datos());contexto(uid,body.datos(),body.moneda());
        a.setClase(body.clase().name());a.setMoneda(body.moneda());a.setDatos(json(body.datos()));return vista(avisos.saveAndFlush(a));
    }
    @Transactional
    public Vista confirmar(Long uid,String id,Decision body) {
        var a=bloquear(uid,id);
        if("REGISTRADO".equals(a.getEstado()))return vista(a);
        pendiente(a,body.version());var d=datos(a);
        if(d==null)throw new IllegalArgumentException("Completa los datos antes de guardar");
        if(!validator.validate(d).isEmpty())throw new IllegalArgumentException("Revisa cuenta, tipo, importe, fecha y descripcion");
        var cuenta=contexto(uid,d,a.getMoneda());
        var clase=Clase.valueOf(a.getClase());
        TipoTransaccion tipo=switch(clase){case COMPRA->TipoTransaccion.GASTO;case INGRESO,DEVOLUCION->TipoTransaccion.INGRESO;case TRANSFERENCIA,PAGO_TARJETA->TipoTransaccion.TRANSFERENCIA;case SIN_CLASIFICAR->throw new IllegalArgumentException("Clasifica el aviso antes de guardar");case AUTORIZACION->throw new IllegalArgumentException("Una autorizacion pendiente no es un cargo definitivo");};
        if(tipo!=d.tipo() || d.frecuenciaRecurrencia()!=null || d.msi()!=null || d.fechaFinRecurrencia()!=null)
            throw new IllegalArgumentException("El tipo no corresponde al aviso. Las recurrencias y MSI se configuran en su seccion");
        if(d.descripcion()==null||d.descripcion().isBlank())throw new IllegalArgumentException("Escribe una descripcion");
        if(clase==Clase.PAGO_TARJETA && (d.cuentaDestinoId()==null || cuentas.findByIdAndUsuarioId(d.cuentaDestinoId(),uid).orElseThrow().getTipo()!=TipoCuenta.CREDITO))
            throw new IllegalArgumentException("El pago de tarjeta necesita una cuenta de credito como destino");
        if(!coincidencias(a,d).isEmpty()&&!body.aceptarPosibleDuplicado())throw new IllegalArgumentException("Hay movimientos parecidos. Revisa y confirma si es una operacion distinta");
        var resultado=transacciones.crearTransaccion(uid,d,a.getClaveRegistro(),"WHATSAPP".equals(a.getOrigen())?MetodoCaptura.WHATSAPP:MetodoCaptura.TEXTO);
        a.setTransaccionId(resultado.id());a.setEstado("REGISTRADO");return vista(avisos.saveAndFlush(a));
    }
    @Transactional
    public Vista descartar(Long uid,String id,Long version) {
        var a=bloquear(uid,id);if("DESCARTADO".equals(a.getEstado()))return vista(a);
        pendiente(a,version);a.setEstado("DESCARTADO");return vista(avisos.saveAndFlush(a));
    }
    private List<Long> coincidencias(AvisoFinanciero a,TransaccionRequest d) {
        if(d==null||d.cuentaId()==null||d.tipo()==null||d.fecha()==null||d.monto()==null)return List.of();
        return movimientos.buscarCoincidenciasAviso(a.getUsuario().getId(),d.cuentaId(),d.tipo(),d.fecha(),d.monto(),PageRequest.of(0,5)).stream().map(Transaccion::getId).filter(id->!Objects.equals(id,a.getTransaccionId())).toList();
    }
    private Vista vista(AvisoFinanciero a) {
        var d=datos(a);return new Vista(a.getId(),a.getOrigen(),a.getResumen(),a.getClase(),a.getEstado(),a.getMoneda(),d,a.getVersion(),a.getCreadoEn(),a.getTransaccionId(),"PENDIENTE".equals(a.getEstado())?coincidencias(a,d):List.of());
    }
}
