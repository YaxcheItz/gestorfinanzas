package com.gestionfinanzas.ai;

import com.gestionfinanzas.security.LimiteAbusoCompartido;
import com.gestionfinanzas.exception.TooManyRequestsException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.*;

/** Accounts must stay on the provider's Free plan; an API key alone cannot prove billing status. */
@Component
public class AiUsagePolicy {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(AiUsagePolicy.class);
    private static final Map<String,Set<String>> MODELS=Map.of(
        "groq",Set.of("openai/gpt-oss-20b","whisper-large-v3-turbo"),
        "gemini",Set.of("gemini-3.5-flash-lite","gemini-2.5-flash","gemini-2.5-flash-lite"));
    private static final Map<String,String> ENDPOINTS=Map.of("groq","https://api.groq.com/openai/v1",
        "gemini","https://generativelanguage.googleapis.com/v1beta");
    private final Set<String> confirmed;
    private final int limit;
    private final LimiteAbusoCompartido shared;

    public AiUsagePolicy(@Value("${app.ai.free-tier-providers:groq,gemini}") String providers,
            @Value("${app.ai.global-request-limit-24h:-1}") int limit,ObjectProvider<LimiteAbusoCompartido> stores) {
        this.confirmed=new HashSet<>();
        for(String provider:providers.split(","))if(!provider.isBlank())confirmed.add(provider.strip());
        if(!MODELS.keySet().containsAll(confirmed)||limit < -1||limit==Integer.MAX_VALUE)
            throw new IllegalArgumentException("Configuración de IA gratuita inválida.");
        this.limit=limit;this.shared=stores.getIfAvailable();
        if(limit>0&&shared==null)throw new IllegalStateException("El presupuesto global de IA requiere límites PostgreSQL compartidos.");
    }
    public boolean enabled(String provider,String model) {
        return model!=null&&confirmed.contains(provider)&&MODELS.getOrDefault(provider,Set.of()).contains(model);
    }
    public void reserve(String provider,String model,String endpoint) {
        String official=ENDPOINTS.get(provider);
        if(!enabled(provider,model)||official==null||!(official.equals(endpoint)||(official+"/").equals(endpoint)))
            throw denied("unverified","La IA externa necesita un proveedor, modelo y cuenta gratuitos verificados.");
        if(limit==0)throw denied("blocked","Las llamadas externas de IA están desactivadas. Puedes seguir usando las reglas locales.");
        if(limit>0) {
            try { shared.comprobar("ai:global:requests",limit,Duration.ofDays(1)); }
            catch(TooManyRequestsException ex) { throw denied("exhausted","Se alcanzó el límite global de IA. Usa las reglas locales o espera a la siguiente ventana."); }
            catch(RuntimeException ex) { throw denied("unavailable","No se pudo comprobar el límite de IA. Inténtalo más tarde."); }
        }
        // One reservation for each outbound attempt, including provider/model fallback attempts.
        LOG.info("KAPTAL_AI_REQUEST provider={} outcome=reserved",provider);
    }
    private Denied denied(String reason,String message) {
        LOG.warn("KAPTAL_AI_BUDGET outcome={}",reason);
        return new Denied(message);
    }
    public static final class Denied extends AiProviderException {
        Denied(String message) { super(message); }
    }
}
