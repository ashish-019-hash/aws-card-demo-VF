package com.carddemo.backend.controller;

import com.carddemo.backend.dto.SessionResponse;
import com.carddemo.backend.dto.SignOnRequest;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.security.AppUserPrincipal;
import com.carddemo.backend.service.SignOnService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Sign-On (BR-001/BR-002). POST establishes an HTTP session (JSESSIONID) and, critically,
 * forces the CSRF cookie (XSRF-TOKEN) to be written immediately on the login response —
 * rather than deferred to the next request — by pulling the {@code CsrfToken} out of the
 * request and calling {@code getToken()}, which triggers
 * {@code CookieCsrfTokenRepository} to save the cookie right now.
 */
@RestController
public class SessionController {

    private final SignOnService signOnService;
    private final SecurityContextRepository securityContextRepository;

    public SessionController(SignOnService signOnService, SecurityContextRepository securityContextRepository) {
        this.signOnService = signOnService;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/api/session")
    public SessionResponse signOn(@RequestBody SignOnRequest request, HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        ApplicationUser user = signOnService.signOn(request.userId(), request.password());

        AppUserPrincipal principal = new AppUserPrincipal(user.getUserId(), user.getFirstName(),
                user.getLastName(), user.getUserType());
        var authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                principal, null, principal.authorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        // Force the CSRF cookie to be written on THIS response, not deferred to the next request.
        Object token = httpRequest.getAttribute(CsrfToken.class.getName());
        if (token instanceof CsrfToken csrfToken) {
            csrfToken.getToken();
        }

        return new SessionResponse(true, user.getUserId(), user.getFirstName(), user.getLastName(),
                user.getUserType());
    }

    @GetMapping("/api/session")
    public SessionResponse currentSession() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof AppUserPrincipal principal)) {
            return SessionResponse.anonymous();
        }
        return new SessionResponse(true, principal.getUserId(), principal.getFirstName(), principal.getLastName(),
                principal.getUserType());
    }

    @DeleteMapping("/api/session")
    public void signOff(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
    }
}
