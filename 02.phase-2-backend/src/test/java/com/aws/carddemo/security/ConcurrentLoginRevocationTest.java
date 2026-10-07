package com.aws.carddemo.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aws.carddemo.dto.UserRequest;
import com.aws.carddemo.entity.ApplicationUser;
import com.aws.carddemo.repository.ApplicationUserRepository;
import com.aws.carddemo.service.UserDataService;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Regression for the revocation race: a login that authenticates against the old credentials
 * before a password change commits, and registers its session only after
 * {@link SessionRevocationService} enumerated the session registry, must still be rejected by the
 * persisted security-version check on its next request.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ConcurrentLoginRevocationTest {
    private static final String USER_ID = "RACEUSR1";
    private static final String OLD_PASSWORD = "password123";

    @Autowired MockMvc mvc;
    @Autowired ApplicationUserRepository users;
    @Autowired UserDataService userService;
    @Autowired PasswordEncoder passwordEncoder;
    @MockitoSpyBean DatabaseUserDetailsService userDetailsService;

    @AfterEach
    void cleanUp() {
        users.findById(USER_ID).ifPresent(users::delete);
    }

    @Test
    void loginRacingPasswordChangeCannotEscapeRevocation() throws Exception {
        ApplicationUser user = new ApplicationUser();
        user.setId(USER_ID); user.setFirstName("Race"); user.setLastName("Tester");
        user.setPasswordHash(passwordEncoder.encode(OLD_PASSWORD)); user.setUserType("U");
        users.save(user);

        CountDownLatch userLoadedByLogin = new CountDownLatch(1);
        CountDownLatch passwordChangeCommitted = new CountDownLatch(1);
        doAnswer(invocation -> {
            Object details = invocation.callRealMethod();
            // The login has read the (old) credentials; hold it here until the password change
            // commits and SessionRevocationService has enumerated the registry without finding
            // this not-yet-registered session.
            userLoadedByLogin.countDown();
            assertThat(passwordChangeCommitted.await(10, TimeUnit.SECONDS)).isTrue();
            return details;
        }).when(userDetailsService).loadUserByUsername(USER_ID);

        MockHttpSession session = new MockHttpSession();
        AtomicReference<Throwable> loginFailure = new AtomicReference<>();
        Thread loginThread = new Thread(() -> {
            try {
                mvc.perform(post("/api/auth/login").session(session).contentType(MediaType.APPLICATION_JSON)
                                .content("{\"userId\":\"" + USER_ID + "\",\"password\":\"" + OLD_PASSWORD + "\"}"))
                        .andExpect(status().isOk());
            } catch (Throwable failure) {
                loginFailure.set(failure);
            }
        });
        loginThread.start();
        assertThat(userLoadedByLogin.await(10, TimeUnit.SECONDS)).isTrue();

        // Commit the password change (and its revocation sweep) while the login is in flight.
        userService.update(USER_ID, new UserRequest("Race", "Tester", "newpassword1", "U"));
        passwordChangeCommitted.countDown();
        loginThread.join(TimeUnit.SECONDS.toMillis(10));
        assertThat(loginThread.isAlive()).isFalse();
        assertThat(loginFailure.get()).isNull();

        // The racing login succeeded with the old credentials, but its session carries the old
        // security version and must be rejected on the first authenticated request.
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());

        // A fresh login with the new password works and stays valid.
        MockHttpSession freshSession = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(freshSession).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + USER_ID + "\",\"password\":\"newpassword1\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/accounts").session(freshSession)).andExpect(status().isOk());
    }
}
