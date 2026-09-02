package com.carddemo.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"spring.profiles.active=security-test", "carddemo.database.seed=true", "carddemo.database.reset=true"})
class SecurityErrorDispatchIntegrationTest {
    @Autowired private TestRestTemplate rest;
    @LocalServerPort private int port;

    @Test
    void authenticatedUnknownRoutePreservesNotFoundDuringErrorDispatch() {
        HttpHeaders signOnHeaders = new HttpHeaders();
        signOnHeaders.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> signOn = rest.postForEntity(url("/api/session"),
                new HttpEntity<>("{\"userId\":\"user0001\",\"password\":\"user123\"}", signOnHeaders), String.class);

        assertThat(signOn.getStatusCode()).isEqualTo(HttpStatus.OK);
        String sessionCookie = signOn.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(sessionCookie).contains("JSESSIONID=");

        HttpHeaders authenticatedHeaders = new HttpHeaders();
        authenticatedHeaders.set(HttpHeaders.COOKIE, sessionCookie.substring(0, sessionCookie.indexOf(';')));
        ResponseEntity<String> response = rest.exchange(url("/unknown-authenticated-route"), HttpMethod.GET,
                new HttpEntity<>(authenticatedHeaders), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
