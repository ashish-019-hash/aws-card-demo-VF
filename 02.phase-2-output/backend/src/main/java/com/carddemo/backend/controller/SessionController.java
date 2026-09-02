package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.service.CardDemoApplicationService;
import io.swagger.v3.oas.annotations.Operation;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/session")
public class SessionController {
    private final CardDemoApplicationService service;
    public SessionController(CardDemoApplicationService service) { this.service = service; }
    @PostMapping
    @Operation(summary = "Sign on and return the role-specific menu destination")
    public ApiDtos.SessionResponse signOn(@RequestBody ApiDtos.SessionRequest request, HttpServletRequest servletRequest) {
        ApiDtos.SessionResponse response = service.signOn(request);
        String authority = "ADMINISTRATOR".equals(response.role()) ? "ROLE_ADMINISTRATOR" : "ROLE_USER";
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(response.userId(), null, List.of(new SimpleGrantedAuthority(authority))));
        servletRequest.getSession(true);
        servletRequest.changeSessionId();
        SecurityContextHolder.setContext(context);
        servletRequest.getSession().setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return response;
    }
}
