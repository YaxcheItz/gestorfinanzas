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
import com.gestionfinanzas.service.CategoriaService;
import com.gestionfinanzas.service.CuentaService;
import com.gestionfinanzas.service.PlantillaRecurrenteService;
import com.gestionfinanzas.service.PresupuestoService;
import com.gestionfinanzas.service.TransaccionService;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AiActionService {
    private static final long PROPOSAL_LIFETIME_SECONDS = 600;
    private static final String ACTIONS = """
            CREATE_TRANSACTION, UPDATE_TRANSACTION, DELETE_TRANSACTION,
            CREATE_ACCOUNT, UPDATE_ACCOUNT, DELETE_ACCOUNT, DEACTIVATE_ACCOUNT, REACTIVATE_ACCOUNT,
            CREATE_CATEGORY, UPDATE_CATEGORY, DEACTIVATE_CATEGORY, REACTIVATE_CATEGORY,
            UPSERT_BUDGET, DELETE_BUDGET,
            REGISTER_RECURRING, PAUSE_RECURRING, RESUME_RECURRING, DELETE_RECURRING
            """;

    private final AiProvider provider;
    private final AiFinancialContextService financialContextService;
    private final CuentaService cuentaService;
    private final CategoriaService categoriaService;
    private final PresupuestoService presupuestoService;
    private final TransaccionService transaccionService;
    private final PlantillaRecurrenteService plantillaService;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final Map<String, PendingAction> pendingActions = new ConcurrentHashMap<>();

    public AiActionResult interpret(Long userId, String conversation) {
        String context = financialContextService.buildContext(userId)
                + "\nOpciones concretas para acciones:\n" + buildActionOptions(userId);
        String prompt = """
                Eres el asistente financiero de Kaptal. Responde en español.
                Devuelve exclusivamente un objeto JSON válido con esta forma:
                {"answer":"respuesta breve","action":null}
                o, solo cuando el usuario solicite claramente un cambio,
                {"answer":"Explica qué vas a hacer","action":{"type":"ACTION_TYPE","summary":"resumen claro",
                "data":{}}}.
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

            JsonNode action = result.path("action");
            if (action.isMissingNode() || action.isNull()) {
                return new AiActionResult(answer, null);
            }
            String type = action.path("type").asText("");
            String summary = action.path("summary").asText("").trim();
            JsonNode data = action.path("data");
            if (!isSupported(type) || summary.isBlank() || !data.isObject()) {
                return new AiActionResult(answer, null);
            }

            removeExpiredActions();
            String id = UUID.randomUUID().toString();
            JsonNode actionData = data.deepCopy();
            pendingActions.put(id, new PendingAction(userId, type, summary, actionData,
                    Instant.now().plusSeconds(PROPOSAL_LIFETIME_SECONDS)));
            return new AiActionResult(answer, new ActionProposal(id, type, summary, actionData.deepCopy()));
        } catch (JsonProcessingException ex) {
            throw new AiProviderException("El asistente devolvió una respuesta con formato inválido.");
        }
    }

    @Transactional
    public String confirm(Long userId, String proposalId) {
        PendingAction pending = pendingActions.remove(proposalId);
        if (pending == null || pending.expiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("La propuesta venció o ya fue procesada. Pide una nueva propuesta.");
        }
        if (!pending.userId().equals(userId)) {
            pendingActions.putIfAbsent(proposalId, pending);
            throw new IllegalArgumentException("La propuesta no pertenece a este usuario.");
        }

        try {
            execute(userId, pending.type(), pending.data());
            return "Listo. " + pending.summary();
        } catch (RuntimeException ex) {
            pendingActions.putIfAbsent(proposalId, pending);
            throw ex;
        }
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
            case "CREATE_TRANSACTION" ->
                    transaccionService.crearTransaccion(userId, read(data, TransaccionRequest.class));
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

    private void removeExpiredActions() {
        Instant now = Instant.now();
        pendingActions.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private record PendingAction(Long userId, String type, String summary, JsonNode data, Instant expiresAt) {}
    public record ActionProposal(String id, String type, String summary, JsonNode data) {}
    public record AiActionResult(String answer, ActionProposal action) {}
}
