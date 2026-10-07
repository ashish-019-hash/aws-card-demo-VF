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
 * Regressions for revocation races: logins that authenticate against stale credentials while a
 * security-relevant change commits must be rejected by the persisted security-stamp check on
 * their next request, including under concurrent updates and delete/recreate of the same user ID.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ConcurrentLoginRevocationTest {
    private static final String OLD_PASSWORD = "password123";

    @Autowired MockMvc mvc;
    @Autowired ApplicationUserRepository users;
    @Autowired UserDataService userService;
    @Autowired PasswordEncoder passwordEncoder;
    @MockitoSpyBean DatabaseUserDetailsService userDetailsService;

    @AfterEach
    void cleanUp() {
        for (String id : new String[] {"RACEUSR1", "RACEUSR2", "RACEUSR3"}) {
            users.findById(id).ifPresent(users::delete);
        }
    }

    private void seedUser(String id) {
        ApplicationUser user = new ApplicationUser();
        user.setId(id); user.setFirstName("Race"); user.setLastName("Tester");
        user.setPasswordHash(passwordEncoder.encode(OLD_PASSWORD)); user.setUserType("U");
        users.save(user);
    }

    /** Holds the next login for {@code userId} after it reads the user, until released. */
    private void pinLoginAfterUserLoad(String userId, CountDownLatch userLoadedByLogin, CountDownLatch release) {
        doAnswer(invocation -> {
            Object details = invocation.callRealMethod();
            userLoadedByLogin.countDown();
            assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
            return details;
        }).when(userDetailsService).loadUserByUsername(userId);
    }

    private Thread loginInBackground(String userId, String password, MockHttpSession session,
            AtomicReference<Throwable> failure) {
        Thread thread = new Thread(() -> {
            try {
                mvc.perform(post("/api/auth/login").session(session).contentType(MediaType.APPLICATION_JSON)
                                .content("{\"userId\":\"" + userId + "\",\"password\":\"" + password + "\"}"))
                        .andExpect(status().isOk());
            } catch (Throwable error) {
                failure.set(error);
            }
        });
        thread.start();
        return thread;
    }

    @Test
    void loginRacingPasswordChangeCannotEscapeRevocation() throws Exception {
        seedUser("RACEUSR1");
        CountDownLatch userLoadedByLogin = new CountDownLatch(1);
        CountDownLatch passwordChangeCommitted = new CountDownLatch(1);
        pinLoginAfterUserLoad("RACEUSR1", userLoadedByLogin, passwordChangeCommitted);

        MockHttpSession session = new MockHttpSession();
        AtomicReference<Throwable> loginFailure = new AtomicReference<>();
        Thread loginThread = loginInBackground("RACEUSR1", OLD_PASSWORD, session, loginFailure);
        assertThat(userLoadedByLogin.await(10, TimeUnit.SECONDS)).isTrue();

        // Commit the password change (and its revocation sweep) while the login is in flight.
        userService.update("RACEUSR1", new UserRequest("Race", "Tester", "newpassword1", "U"));
        passwordChangeCommitted.countDown();
        loginThread.join(TimeUnit.SECONDS.toMillis(10));
        assertThat(loginThread.isAlive()).isFalse();
        assertThat(loginFailure.get()).isNull();

        // The racing login succeeded with the old credentials, but its session carries the old
        // security stamp and must be rejected on the first authenticated request.
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());

        // A fresh login with the new password works and stays valid.
        MockHttpSession freshSession = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(freshSession).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"RACEUSR1\",\"password\":\"newpassword1\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/accounts").session(freshSession)).andExpect(status().isOk());
    }

    @Test
    void loginRacingTwoConcurrentSecurityUpdatesCannotEscapeRevocation() throws Exception {
        seedUser("RACEUSR2");
        String originalStamp = users.findById("RACEUSR2").orElseThrow().getSecurityStamp();
        CountDownLatch userLoadedByLogin = new CountDownLatch(1);
        CountDownLatch updatesCommitted = new CountDownLatch(1);
        pinLoginAfterUserLoad("RACEUSR2", userLoadedByLogin, updatesCommitted);

        MockHttpSession session = new MockHttpSession();
        AtomicReference<Throwable> loginFailure = new AtomicReference<>();
        Thread loginThread = loginInBackground("RACEUSR2", OLD_PASSWORD, session, loginFailure);
        assertThat(userLoadedByLogin.await(10, TimeUnit.SECONDS)).isTrue();

        // Two concurrent security updates commit while the login is pinned mid-flight. With a
        // numeric version both could compute the same next value; stamps stay globally unique.
        CountDownLatch start = new CountDownLatch(1);
        AtomicReference<Throwable> firstUpdateFailure = new AtomicReference<>();
        AtomicReference<Throwable> secondUpdateFailure = new AtomicReference<>();
        Thread firstUpdate = new Thread(() -> {
            try {
                assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
                userService.update("RACEUSR2", new UserRequest("Race", "Tester", "newpassword1", "U"));
            } catch (Throwable error) { firstUpdateFailure.set(error); }
        });
        Thread secondUpdate = new Thread(() -> {
            try {
                assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
                userService.update("RACEUSR2", new UserRequest("Race", "Tester", "newpassword2", "U"));
            } catch (Throwable error) { secondUpdateFailure.set(error); }
        });
        firstUpdate.start(); secondUpdate.start();
        start.countDown();
        firstUpdate.join(TimeUnit.SECONDS.toMillis(10));
        secondUpdate.join(TimeUnit.SECONDS.toMillis(10));
        assertThat(firstUpdateFailure.get()).isNull();
        assertThat(secondUpdateFailure.get()).isNull();
        ApplicationUser committed = users.findById("RACEUSR2").orElseThrow();
        assertThat(committed.getSecurityStamp()).isNotEqualTo(originalStamp);

        updatesCommitted.countDown();
        loginThread.join(TimeUnit.SECONDS.toMillis(10));
        assertThat(loginThread.isAlive()).isFalse();
        assertThat(loginFailure.get()).isNull();

        // The racing login carries the pre-update stamp and must be rejected.
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());

        // A fresh login with whichever password won the race works and stays valid.
        String winningPassword = passwordEncoder.matches("newpassword1", committed.getPasswordHash())
                ? "newpassword1" : "newpassword2";
        MockHttpSession freshSession = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(freshSession).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"RACEUSR2\",\"password\":\"" + winningPassword + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/accounts").session(freshSession)).andExpect(status().isOk());
    }

    @Test
    void delayedLoginAcrossDeleteAndRecreateUnderSameIdCannotReviveOldSession() throws Exception {
        seedUser("RACEUSR3");
        String originalStamp = users.findById("RACEUSR3").orElseThrow().getSecurityStamp();
        CountDownLatch userLoadedByLogin = new CountDownLatch(1);
        CountDownLatch recreateCommitted = new CountDownLatch(1);
        pinLoginAfterUserLoad("RACEUSR3", userLoadedByLogin, recreateCommitted);

        MockHttpSession session = new MockHttpSession();
        AtomicReference<Throwable> loginFailure = new AtomicReference<>();
        Thread loginThread = loginInBackground("RACEUSR3", OLD_PASSWORD, session, loginFailure);
        assertThat(userLoadedByLogin.await(10, TimeUnit.SECONDS)).isTrue();

        // Delete and recreate the same user ID with the same password while the old-user login is
        // delayed mid-flight. A numeric version would reset and collide; the new incarnation of
        // the user must carry a distinct stamp.
        userService.delete("RACEUSR3");
        userService.create("RACEUSR3", new UserRequest("Race", "Tester", OLD_PASSWORD, "U"));
        assertThat(users.findById("RACEUSR3").orElseThrow().getSecurityStamp()).isNotEqualTo(originalStamp);

        recreateCommitted.countDown();
        loginThread.join(TimeUnit.SECONDS.toMillis(10));
        assertThat(loginThread.isAlive()).isFalse();
        assertThat(loginFailure.get()).isNull();

        // The delayed login authenticated against the deleted incarnation and must be rejected.
        mvc.perform(get("/api/accounts").session(session)).andExpect(status().isUnauthorized());

        // A fresh login against the recreated user works and stays valid.
        MockHttpSession freshSession = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(freshSession).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"RACEUSR3\",\"password\":\"" + OLD_PASSWORD + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/accounts").session(freshSession)).andExpect(status().isOk());
    }
}
