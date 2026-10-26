package com.gestionfinanzas.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.controller.AvisoFinancieroController.*;
import com.gestionfinanzas.dto.request.AutomatizacionAndroidRequest.*;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.model.entity.*;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.LimiteAbuso;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class AutomatizacionAndroidService {
    private final ConexionAndroidRepository conexiones;
    private final UsuarioRepository usuarios;
    private final CuentaRepository cuentas;
    private final CategoriaRepository categorias;
    private final TransaccionService transacciones;
    private final AvisoFinancieroService avisos;
    private final ObjectMapper mapper;
    private final EntityManager em;
    private final LimiteAbuso limite;

    private static final Map<String,String> BANCOS=Map.of(
        "SANTANDER","mx.bancosantander.supermovil", "REVOLUT","com.revolut.revolut",
        "AMEX","com.americanexpress.android.acctsvcs.mx", "BBVA","com.bancomer.mbanking");
    private static final Set<String> MENSAJES=Set.of("com.samsung.android.messaging","com.google.android.apps.messaging","com.android.mms");
    public record Credencial(String id,String clave,Instant vence,List<Regla> reglas) {}
    public record Estado(boolean activa,Instant vence,List<Regla> reglas) {}

    private Usuario propietario(Long id) {
        var usuario=usuarios.findByIdForUpdate(id).orElseThrow(SesionInvalidaException::new);
        em.refresh(usuario);
        if(!usuario.isActivo())throw new SesionInvalidaException();
        return usuario;
    }
    private String json(Object value) {
        try{return mapper.writeValueAsString(value);}catch(Exception ex){throw new IllegalArgumentException("Configuración no válida.");}
    }
    private List<Regla> reglas(ConexionAndroid conexion) {
        try{return mapper.readValue(conexion.getReglas(),new TypeReference<List<Regla>>(){});}
        catch(Exception ex){throw new IllegalStateException("No se pudo leer la configuración del dispositivo.");}
    }
    private static String hash(String value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }

    @Transactional
    public Credencial configurar(Long uid,Configuracion config) {
        var usuario=propietario(uid);
        if(!config.consentimiento())throw new IllegalArgumentException("Acepta el registro automático para activar esta conexión.");
        if(config.reglas()==null||config.reglas().isEmpty()||config.reglas().size()>10)
            throw new IllegalArgumentException("Configura entre una y diez reglas.");
        Set<UUID> ids=new HashSet<>();Set<String> rutas=new HashSet<>();
        for(Regla regla:config.reglas()) {
            if(!ids.add(regla.id()))throw new IllegalArgumentException("Hay reglas repetidas.");
            boolean sms="SEARS".equals(regla.proveedor());
            if(sms ? !MENSAJES.contains(regla.paquete())||regla.remitente()==null||!regla.remitente().matches("[+0-9A-Za-z][0-9A-Za-z +_-]{1,39}")
                    : !Objects.equals(BANCOS.get(regla.proveedor()),regla.paquete()))
                throw new IllegalArgumentException("La aplicación o el remitente no corresponden al proveedor.");
            if(!sms && regla.remitente()!=null&&!regla.remitente().isBlank())throw new IllegalArgumentException("No se admite remitente para esa app bancaria.");
            String ruta=regla.paquete()+":"+Objects.toString(regla.remitente(),"")+":"+Objects.toString(regla.terminacion(),"");
            if(!rutas.add(ruta))throw new IllegalArgumentException("Dos reglas corresponden al mismo origen y tarjeta.");
            var cuenta=cuentas.findByIdAndUsuarioId(regla.cuentaId(),uid).orElseThrow(()->new IllegalArgumentException("Cuenta no disponible."));
            if(!cuenta.isActivo())throw new IllegalArgumentException("La cuenta está desactivada.");
            transacciones.validarListaCaptura(uid,regla.listaId());
            if(regla.categoriaId()!=null) {
                var categoria=categorias.findAccessibleById(regla.categoriaId(),uid).orElseThrow(()->new IllegalArgumentException("Categoría no disponible."));
                if(categoria.getTipo()!=TipoTransaccion.GASTO)throw new IllegalArgumentException("Elige una categoría de gasto.");
            }
        }
        var existente=conexiones.findByUsuarioIdAndDispositivoId(uid,config.dispositivoId().toString());
        if(existente.isEmpty()&&conexiones.countByUsuarioId(uid)>=5)throw new IllegalArgumentException("Desconecta otro dispositivo antes de añadir uno nuevo.");
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);
        String clave=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var conexion=existente.orElseGet(()->ConexionAndroid.builder().id(UUID.randomUUID().toString())
            .usuario(usuario).dispositivoId(config.dispositivoId().toString()).build());
        conexion.setTokenHash(hash(clave));conexion.setTokenVersion(usuario.getTokenVersion());
        conexion.setReglas(json(config.reglas()));conexion.setVence(Instant.now().plus(Duration.ofDays(90)));
        conexiones.saveAndFlush(conexion);
        return new Credencial(conexion.getId(),clave,conexion.getVence(),config.reglas());
    }

    @Transactional(readOnly=true)
    public Estado estado(Long uid,UUID dispositivo) {
        return conexiones.findByUsuarioIdAndDispositivoId(uid,dispositivo.toString())
            .map(c->new Estado(c.getVence().isAfter(Instant.now())&&c.getTokenVersion()==c.getUsuario().getTokenVersion(),c.getVence(),reglas(c)))
            .orElseGet(()->new Estado(false,null,List.of()));
    }
    @Transactional
    public void desconectar(Long uid,UUID dispositivo) {
        propietario(uid);
        conexiones.findByUsuarioIdAndDispositivoId(uid,dispositivo.toString()).ifPresent(conexiones::delete);
    }

    @Transactional
    public AvisoFinancieroService.Vista recibir(String clave,Evento evento) {
        if(clave==null||!clave.matches("[A-Za-z0-9_-]{43}"))throw new SesionInvalidaException();
        String huella=hash(clave);
        var inicial=conexiones.findByTokenHash(huella).orElseThrow(SesionInvalidaException::new);
        var usuario=propietario(inicial.getUsuario().getId());
        // El bloqueo del usuario serializa recepción, rotación de clave y revocación.
        try { em.refresh(inicial); }
        catch(jakarta.persistence.EntityNotFoundException ex) { throw new SesionInvalidaException(); }
        if(!inicial.getTokenHash().equals(huella)||!inicial.getVence().isAfter(Instant.now())
            ||inicial.getTokenVersion()!=usuario.getTokenVersion())throw new SesionInvalidaException();
        limite.comprobar("android:"+inicial.getId(),60,Duration.ofMinutes(1));
        Regla regla=reglas(inicial).stream().filter(r->r.id().equals(evento.reglaId())).findFirst()
            .orElseThrow(()->new IllegalArgumentException("Regla no disponible."));
        if(!Set.of(Clase.COMPRA,Clase.INGRESO,Clase.DEVOLUCION).contains(evento.clase()))
            throw new IllegalArgumentException("Ese movimiento necesita revisión.");
        if("SANTANDER".equals(regla.proveedor())&&evento.clase()!=Clase.COMPRA)
            throw new IllegalArgumentException("Esta conexión de Santander solo admite compras y gastos.");
        var hoy=CalendarioFinanciero.hoy();
        if(evento.fecha().isAfter(hoy)||evento.fecha().isBefore(hoy.minusDays(31)))throw new IllegalArgumentException("La fecha necesita revisión.");
        var cuenta=cuentas.findByIdAndUsuarioId(regla.cuentaId(),usuario.getId()).orElseThrow(()->new IllegalArgumentException("Cuenta no disponible."));
        if(!cuenta.isActivo()||!cuenta.getMoneda().equals(evento.moneda()))throw new IllegalArgumentException("La cuenta o moneda cambió. Revisa el aviso.");
        TipoTransaccion tipo=evento.clase()==Clase.COMPRA?TipoTransaccion.GASTO:TipoTransaccion.INGRESO;
        var datos=new TransaccionRequest(regla.cuentaId(),null,tipo==TipoTransaccion.GASTO?regla.categoriaId():null,
            tipo,evento.monto(),null,evento.fecha(),evento.descripcion(),null,null,null,null,regla.listaId(),List.of());
        Origen origen="SEARS".equals(regla.proveedor())?Origen.SMS:Origen.NOTIFICACION;
        var recibido=avisos.recibir(usuario.getId(),new Nuevo(origen,"android-auto:"+regla.cuentaId()+":"+evento.eventoId(),
            evento.descripcion(),evento.clase(),evento.moneda(),datos,null));
        // No interpretar coincidencia como prueba de duplicación ni registrar dos veces a ciegas.
        if(!"PENDIENTE".equals(recibido.estado())||!recibido.coincidencias().isEmpty())return recibido;
        return avisos.confirmar(usuario.getId(),recibido.id(),new Decision(recibido.version(),false));
    }
}
