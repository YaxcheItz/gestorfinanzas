package com.gestionfinanzas.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.*;
import com.gestionfinanzas.security.CustomUserDetails;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class VinculacionCanalIntegrationTest {
    @Autowired UsuarioRepository usuarios;
    @Autowired VinculacionCanalRepository codigos;
    @Autowired RefreshTokenRepository refresh;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired VinculacionCanalService servicio;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    Usuario owner;
    // RFC 7636 Appendix B: known S256 test vector.
    static final String VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    static final String CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    @BeforeEach void setup() {
        owner=usuarios.saveAndFlush(Usuario.builder().nombre("Google QA").email(UUID.randomUUID()+"@example.test")
                .googleSubject(UUID.randomUUID().toString()).passwordHash("not-a-password").build());
    }
    String approve() throws Exception {
        var response=mvc.perform(post("/api/canales/vinculacion/aprobar").with(user(new CustomUserDetails(owner)))
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("challenge",CHALLENGE))))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andReturn();
        return mapper.readTree(response.getResponse().getContentAsString()).path("data").path("codigo").asText();
    }
    org.springframework.test.web.servlet.ResultActions exchange(String code,String verifier,String email)throws Exception {
        return mvc.perform(post("/api/auth/canal/intercambiar").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("codigo",code,"verifier",verifier,"email",email))));
    }
    @Test void googleUserCanApproveWithoutPasswordAndExchangeOnlyOnce()throws Exception {
        long before=refresh.count();String code=approve();
        assertEquals(43,code.length());assertEquals(before,refresh.count());
        assertTrue(codigos.findAll().stream().noneMatch(c->c.getHash().equals(code)));
        exchange(code,VERIFIER,owner.getEmail()).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("Set-Cookie",org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(jsonPath("$.data.id").value(owner.getId()));
        assertEquals(before+1,refresh.count());
        exchange(code,VERIFIER,owner.getEmail()).andExpect(status().isBadRequest());
    }
    @Test void approvalNeedsAuthenticatedUser()throws Exception {
        mvc.perform(post("/api/canales/vinculacion/aprobar").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("challenge",CHALLENGE)))).andExpect(status().isUnauthorized());
    }
    @Test void stolenCodeWithoutVerifierCannotIssueSession()throws Exception {
        long before=refresh.count();exchange(approve(),"x".repeat(43),owner.getEmail()).andExpect(status().isBadRequest());
        assertEquals(before,refresh.count());
    }
    @Test void anotherEmailCannotReceiveSession()throws Exception {
        long before=refresh.count();exchange(approve(),VERIFIER,"other@example.test").andExpect(status().isBadRequest());
        assertEquals(before,refresh.count());
    }
    @Test void expiredApprovalCannotIssueSession()throws Exception {
        String code=approve();var record=codigos.findAll().stream().filter(c->c.getUsuario().getId().equals(owner.getId())).findFirst().orElseThrow();
        record.setVence(Instant.now().minusSeconds(1));codigos.saveAndFlush(record);
        exchange(code,VERIFIER,owner.getEmail()).andExpect(status().isBadRequest());
    }
    @Test void revokedApprovalCannotResurrectSession()throws Exception {
        String code=approve();owner.setTokenVersion(owner.getTokenVersion()+1);usuarios.saveAndFlush(owner);
        exchange(code,VERIFIER,owner.getEmail()).andExpect(status().isBadRequest());
    }
    @Test void inactiveUserCannotExchange()throws Exception {
        String code=approve();owner.setActivo(false);usuarios.saveAndFlush(owner);
        exchange(code,VERIFIER,owner.getEmail()).andExpect(status().isBadRequest());
    }
    @Test void malformedRequestsAreRejectedBeforeIssuingCodes()throws Exception {
        mvc.perform(post("/api/canales/vinculacion/aprobar").with(user(new CustomUserDetails(owner)))
                .contentType(MediaType.APPLICATION_JSON).content("{\"challenge\":\"short\"}")).andExpect(status().isBadRequest());
        exchange("x","x",owner.getEmail()).andExpect(status().isBadRequest());
    }
    @Test @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentExchangeIssuesExactlyOneSession()throws Exception {
        String code=servicio.aprobar(owner.getId(),CHALLENGE);
        var start=new java.util.concurrent.CountDownLatch(1);
        try(var executor=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Callable<Boolean> attempt=()->{
                start.await();
                try { servicio.intercambiar(code,VERIFIER,owner.getEmail()); return true; }
                catch(IllegalArgumentException expected) { return false; }
            };
            var first=executor.submit(attempt);var second=executor.submit(attempt);start.countDown();
            int issued=(first.get(15,java.util.concurrent.TimeUnit.SECONDS)?1:0)
                    +(second.get(15,java.util.concurrent.TimeUnit.SECONDS)?1:0);
            assertEquals(1,issued);
            assertEquals(1,refresh.findByUsuarioId(owner.getId()).size());
        } finally {
            new org.springframework.transaction.support.TransactionTemplate(transactionManager).executeWithoutResult(status->{
                codigos.findAll().stream().filter(c->c.getUsuario().getId().equals(owner.getId())).forEach(codigos::delete);
                refresh.deleteByUsuarioId(owner.getId());usuarios.deleteById(owner.getId());
            });
        }
    }
}
