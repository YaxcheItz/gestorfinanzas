package com.gestionfinanzas.ai;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.http.HttpMethod.POST;

class GeminiAiProviderTest {

    private static final String API_KEY = "test-gemini-secret";
    private static final String BASE_URL = "https://gemini.test/v1beta";
    private static final String MODEL = "gemini-2.5-flash";
    private static final String PROMPT = "Responde exactamente: KAPTAL_IA_OK";

    @Test
    void generateEnvíaLaClaveEnHeaderYElPromptEnElCuerpo() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(BASE_URL + "/models/" + MODEL + ":generateContent"))
                .andExpect(method(POST))
                .andExpect(header("x-goog-api-key", API_KEY))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "contents": [{"parts": [{"text": "Responde exactamente: KAPTAL_IA_OK"}]}],
                          "generationConfig": {
                            "maxOutputTokens": 24,
                            "thinkingConfig": {"thinkingBudget": 0}
                          }
                        }
                        """))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[{"text":"KAPTAL_IA_OK"}]}}]}
                        """, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = provider(builder, API_KEY);

        assertEquals("KAPTAL_IA_OK", provider.generate(PROMPT, 24));
        server.verify();
    }

    @Test
    void generateExtraeTextoFinalCuandoGeminiIncluyePartesDeRazonamiento() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(BASE_URL + "/models/" + MODEL + ":generateContent"))
                .andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingBudget").value(0))
                .andRespond(withSuccess("""
                        {
                          "candidates": [{
                            "content": {
                              "parts": [
                                {"text": "pensamiento interno", "thought": true},
                                {"text": "KAPTAL_IA_OK"}
                              ]
                            }
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = provider(builder, API_KEY);

        assertEquals("KAPTAL_IA_OK", provider.generate(PROMPT, 24));
        server.verify();
    }

    @Test
    void generateNoExponeLaClaveCuandoGeminiLaRechaza() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(BASE_URL + "/models/" + MODEL + ":generateContent"))
                .andExpect(header("x-goog-api-key", API_KEY))
                .andRespond(withUnauthorizedRequest());

        GeminiAiProvider provider = provider(builder, API_KEY);
        AiProviderException error = assertThrows(
                AiProviderException.class,
                () -> provider.generate(PROMPT, 24)
        );

        assertFalse(error.getMessage().contains(API_KEY));
        assertEquals("Gemini rechazó la clave. Verifica GEMINI_API_KEY en el backend.", error.getMessage());
        server.verify();
    }

    @Test
    void generateFallaConConfiguracionAusenteSinRealizarLaPeticion() {
        GeminiAiProvider provider = provider(RestClient.builder(), "");

        assertThrows(AiConfigurationException.class, () -> provider.generate(PROMPT, 24));
    }

    @Test
    void generateUsaModeloDeRespaldoCuandoElPrincipalAgotaCuota() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        String fallbackModel = "gemini-flash-lite-latest";
        server.expect(requestTo(BASE_URL + "/models/" + MODEL + ":generateContent"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(requestTo(BASE_URL + "/models/" + fallbackModel + ":generateContent"))
                .andExpect(jsonPath("$.generationConfig.thinkingConfig").doesNotExist())
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[{"text":"Respuesta desde respaldo"}]}}]}
                        """, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = provider(builder, API_KEY, fallbackModel);

        assertEquals("Respuesta desde respaldo", provider.generate(PROMPT, 24));
        server.verify();
    }

    @Test
    void generateInformaCuandoLosDosModelosAgotanCuota() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        String fallbackModel = "gemini-2.5-flash-lite";
        server.expect(requestTo(BASE_URL + "/models/" + MODEL + ":generateContent"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(requestTo(BASE_URL + "/models/" + fallbackModel + ":generateContent"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        GeminiAiProvider provider = provider(builder, API_KEY, fallbackModel);
        AiProviderException error = assertThrows(
                AiProviderException.class,
                () -> provider.generate(PROMPT, 24)
        );

        assertEquals("Gemini alcanzó el límite de solicitudes en los modelos configurados. Inténtalo más tarde.", error.getMessage());
        server.verify();
    }

    private GeminiAiProvider provider(RestClient.Builder builder, String apiKey) {
        return provider(builder, apiKey, "gemini-flash-lite-latest");
    }

    private GeminiAiProvider provider(RestClient.Builder builder, String apiKey, String fallbackModel) {
        AiProperties properties = new AiProperties(
                "gemini",
                MODEL,
                fallbackModel,
                new AiProperties.Gemini(apiKey, BASE_URL)
        );
        return new GeminiAiProvider(builder, properties);
    }
}
