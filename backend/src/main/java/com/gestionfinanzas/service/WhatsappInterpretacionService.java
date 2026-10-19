package com.gestionfinanzas.service;

import com.gestionfinanzas.ai.*;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

import com.gestionfinanzas.controller.WhatsappConsultaController.Respuesta;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class WhatsappInterpretacionService {
    private final CuentaService cuentas;
    private final CategoriaService categorias;
    private final TransaccionService movimientos;
    private final AiActionService acciones;
    private final ObjectMapper mapper;
    private final com.gestionfinanzas.security.LimiteAbuso limite;
    @Transactional(readOnly=true)
    public ApiResponse<Respuesta> interpretar(Long usuarioId,String mensaje) {
        limite.comprobar("whatsapp-consulta:"+usuarioId,60,java.time.Duration.ofMinutes(1));
        var catalogo=cuentas.listarCuentas(usuarioId,true);
        String texto=mensaje;
        String normal=MotorChatReglas.normalizar(texto).replaceAll("[¿?¡!]","");
        if(normal.matches(".*\\b(devolucion|devolvieron|reembolso|autorizacion|pago de tarjeta)\\b.*")) {
            return ApiResponse.ok("Revisa el tipo de movimiento",new Respuesta("ACLARACION","Las devoluciones, autorizaciones y pagos de tarjeta necesitan revisar el tipo. Registralos en Kaptal; no los guardare como compras.",null,null,null,List.of(),null,null));
        }
        if(java.util.Set.of("cuanto tengo en todas mis cuentas","cuanto tengo en mis cuentas","mis cuentas","cuentas","que cuentas tengo","muestra mis cuentas","saldo de todas mis cuentas").contains(normal)) texto="saldo";
        if(!texto.equals("saldo")) {
            var filtro=java.util.regex.Pattern.compile("^(?:saldo(?: actual)?(?: de| en)?|cuanto tengo(?: en)?) (.+)$").matcher(normal);
            if(filtro.matches()) {
                String nombre=filtro.group(1);
                var elegidas=catalogo.stream().filter(c->c.activo()&&MotorChatReglas.normalizar(c.nombre()).equals(nombre)).toList();
                if(elegidas.size()!=1) return ApiResponse.ok("Aclara la cuenta",new Respuesta("ACLARACION","Indica el nombre exacto de una cuenta activa o pide saldo para ver todas.",null,null,null,List.of(),null,null));
                var c=elegidas.get(0);
                return ApiResponse.ok("Saldo actual",new Respuesta("CONSULTA",c.nombre()+": "+c.saldoActual().toPlainString()+" "+c.moneda()+" (saldo actual, no del periodo)",null,c.moneda(),null,List.of(),null,null));
            }
        }
        if(java.util.Set.of("ultimos movimientos","mis ultimos movimientos","historial","movimientos recientes").contains(normal)) {
            String recientes=movimientos.listarRecientes(usuarioId).stream().map(t->t.fecha()+" · "+t.descripcion()+" · "+t.monto().toPlainString()+" "+t.moneda()+" · "+t.tipo()).collect(java.util.stream.Collectors.joining("\n"));
            return ApiResponse.ok("Consulta calculada",new Respuesta("CONSULTA",recientes.isEmpty()?"No hay movimientos recientes.":"Movimientos recientes (no es todo el historial):\n"+recientes,null,null,null,List.of(),null,null));
        }
        var reglas=new MotorChatReglas().interpretar(texto,catalogo,categorias.listarCategorias(usuarioId),
            movimientos.listarRecientes(usuarioId),CalendarioFinanciero.hoy(),true);
        if(reglas==null) return ApiResponse.ok("Necesito más detalle",new Respuesta("ACLARACION",
            "No pude resolverlo con seguridad. Puedes pedir saldo, resumen de este mes, categorías, presupuestos o escribir: gasté 180 en comida con Nombre de cuenta.",null,null,null,List.of(),null,null));
        if(reglas.reporte()!=null) {
            var reporte=acciones.resolverReporteLocal(usuarioId,reglas);
            return ApiResponse.ok("Consulta calculada",new Respuesta("CONSULTA",reporte.answer(),null,reglas.moneda(),null,List.of(),reglas.desde(),reglas.hasta()));
        }
        if(reglas.datos()==null) return ApiResponse.ok("Aclara el movimiento",new Respuesta("ACLARACION",reglas.respuesta(),null,null,reglas.contexto(),reglas.sugerencias(),null,null));
        var datos=mapper.convertValue(reglas.datos(),TransaccionRequest.class);
        var cuenta=catalogo.stream().filter(c->c.id().equals(datos.cuentaId())).findFirst().orElseThrow();
        return ApiResponse.ok("Movimiento interpretado sin guardar",new Respuesta("PROPUESTA",reglas.respuesta(),datos,cuenta.moneda(),null,List.of(),null,null));
    }
}
