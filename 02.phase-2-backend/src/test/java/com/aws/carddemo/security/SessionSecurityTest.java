package com.aws.carddemo.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aws.carddemo.dto.UserRequest;
import com.aws.carddemo.entity.ApplicationUser;
import com.aws.carddemo.repository.ApplicationUserRepository;
import com.aws.carddemo.service.UserDataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SessionSecurityTest {
    private static final String PASSWORD = "password123";

    @Autowired MockMvc mvc;
    @Autowired ApplicationUserRepository users;
    @Autowired UserDataService userService;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private void seedUser(String id, String userType) {
        ApplicationUser user = new ApplicationUser();
        user.setId(id); user.setFirstName("Session"); user.setLastName("Tester");
        user.setPasswordHash(passwordEncoder.encode(PASSWORD)); user.setUserType(userType);
        users.save(user);
    }

    private MockHttpSession login(String userId) throws Exception {
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk());
        return session;
    }

    @Test
    void loginRotatesSessionIdAndPersistsSecurityContext() throws Exception {
        seedUser("SESUSR01", "U");
        MockHttpSession session = new MockHttpSession();
        String preAuthenticationId = session.getId();
        mvc.perform(post("/api/auth/login").session(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"SESUSR01\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk());
        assertThat(session.getId()).isNotEqualTo(preAuthenticationId);
        assertThat(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY)).isNotNull();
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
    }

    @Test
    void loginAcceptsLowercaseUserIdForUserCreatedWithLowercaseId() throws Exception {
        userService.create("sesusr02", new UserRequest("Session", "Tester", PASSWORD, "U"));
        MockHttpSession session = login("sesusr02");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
    }

    @Test
    void passwordChangeRevokesActiveSessions() throws Exception {
        seedUser("SESUSR03", "U");
        MockHttpSession session = login("SESUSR03");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
        userService.update("SESUSR03", new UserRequest("Session", "Tester", "newpassword1", "U"));
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void roleChangeRevokesActiveSessions() throws Exception {
        seedUser("SESUSR04", "U");
        MockHttpSession session = login("SESUSR04");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
        userService.update("sesusr04", new UserRequest("Session", "Tester", PASSWORD, "A"));
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void deleteRevokesActiveSessions() throws Exception {
        seedUser("SESUSR05", "U");
        MockHttpSession session = login("SESUSR05");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
        userService.delete("sesusr05");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void staleSessionIsRejectedEvenWhenRegistryRevocationIsBypassed() throws Exception {
        seedUser("SESUSR07", "U");
        MockHttpSession session = login("SESUSR07");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
        // Delete directly through the repository, bypassing SessionRevocationService entirely:
        // the per-request existence/security-version check must still reject the session.
        users.deleteById("SESUSR07");
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void nameOnlyChangeKeepsActiveSessions() throws Exception {
        seedUser("SESUSR06", "U");
        MockHttpSession session = login("SESUSR06");
        userService.update("SESUSR06", new UserRequest("Renamed", "Tester", PASSWORD, "U"));
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isOk());
    }
}
