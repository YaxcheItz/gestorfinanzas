package com.gestionfinanzas.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gestionfinanzas.dto.request.CategoriaRequest;
import com.gestionfinanzas.dto.request.CuentaRequest;
import com.gestionfinanzas.dto.request.PresupuestoRequest;
import com.gestionfinanzas.dto.request.TransaccionRequest;
import com.gestionfinanzas.dto.response.PlantillaRecurrenteResponse;
import com.gestionfinanzas.dto.response.PresupuestoResponse;
import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.service.CategoriaService;
import com.gestionfinanzas.service.CuentaService;
import com.gestionfinanzas.service.PlantillaRecurrenteService;
import com.gestionfinanzas.service.PresupuestoService;
import com.gestionfinanzas.service.TransaccionService;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.text.Normalizer;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class AiActionService {
    private static final String ACTIONS = """
            CREATE_TRANSACTION, UPDATE_TRANSACTION, DELETE_TRANSACTION,
            CREATE_ACCOUNT, UPDATE_ACCOUNT, DELETE_ACCOUNT, DEACTIVATE_ACCOUNT, REACTIVATE_ACCOUNT,
            CREATE_CATEGORY, UPDATE_CATEGORY, DEACTIVATE_CATEGORY, REACTIVATE_CATEGORY,
            UPSERT_BUDGET, DELETE_BUDGET,
            REGISTER_RECURRING, PAUSE_RECURRING, RESUME_RECURRING, DELETE_RECURRING
            """;
    private static final Pattern REGISTRO_RAPIDO = Pattern.compile(
            "^(?:por favor )?(?:(?:registra|anota|captura) (?:un )?)?(gasto|ingreso|compra|pago|ingres[eé]|recib[ií]|gast[eé]|pagu[eé])(?: de)? \\$?([0-9][0-9.,]*)(?:\\s*(?:mxn|pesos?))?(?: en (.+))?$"
    );

    private final AiProvider provider;
    private final AiFinancialContextService financialContextService;
    private final CuentaService cuentaService;
    private final CategoriaService categoriaService;
    private final PresupuestoService presupuestoService;
    private final TransaccionService transaccionService;
    private final PlantillaRecurrenteService plantillaService;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final PropuestaChatService propuestas;
    private final LimiteIa limiteIa=new LimiteIa(java.time.Clock.systemUTC());

    public AiActionResult interpret(Long userId, String conversation) {
        AiActionResult registroRapido = interpretarRegistroRapido(userId, conversation);
        if (registroRapido != null) {
            return registroRapido;
        }

        limiteIa.consumir(userId);
        String context = financialContextService.buildContext(userId)
                + "\nOpciones concretas para acciones:\n" + buildActionOptions(userId);
        String prompt = """
                Eres el asistente financiero de Kaptal. Responde en español.
                Devuelve exclusivamente un objeto JSON válido con esta forma:
                {"answer":"respuesta breve","action":null,"actions":[],"report":null}
                o, solo cuando el usuario solicite claramente un cambio,
                {"answer":"Explica qué vas a hacer","action":{"type":"ACTION_TYPE","summary":"resumen claro",
                "data":{}},"actions":[],"report":null}.
                Cuando el usuario pida un reporte numérico o una comparación y los datos aparezcan explícitamente
                en el contexto financiero, incluye opcionalmente "report":{"title":"...","labels":["..."],
                "values":[0],"unit":"MXN"}. Cada etiqueta debe corresponder al valor de la misma posición.
                Usa solo valores numéricos presentes en el contexto, máximo 8 pares y nunca inventes ni estimes
                cifras. No incluyas reportes para preguntas sin datos suficientes, cambios o acciones.
                Si el usuario enumera varios ingresos o gastos en un solo mensaje, usa "actions" con una propuesta
                CREATE_TRANSACTION por cada movimiento independiente; nunca los combines en un solo monto. Para una
                lista, cada propuesta debe tener su propio monto, tipo, fecha, cuenta y categoriaId cuando sea claro.
                En "actions" solo propongas CREATE_TRANSACTION. No inventes cuentas ni categorias y conserva dudas
                como preguntas en "answer" en vez de proponer una transaccion ambigua.
                Acciones disponibles: %s.
                No propongas IDs, nombres ni valores que no aparezcan en el contexto o en los datos explícitos del usuario.
                Si falta un dato obligatorio o hay ambigüedad, action debe ser null y pregunta qué dato falta.
                No afirmes que guardaste o cambiaste algo antes de recibir la confirmación.
                Para eliminar, solicita el nombre o movimiento exacto y usa DELETE solo si no hay ambigüedad.
                No elimines cuentas automáticamente: el backend rechazará cuentas con saldo distinto de cero.
                Los pagos de tarjetas se representan como una transferencia a la cuenta de crédito. Las transferencias
                deben incluir cuentaId, cuentaDestinoId, monto, fecha, tipo TRANSFERENCIA y tasaCambio si las monedas difieren.
                Los gastos e ingresos requieren cuentaId, monto, fecha y tipo. CategoriaId es opcional.
                Acciones aceptadas:
                - CREATE_TRANSACTION / UPDATE_TRANSACTION: campos de TransaccionRequest y, para UPDATE, transaccionId.
                - DELETE_TRANSACTION: transaccionId.
                - CREATE_ACCOUNT / UPDATE_ACCOUNT: campos de CuentaRequest y, para UPDATE, cuentaId.
                - DELETE_ACCOUNT / DEACTIVATE_ACCOUNT / REACTIVATE_ACCOUNT: cuentaId.
                - CREATE_CATEGORY / UPDATE_CATEGORY: campos de CategoriaRequest y, para UPDATE, categoriaId.
                - DEACTIVATE_CATEGORY / REACTIVATE_CATEGORY: categoriaId.
                - UPSERT_BUDGET: campos de PresupuestoRequest.
                - DELETE_BUDGET: presupuestoId.
                - REGISTER_RECURRING / PAUSE_RECURRING / RESUME_RECURRING / DELETE_RECURRING:
                  plantillaId; para registrar el siguiente movimiento no se requiere ningún otro campo.
                Datos financieros actuales:
                %s
                Conversación:
                %s
                """.formatted(ACTIONS, context, conversation);

        String generated = provider.generate(prompt, 1200);
        try {
            JsonNode result = objectMapper.readTree(stripCodeFence(generated));
            String answer = result.path("answer").asText("").trim();
            if (answer.isBlank()) {
                throw new AiProviderException("El asistente devolvió una respuesta vacía.");
            }
            // Validar formato, pero nunca convertir cifras del proveedor en un reporte financiero.
            parseReport(result.path("report"));
            AiReportWidget report = null;

            JsonNode actions = result.path("actions");
            if (actions.isArray() && !actions.isEmpty()) {
                if (actions.size() > 8) {
                    throw new AiProviderException("Puedo preparar hasta 8 movimientos por mensaje. Divide la lista y vuelve a intentarlo.");
                }
                List<PendingBatchAction> batch = new ArrayList<>();
                for (JsonNode action : actions) {
                    String type = action.path("type").asText("");
                    String summary = action.path("summary").asText("").trim();
                    JsonNode data = action.path("data");
                    if (!"CREATE_TRANSACTION".equals(type) || summary.isBlank() || !data.isObject()) {
                        throw new AiProviderException("No pude preparar toda la lista con seguridad. Aclara cada monto y movimiento.");
                    }
                    batch.add(new PendingBatchAction(type, summary, data));
                }
                List<ActionProposal> proposals = propuestas.crearLote(userId,batch.stream()
                        .map(item -> new PropuestaChatService.NuevaPropuesta(item.type(),item.summary(),item.data())).toList());
                return new AiActionResult(answer, null, proposals, report);
            }

            JsonNode action = result.path("action");
            if (action.isMissingNode() || action.isNull()) {
                return new AiActionResult(answer, null, List.of(), report);
            }
            String type = action.path("type").asText("");
            String summary = action.path("summary").asText("").trim();
            JsonNode data = action.path("data");
            if (!isSupported(type) || summary.isBlank() || !data.isObject()) {
                return new AiActionResult(answer, null, List.of(), report);
            }

            return crearPropuesta(userId, type, summary, data, answer, report);
        } catch (JsonProcessingException ex) {
            throw new AiProviderException("El asistente devolvió una respuesta con formato inválido.");
        }
    }

    private AiReportWidget parseReport(JsonNode report) {
        if (report == null || report.isMissingNode() || report.isNull()) return null;
        JsonNode title = report.path("title");
        JsonNode labels = report.path("labels");
        JsonNode values = report.path("values");
        JsonNode unit = report.path("unit");
        if (!report.isObject() || !title.isTextual() || title.asText().isBlank()
                || title.asText().length() > 100 || !labels.isArray() || !values.isArray()
                || labels.isEmpty() || labels.size() > 8 || labels.size() != values.size()
                || (!unit.isMissingNode() && !unit.isNull()
                && (!unit.isTextual() || unit.asText().length() > 12))) {
            throw new AiProviderException("El asistente devolvió un reporte con formato inválido.");
        }

        List<String> labelValues = StreamSupport.stream(labels.spliterator(), false)
                .map(label -> label.isTextual() ? label.asText().trim() : "")
                .toList();
        List<Double> numberValues = StreamSupport.stream(values.spliterator(), false)
                .map(value -> value.isNumber() ? value.doubleValue() : Double.NaN)
                .toList();
        if (labelValues.stream().anyMatch(label -> label.isBlank() || label.length() > 60)
                || numberValues.stream().anyMatch(value -> !Double.isFinite(value) || Math.abs(value) > 1.0e15)) {
            throw new AiProviderException("El asistente devolvió datos inválidos para el reporte.");
        }

        return new AiReportWidget(title.asText().trim(), labelValues, numberValues,
                unit.isTextual() ? unit.asText() : "");
    }

    /** Intenta clasificar una captura con reglas locales antes de necesitar consentimiento o proveedor externo. */
    public AiActionResult interpretarCapturaRapida(Long userId, String mensaje) {
        var reglas = new MotorChatReglas().interpretar(mensaje,
                cuentaService.listarCuentas(userId, true), categoriaService.listarCategorias(userId),
                transaccionService.listarRecientes(userId), com.gestionfinanzas.service.CalendarioFinanciero.hoy());
        if (reglas == null) return null;
        if (reglas.reporte() != null) {
            if ("PRESUPUESTOS".equals(reglas.reporte())) {
                var resumen = presupuestoService.obtenerResumenPeriodo(userId, reglas.hasta().getMonthValue(), reglas.hasta().getYear());
                String texto = resumen.presupuestos().stream().filter(p -> reglas.moneda()==null || reglas.moneda().equals(p.moneda()))
                        .map(p -> p.categoriaNombre()+": gastado "+p.montoGastado()+" / l\u00edmite "+p.montoLimite()+" "+p.moneda()+" ("+p.estado()+")")
                        .collect(java.util.stream.Collectors.joining("\n"));
                return new AiActionResult("Presupuestos de "+reglas.hasta().getMonthValue()+"/"+reglas.hasta().getYear()+"\n"+(texto.isBlank()?"No hay presupuestos para esa moneda y mes.":texto), null);
            }
            if ("RECURRENTES".equals(reglas.reporte())) {
                String texto = plantillaService.listar(userId).stream().filter(p -> p.activa() && (reglas.moneda()==null || reglas.moneda().equals(p.moneda())))
                        .map(p -> p.categoriaNombre()+": "+p.monto()+" "+p.moneda()+"; pr\u00f3ximo: "+p.siguienteFecha())
                        .collect(java.util.stream.Collectors.joining("\n"));
                return new AiActionResult(texto.isBlank()?"No hay movimientos recurrentes activos.":"Movimientos recurrentes:\n"+texto, null);
            }
            return financialContextService.reporteLocal(userId, reglas.reporte(), reglas.desde(), reglas.hasta(), reglas.moneda());
        }
        if (reglas.datos() == null) return new AiActionResult(reglas.respuesta(), null, List.of(), null, reglas.sugerencias(), reglas.contexto());
        return crearPropuesta(userId, "CREATE_TRANSACTION", reglas.respuesta(), objectMapper.valueToTree(reglas.datos()),
                "Revisa los datos. Todav\u00eda no se ha guardado el movimiento; se interpret\u00f3 con reglas y tu historial.");
    }

    /** Resuelve comandos sencillos con un diccionario local y sin enviar el mensaje al proveedor de IA. */
    private AiActionResult interpretarRegistroRapido(Long userId, String conversation) {
        if (conversation == null) return null;
        int inicioMensaje = conversation.lastIndexOf("Usuario:");
        if (inicioMensaje < 0) return null;
        String mensaje = conversation.substring(inicioMensaje + "Usuario:".length()).strip();
        return interpretarMensajeRapido(userId, mensaje);
    }

    private AiActionResult interpretarMensajeRapido(Long userId, String mensaje) {
        if (mensaje == null) return null;
        String frase = normalizar(mensaje);
        Matcher matcher = REGISTRO_RAPIDO.matcher(frase);
        if (!matcher.matches()) return null;

        String verbo = matcher.group(1);
        TipoTransaccion tipo = List.of("ingreso", "ingrese", "recibi").contains(verbo)
                ? TipoTransaccion.INGRESO : TipoTransaccion.GASTO;
        BigDecimal monto;
        try {
            monto = interpretarMonto(matcher.group(2));
        } catch (NumberFormatException | ArithmeticException ex) {
            return null;
        }
        if (monto.compareTo(BigDecimal.ZERO) <= 0) return null;

        List<CuentaResponse> cuentas = cuentaService.listarCuentas(userId, true).stream()
                .filter(CuentaResponse::activo)
                .toList();
        // Si la cuenta no se puede resolver sin ambigüedad, dejamos que el asistente pregunte.
        if (cuentas.size() != 1) return null;
        CuentaResponse cuenta = cuentas.get(0);

        String concepto = matcher.group(3) == null ? "" : matcher.group(3).strip();
        LocalDate fecha = com.gestionfinanzas.service.CalendarioFinanciero.hoy();
        String conceptoNormalizado = normalizar(concepto);
        if (conceptoNormalizado.endsWith(" ayer")) {
            fecha = fecha.minusDays(1);
            concepto = concepto.substring(0, concepto.length() - " ayer".length()).strip();
            conceptoNormalizado = normalizar(concepto);
        } else if (conceptoNormalizado.endsWith(" hoy")) {
            concepto = concepto.substring(0, concepto.length() - " hoy".length()).strip();
            conceptoNormalizado = normalizar(concepto);
        }

        String claveCategoria = conceptoNormalizado;
        Map<String, List<String>> alias = Map.ofEntries(
                Map.entry("supermercado", List.of("super", "supermercado", "despensa", "abarrotes")),
                Map.entry("alimentos", List.of("super", "supermercado", "despensa", "abarrotes")),
                Map.entry("alimentacion", List.of("super", "supermercado", "despensa", "abarrotes")),
                Map.entry("transporte", List.of("taxi", "uber", "didi", "gasolina", "metro", "camion")),
                Map.entry("comida", List.of("restaurante", "comida", "cafe", "cafeteria", "comida rapida")),
                Map.entry("hogar", List.of("renta", "luz", "agua", "internet", "hogar")),
                Map.entry("servicios", List.of("luz", "agua", "internet", "telefono", "gas")),
                Map.entry("salud", List.of("farmacia", "doctor", "medicina", "salud")),
                Map.entry("entretenimiento", List.of("cine", "netflix", "spotify", "entretenimiento")),
                Map.entry("salario", List.of("salario", "nomina", "sueldo")),
                Map.entry("ingresos", List.of("salario", "nomina", "sueldo")));
        CategoriaResponse categoria = claveCategoria.isBlank() ? null
                : categoriaService.listarCategorias(userId).stream()
                .filter(CategoriaResponse::activo)
                .filter(opcion -> opcion.tipo() == tipo)
                .filter(opcion -> {
                    String nombre = normalizar(opcion.nombre());
                    return nombre.equals(claveCategoria) || claveCategoria.contains(nombre)
                            || alias.entrySet().stream().anyMatch(entry -> entry.getValue().stream()
                            .anyMatch(palabra -> claveCategoria.contains(palabra)) && nombre.contains(entry.getKey()));
                })
                .findFirst().orElse(null);

        String descripcion = concepto.isBlank()
                ? (tipo == TipoTransaccion.GASTO ? "Gasto" : "Ingreso")
                : concepto;
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("cuentaId", cuenta.id());
        datos.put("categoriaId", categoria == null ? null : categoria.id());
        datos.put("tipo", tipo.name());
        datos.put("monto", monto);
        datos.put("fecha", fecha.toString());
        datos.put("descripcion", descripcion);
        String resumen = (tipo == TipoTransaccion.GASTO ? "Registrar gasto" : "Registrar ingreso")
                + " de " + monto.toPlainString() + " " + cuenta.moneda()
                + (categoria == null ? "" : " en " + categoria.nombre())
                + " desde " + cuenta.nombre() + " para el " + fecha;
        JsonNode propuesta = objectMapper.valueToTree(datos);
        return crearPropuesta(userId, "CREATE_TRANSACTION", resumen, propuesta,
                "Preparé el movimiento con tus datos y sin llamar a un proveedor de IA. Revisa la propuesta antes de confirmarla.");
    }

    private BigDecimal interpretarMonto(String texto) {
        String monto = texto;
        int ultimaComa = monto.lastIndexOf(',');
        int ultimoPunto = monto.lastIndexOf('.');
        if (ultimaComa >= 0 && ultimoPunto >= 0) {
            monto = monto.replace(",", "");
        } else if (ultimaComa >= 0) {
            int decimales = monto.length() - ultimaComa - 1;
            monto = decimales > 0 && decimales <= 2
                    ? monto.replace(',', '.')
                    : monto.replace(",", "");
        }
        return new BigDecimal(monto).setScale(2, java.math.RoundingMode.UNNECESSARY);
    }

    private String normalizar(String valor) {
        return Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(java.util.Locale.ROOT)
                .strip();
    }

    private AiActionResult crearPropuesta(Long userId, String type, String summary, JsonNode data, String answer) {
        return crearPropuesta(userId, type, summary, data, answer, null);
    }

    private AiActionResult crearPropuesta(Long userId, String type, String summary, JsonNode data, String answer, AiReportWidget report) {
        JsonNode actionData = data.deepCopy();
        var propuesta=propuestas.crear(userId,type,summary,actionData);
        return new AiActionResult(answer, propuestas.dto(propuesta), List.of(), report);
    }

    @Transactional
    public void marcarCapturaPorVoz(Long userId, ActionProposal proposal) {
        if (proposal == null || !"CREATE_TRANSACTION".equals(proposal.type())) return;
        var pendiente=propuestas.bloquear(userId,proposal.id());
        propuestas.exigirPendiente(pendiente);
        ObjectNode data=(ObjectNode) propuestas.datos(pendiente);
        data.put("metodoCaptura","VOZ"); pendiente.setDatos(data.toString());
    }

    @Transactional
    public String confirm(Long userId, String proposalId) {
        return confirm(userId,proposalId,null);
    }

    @Transactional
    public String confirm(Long userId,String proposalId,Long version) {
        var pending=propuestas.bloquear(userId,proposalId);
        if (pending.isCompletada()) return "Listo. " + pending.getResumen();
        propuestas.exigirPendiente(pending);
        comprobarVersion(pending,version);
        execute(userId,pending.getTipo(),propuestas.datos(pending));
        pending.setCompletada(true);
        return "Listo. " + pending.getResumen();
    }

    public List<ActionProposal> pendientes(Long userId) {
        return propuestas.pendientes(userId).stream().map(propuestas::dto).toList();
    }

    @Transactional
    public void descartar(Long userId,String id) {
        var p=propuestas.bloquear(userId,id);
        if (p.isCompletada()) throw new IllegalArgumentException("El movimiento ya está guardado; descartar no lo elimina.");
        p.setDescartada(true);
    }

    @Transactional
    public ActionProposal editar(Long userId,String id,Long version,TransaccionRequest request) {
        var p=propuestas.bloquear(userId,id); propuestas.exigirPendiente(p); comprobarVersion(p,version);
        if (!"CREATE_TRANSACTION".equals(p.getTipo())) throw new IllegalArgumentException("Solo puedes editar movimientos nuevos aquí.");
        validarSolicitud(request);
        var cuentas=cuentaService.listarCuentas(userId,true);
        if (cuentas.stream().noneMatch(c -> c.id().equals(request.cuentaId()) && c.activo())
            || (request.cuentaDestinoId()!=null && cuentas.stream().noneMatch(c -> c.id().equals(request.cuentaDestinoId()) && c.activo())))
            throw new IllegalArgumentException("Elige una cuenta activa propia.");
        if (request.categoriaId()!=null && categoriaService.listarCategorias(userId).stream().noneMatch(c -> c.id().equals(request.categoriaId()) && c.activo() && c.tipo().name().equals(request.tipo().name())))
            throw new IllegalArgumentException("Elige una categoría compatible propia.");
        ObjectNode data=objectMapper.valueToTree(request);
        data.put("metodoCaptura",propuestas.datos(p).path("metodoCaptura").asText("TEXTO"));
        p.setDatos(data.toString());
        p.setResumen(request.tipo()+" de "+request.monto().toPlainString()+" · "+request.fecha()+(request.descripcion()==null ? "" : " · "+request.descripcion()));
        return propuestas.guardar(p);
    }

    private void comprobarVersion(com.gestionfinanzas.model.entity.PropuestaChat p,Long version) {
        if (version!=null && !version.equals(p.getVersion())) throw new IllegalArgumentException("La propuesta cambió. Recupera la versión actual antes de confirmar.");
    }

    private <T> void validarSolicitud(T request) {
        var violations=validator.validate(request);
        if (!violations.isEmpty()) throw new IllegalArgumentException(violations.iterator().next().getMessage());
    }

    private String buildActionOptions(Long userId) {
        try {
            Map<String, Object> options = Map.of(
                    "accounts", cuentaService.listarCuentas(userId, true).stream()
                            .map(account -> Map.of(
                                    "id", account.id(), "name", account.nombre(), "type", account.tipo(),
                                    "currency", account.moneda(), "balance", account.saldoActual(), "active", account.activo()
                            )).toList(),
                    "categories", categoriaService.listarCategorias(userId).stream()
                            .map(category -> Map.of(
                                    "id", category.id(), "name", category.nombre(), "type", category.tipo(),
                                    "custom", category.esPersonalizada()
                            )).toList(),
                    "recentTransactions", transaccionService.listarRecientes(userId).stream()
                            .map(transaction -> nullableMap(
                                    "id", transaction.id(), "date", transaction.fecha(), "type", transaction.tipo(),
                                    "amount", transaction.monto(), "currency", transaction.moneda(),
                                    "description", transaction.descripcion(), "account", transaction.cuentaNombre()
                            )).toList(),
                    "budgetsThisMonth", presupuestoService.obtenerResumenPeriodo(userId, null, null)
                            .presupuestos().stream().map(this::budgetOption).toList(),
                    "recurringTemplates", plantillaService.listar(userId).stream()
                            .map(this::recurringOption).toList()
            );
            return objectMapper.writeValueAsString(options);
        } catch (JsonProcessingException ex) {
            throw new AiProviderException("No fue posible cargar las opciones del asistente.");
        }
    }

    private Map<String, Object> budgetOption(PresupuestoResponse budget) {
        return nullableMap(
                "id", budget.id(), "category", budget.categoriaNombre(), "limit", budget.montoLimite(),
                "currency", budget.moneda(), "month", budget.mes(), "year", budget.anio()
        );
    }

    private Map<String, Object> recurringOption(PlantillaRecurrenteResponse template) {
        return nullableMap(
                "id", template.id(), "account", template.cuentaNombre(), "category", template.categoriaNombre(),
                "type", template.tipo(), "amount", template.monto(), "currency", template.moneda(),
                "nextDate", template.siguienteFecha(), "active", template.activa()
        );
    }

    private Map<String, Object> nullableMap(Object... entries) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int index = 0; index < entries.length; index += 2) {
            map.put((String) entries[index], entries[index + 1]);
        }
        return map;
    }

    private void execute(Long userId, String type, JsonNode data) {
        switch (type) {
            case "CREATE_TRANSACTION" -> {
                if ("VOZ".equals(data.path("metodoCaptura").asText())) {
                    transaccionService.crearTransaccion(userId,
                            readWithout(data, TransaccionRequest.class, "metodoCaptura"), null,
                            com.gestionfinanzas.model.enums.MetodoCaptura.VOZ);
                } else {
                    transaccionService.crearTransaccion(userId,
                            readWithout(data, TransaccionRequest.class, "metodoCaptura"));
                }
            }
            case "UPDATE_TRANSACTION" ->
                    transaccionService.actualizarTransaccion(userId, requiredId(data, "transaccionId"),
                            readWithout(data, TransaccionRequest.class, "transaccionId"));
            case "DELETE_TRANSACTION" ->
                    transaccionService.eliminarTransaccion(userId, requiredId(data, "transaccionId"));
            case "CREATE_ACCOUNT" ->
                    cuentaService.crearCuenta(userId, read(data, CuentaRequest.class));
            case "UPDATE_ACCOUNT" ->
                    cuentaService.actualizarCuenta(userId, requiredId(data, "cuentaId"),
                            readWithout(data, CuentaRequest.class, "cuentaId"));
            case "DELETE_ACCOUNT" ->
                    cuentaService.eliminarCuenta(userId, requiredId(data, "cuentaId"));
            case "DEACTIVATE_ACCOUNT" ->
                    cuentaService.desactivarCuenta(userId, requiredId(data, "cuentaId"));
            case "REACTIVATE_ACCOUNT" ->
                    cuentaService.reactivarCuenta(userId, requiredId(data, "cuentaId"));
            case "CREATE_CATEGORY" ->
                    categoriaService.crearCategoria(userId, read(data, CategoriaRequest.class));
            case "UPDATE_CATEGORY" ->
                    categoriaService.actualizarCategoria(userId, requiredId(data, "categoriaId"),
                            readWithout(data, CategoriaRequest.class, "categoriaId"));
            case "DEACTIVATE_CATEGORY" ->
                    categoriaService.cambiarEstadoCategoria(userId, requiredId(data, "categoriaId"), false);
            case "REACTIVATE_CATEGORY" ->
                    categoriaService.cambiarEstadoCategoria(userId, requiredId(data, "categoriaId"), true);
            case "UPSERT_BUDGET" ->
                    presupuestoService.crearOActualizarPresupuesto(userId, read(data, PresupuestoRequest.class));
            case "DELETE_BUDGET" ->
                    presupuestoService.eliminarPresupuesto(userId, requiredId(data, "presupuestoId"));
            case "REGISTER_RECURRING" ->
                    plantillaService.registrarSiguiente(userId, requiredId(data, "plantillaId"));
            case "PAUSE_RECURRING" ->
                    plantillaService.cambiarEstado(userId, requiredId(data, "plantillaId"), false);
            case "RESUME_RECURRING" ->
                    plantillaService.cambiarEstado(userId, requiredId(data, "plantillaId"), true);
            case "DELETE_RECURRING" ->
                    plantillaService.eliminar(userId, requiredId(data, "plantillaId"));
            default -> throw new IllegalArgumentException("Esta acción no está disponible.");
        }
    }

    private <T> T read(JsonNode data, Class<T> type) {
        try {
            T request = objectMapper.treeToValue(data, type);
            var violations = validator.validate(request);
            if (!violations.isEmpty()) {
                String details = violations.stream()
                        .map(violation -> violation.getMessage())
                        .distinct()
                        .collect(java.util.stream.Collectors.joining("; "));
                throw new IllegalArgumentException("La propuesta no cumple las validaciones: " + details);
            }
            return request;
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("La propuesta contiene datos incompletos o inválidos.");
        }
    }

    private <T> T readWithout(JsonNode data, Class<T> type, String ignoredField) {
        if (!(data instanceof ObjectNode request)) {
            throw new IllegalArgumentException("La propuesta contiene datos inválidos.");
        }
        JsonNode requestData = request.deepCopy();
        ((ObjectNode) requestData).remove(ignoredField);
        return read(requestData, type);
    }

    private Long requiredId(JsonNode data, String field) {
        JsonNode value = data.path(field);
        if (!value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("La propuesta no identifica un elemento válido.");
        }
        return value.longValue();
    }

    private boolean isSupported(String type) {
        return switch (type) {
            case "CREATE_TRANSACTION", "UPDATE_TRANSACTION", "DELETE_TRANSACTION",
                    "CREATE_ACCOUNT", "UPDATE_ACCOUNT", "DELETE_ACCOUNT", "DEACTIVATE_ACCOUNT", "REACTIVATE_ACCOUNT",
                    "CREATE_CATEGORY", "UPDATE_CATEGORY", "DEACTIVATE_CATEGORY", "REACTIVATE_CATEGORY",
                    "UPSERT_BUDGET", "DELETE_BUDGET",
                    "REGISTER_RECURRING", "PAUSE_RECURRING", "RESUME_RECURRING", "DELETE_RECURRING" -> true;
            default -> false;
        };
    }

    private String stripCodeFence(String response) {
        String value = response.trim();
        if (value.startsWith("```")) {
            int firstLineEnd = value.indexOf('\n');
            int lastFence = value.lastIndexOf("```");
            if (firstLineEnd >= 0 && lastFence > firstLineEnd) {
                return value.substring(firstLineEnd + 1, lastFence).trim();
            }
        }
        return value;
    }

    public record ActionProposal(String id, String type, String summary, JsonNode data,Long version) {
        public ActionProposal(String id,String type,String summary,JsonNode data) { this(id,type,summary,data,0L); }
    }
    private record PendingBatchAction(String type, String summary, JsonNode data) {}

    public record AiActionResult(String answer, ActionProposal action, List<ActionProposal> actions, AiReportWidget report, List<String> suggestions, String contexto) {
        public AiActionResult(String answer, ActionProposal action, List<ActionProposal> actions, AiReportWidget report) {
            this(answer, action, actions, report, List.of(), null);
        }
        public AiActionResult(String answer, ActionProposal action) {
            this(answer, action, action == null ? List.of() : List.of(action), null);
        }

        public AiActionResult(String answer, ActionProposal action, List<ActionProposal> actions) {
            this(answer, action, actions, null);
        }
    }

    public record AiReportWidget(String title, List<String> labels, List<Double> values, String unit) {}
}
