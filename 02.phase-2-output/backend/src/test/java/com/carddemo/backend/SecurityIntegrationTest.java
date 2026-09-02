package com.carddemo.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"spring.profiles.active=security-test", "carddemo.database.seed=true", "carddemo.database.reset=true"})
@AutoConfigureMockMvc
class SecurityIntegrationTest {
    @Autowired MockMvc mvc;

    @Test
    void sessionAuthenticationCsrfAndAdminAuthorizationProtectApiWorkflows() throws Exception {
        mvc.perform(get("/api/cards")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        MockHttpSession user = signOn("user0001", "user123");
        mvc.perform(get("/api/cards").session(user)).andExpect(status().isOk());
        mvc.perform(post("/api/transactions").session(user).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users").session(user)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));

        MockHttpSession admin = signOn("admin001", "admin123");
        mvc.perform(post("/api/users").session(admin).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/users").session(admin).with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"QAUSR999\",\"firstName\":\"QA\",\"lastName\":\"User\",\"password\":\"PASS\",\"userType\":\"U\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/users").session(admin).with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"TOO-LONG9\",\"firstName\":\"QA\",\"lastName\":\"User\",\"password\":\"PASS\",\"userType\":\"U\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RULE-VAL-023"))
                .andExpect(jsonPath("$.field").value("userId"));
        mvc.perform(get("/api/admin/menu").session(admin)).andExpect(status().isOk());
        mvc.perform(post("/api/session/logout").session(admin).with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/users").session(admin)).andExpect(status().isUnauthorized());
    }

    private MockHttpSession signOn(String userId, String password) throws Exception {
        MockHttpSession prior = new MockHttpSession();
        String originalId = prior.getId();
        MvcResult result = mvc.perform(post("/api/session").session(prior).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        MockHttpSession authenticated = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(authenticated.getId()).isNotEqualTo(originalId);
        return authenticated;
    }
}
