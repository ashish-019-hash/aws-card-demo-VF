package com.aws.carddemo.controller;

import com.aws.carddemo.dto.LoginRequest;
import com.aws.carddemo.dto.LoginResponse;
import com.aws.carddemo.entity.ApplicationUser;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.ApplicationUserRepository;
import com.aws.carddemo.service.AccessRules;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;
    private final ApplicationUserRepository users;
    private final AccessRules accessRules;
    public AuthController(AuthenticationManager authenticationManager,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            SecurityContextRepository securityContextRepository,
            ApplicationUserRepository users, AccessRules accessRules) {
        this.authenticationManager = authenticationManager;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
        this.users = users; this.accessRules = accessRules;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        String userId = request.userId().toUpperCase();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(userId, request.password()));
        // Apply the configured session-authentication strategy (session-fixation protection via
        // session ID rotation, CSRF token rotation, session registry bookkeeping) before persisting
        // the security context, exactly as Spring Security's own login filters do.
        sessionAuthenticationStrategy.onAuthentication(authentication, servletRequest, servletResponse);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        ApplicationUser user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return new LoginResponse(user.getId(), user.getUserType(), accessRules.entryPointFor(user.getUserType()).name());
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(org.springframework.security.web.csrf.CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }
}
