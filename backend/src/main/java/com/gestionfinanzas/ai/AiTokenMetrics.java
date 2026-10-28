package com.gestionfinanzas.ai;

import com.fasterxml.jackson.databind.JsonNode;

/** Only provider-reported counters, never estimates, response content or billing amounts. */
final class AiTokenMetrics {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(AiTokenMetrics.class);
    private static final long MAX_COUNT=1_000_000_000L;
    private AiTokenMetrics() {}
    static void groq(JsonNode response) {
        report("groq",response==null?null:response.get("usage"),"prompt_tokens","completion_tokens","total_tokens");
    }
    static void gemini(JsonNode response) {
        report("gemini",response==null?null:response.get("usageMetadata"),"promptTokenCount","candidatesTokenCount","totalTokenCount");
    }
    private static Long count(JsonNode usage,String field) {
        JsonNode value=usage==null?null:usage.get(field);
        if(value==null||!value.isIntegralNumber()||!value.canConvertToLong())return null;
        long number=value.longValue();return number>=0&&number<=MAX_COUNT?number:null;
    }
    private static void report(String provider,JsonNode usage,String inputField,String outputField,String totalField) {
        Long input=count(usage,inputField),output=count(usage,outputField),total=count(usage,totalField);
        if(input==null||output==null||total==null||total<input+output) {
            LOG.info("KAPTAL_AI_USAGE provider={} status=unavailable",provider);return;
        }
        // Gemini total may include thinking/tool tokens; do not add output to total again.
        LOG.info("KAPTAL_AI_USAGE provider={} status=reported input_tokens={} output_tokens={} total_tokens={}",
            provider,input,output,total);
    }
}
