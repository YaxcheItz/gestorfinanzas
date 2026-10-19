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

import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.Optional;

@Service @RequiredArgsConstructor
public class WhatsappInterpretacionService {
    private final CuentaService cuentas;
    private final CategoriaService categorias;
    private final TransaccionService movimientos;
    private final AiActionService acciones;
    private final ObjectMapper mapper;
    private final com.gestionfinanzas.security.LimiteAbuso limite;
    private final AiProvider aiProvider;
    private final Validator validator;

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
        if(reglas==null) {
            return interpretarConIaFallback(usuarioId, texto, catalogo);
        }
        if(reglas.reporte()!=null) {
            var reporte=acciones.resolverReporteLocal(usuarioId,reglas);
            return ApiResponse.ok("Consulta calculada",new Respuesta("CONSULTA",reporte.answer(),null,reglas.moneda(),null,List.of(),reglas.desde(),reglas.hasta()));
        }
        if(reglas.datos()==null) return ApiResponse.ok("Aclara el movimiento",new Respuesta("ACLARACION",reglas.respuesta(),null,null,reglas.contexto(),reglas.sugerencias(),null,null));
        var datos=mapper.convertValue(reglas.datos(),TransaccionRequest.class);
        var cuenta=catalogo.stream().filter(c->c.id().equals(datos.cuentaId())).findFirst().orElseThrow();
        return ApiResponse.ok("Movimiento interpretado sin guardar",new Respuesta("PROPUESTA",reglas.respuesta(),datos,cuenta.moneda(),null,List.of(),null,null));
    }

    ApiResponse<Respuesta> interpretarConIaFallback(Long usuarioId, String texto, List<CuentaResponse> catalogo) {
        if (aiProvider == null || !aiProvider.isConfigured()) {
            return respuestaAclaracionDefault();
        }
        try {
            limite.comprobar("ia:" + usuarioId, 15, java.time.Duration.ofMinutes(1));
            var categoriasList = categorias.listarCategorias(usuarioId);

            String cuentasJson = catalogo.stream()
                .filter(CuentaResponse::activo)
                .map(c -> "{\"id\":" + c.id() + ",\"nombre\":\"" + escapeJson(c.nombre()) + "\",\"moneda\":\"" + escapeJson(c.moneda()) + "\"}")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));

            String categoriasJson = categoriasList.stream()
                .filter(com.gestionfinanzas.dto.response.CategoriaResponse::activo)
                .map(c -> "{\"id\":" + c.id() + ",\"nombre\":\"" + escapeJson(c.nombre()) + "\"}")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));

            LocalDate hoy = CalendarioFinanciero.hoy();

            String prompt = """
                Eres el intérprete contable de Kaptal para WhatsApp. Tu tarea es extraer la intención financiera del mensaje.
                Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin explicaciones ni markdown:
                {
                  "entendido": true,
                  "tipo": "GASTO",
                  "monto": 123.45,
                  "descripcion": "concepto breve",
                  "fecha": "YYYY-MM-DD",
                  "cuentaId": 1,
                  "cuentaDestinoId": null,
                  "categoriaId": 1,
                  "respuesta": "resumen para el usuario",
                  "duda": null
                }

                Reglas obligatorias:
                1. Solo marca entendido=true si hay un monto y un concepto financiero claro (gasto, ingreso o transferencia).
                2. Si el usuario menciona una cuenta por nombre o apodo, asocia su "id" exacto de la lista de Cuentas. Si no la menciona o hay duda, pon cuentaId=null y en "duda" pregunta desde qué cuenta.
                3. Si el usuario menciona una categoría de la lista, asocia su "id", si no pon categoriaId=null.
                4. La fecha debe ser YYYY-MM-DD. Si dice "ayer", réstale 1 día a hoy. Si no especifica fecha, usa la fecha de hoy.
                5. Para transferencias entre cuentas propias, tipo="TRANSFERENCIA", cuentaId=origen y cuentaDestinoId=destino.
                6. NUNCA inventes IDs que no existan en las listas. Si no hay datos suficientes, entendido=false.

                Fecha de hoy: %s
                Cuentas activas: %s
                Categorías activas: %s

                Mensaje: %s
                """.formatted(hoy, cuentasJson, categoriasJson, texto);

            String generated = aiProvider.generate(prompt, 600);
            if (generated == null || generated.isBlank()) {
                return respuestaAclaracionDefault();
            }

            String jsonText = generated.trim();
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replaceFirst("^```[a-zA-Z]*\\s*", "").replaceFirst("\\s*```$", "").trim();
            }

            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(jsonText);
            boolean entendido = root.path("entendido").asBoolean(false);
            if (!entendido) {
                String duda = root.path("duda").asText("").trim();
                if (duda.isBlank()) duda = root.path("respuesta").asText("").trim();
                if (duda.isBlank()) return respuestaAclaracionDefault();
                return ApiResponse.ok("Aclara el movimiento", new Respuesta("ACLARACION", duda, null, null, null, List.of(), null, null));
            }

            BigDecimal monto = root.hasNonNull("monto") ? BigDecimal.valueOf(root.path("monto").asDouble()).setScale(2, java.math.RoundingMode.HALF_UP) : null;
            if (monto == null || monto.compareTo(new BigDecimal("0.01")) < 0) {
                return respuestaAclaracionDefault();
            }

            String desc = root.path("descripcion").asText("").trim();
            if (desc.isBlank()) desc = texto.length() > 50 ? texto.substring(0, 50) : texto;

            String fechaStr = root.path("fecha").asText(hoy.toString());
            LocalDate fecha;
            try {
                fecha = LocalDate.parse(fechaStr);
            } catch (Exception ex) {
                fecha = hoy;
            }

            String tipoStr = root.path("tipo").asText("GASTO").toUpperCase();
            TipoTransaccion tipo = switch (tipoStr) {
                case "INGRESO" -> TipoTransaccion.INGRESO;
                case "TRANSFERENCIA" -> TipoTransaccion.TRANSFERENCIA;
                default -> TipoTransaccion.GASTO;
            };

            Long cuentaId = root.hasNonNull("cuentaId") ? root.path("cuentaId").asLong() : null;
            Long cuentaDestinoId = root.hasNonNull("cuentaDestinoId") ? root.path("cuentaDestinoId").asLong() : null;
            Long rawCategoriaId = root.hasNonNull("categoriaId") ? root.path("categoriaId").asLong() : null;
            Long categoriaId = (rawCategoriaId != null && categoriasList.stream().anyMatch(c -> c.activo() && c.id().equals(rawCategoriaId)))
                    ? rawCategoriaId
                    : null;

            var cuentaOpt = (cuentaId != null) ? catalogo.stream().filter(c -> c.activo() && c.id().equals(cuentaId)).findFirst() : Optional.<CuentaResponse>empty();

            if (cuentaOpt.isEmpty()) {
                String tipoNombre = (tipo == TipoTransaccion.INGRESO) ? "ingreso" : (tipo == TipoTransaccion.TRANSFERENCIA ? "transferencia" : "gasto");
                String contexto = tipoNombre + " " + monto + " en " + desc + " fecha " + fecha;
                List<String> sugerencias = catalogo.stream().filter(CuentaResponse::activo).map(CuentaResponse::nombre).toList();
                String respuesta = "¿Desde qué cuenta registramos este " + tipoNombre + " de $" + monto + "?";
                return ApiResponse.ok("Aclara la cuenta", new Respuesta("ACLARACION", respuesta, null, null, contexto, sugerencias, null, null));
            }

            var cuenta = cuentaOpt.get();

            if (tipo == TipoTransaccion.TRANSFERENCIA) {
                var destOpt = (cuentaDestinoId != null) ? catalogo.stream().filter(c -> c.activo() && c.id().equals(cuentaDestinoId)).findFirst() : Optional.<CuentaResponse>empty();
                if (destOpt.isEmpty() || destOpt.get().id().equals(cuenta.id())) {
                    String contexto = "transferencia " + monto + " desde " + cuenta.nombre();
                    List<String> sugerencias = catalogo.stream().filter(c -> c.activo() && !c.id().equals(cuenta.id())).map(CuentaResponse::nombre).toList();
                    return ApiResponse.ok("Aclara la cuenta destino", new Respuesta("ACLARACION", "¿A qué cuenta transferiste los $" + monto + "?", null, null, contexto, sugerencias, null, null));
                }
            }


            TransaccionRequest datos = new TransaccionRequest(
                cuenta.id(),
                tipo == TipoTransaccion.TRANSFERENCIA ? cuentaDestinoId : null,
                categoriaId,
                tipo,
                monto,
                null,
                fecha,
                desc.length() > 200 ? desc.substring(0, 200) : desc,
                null,
                null,
                null,
                null
            );

            if (validator != null && !validator.validate(datos).isEmpty()) {
                return respuestaAclaracionDefault();
            }

            String resumen = root.path("respuesta").asText("").trim();
            if (resumen.isBlank()) {
                resumen = (tipo == TipoTransaccion.INGRESO ? "Ingreso" : (tipo == TipoTransaccion.TRANSFERENCIA ? "Transferencia" : "Gasto"))
                        + " de " + monto + " " + cuenta.moneda() + " en " + desc + " con " + cuenta.nombre();
            }

            return ApiResponse.ok("Movimiento interpretado sin guardar", new Respuesta("PROPUESTA", resumen, datos, cuenta.moneda(), null, List.of(), null, null));
        } catch (Exception ex) {
            return respuestaAclaracionDefault();
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }

    private ApiResponse<Respuesta> respuestaAclaracionDefault() {
        return ApiResponse.ok("Necesito más detalle", new Respuesta("ACLARACION",
            "No pude resolverlo con seguridad. Puedes pedir saldo, resumen de este mes, categorías, presupuestos o escribir: gasté 180 en comida con Nombre de cuenta.", null, null, null, List.of(), null, null));
    }
}
