package com.carddemo.backend.security;

import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.repository.ApplicationUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Per-request session revalidation.
 *
 * <p>The legacy USRSEC record has no notion of "revoke this session" — CardDemo is
 * pseudo-conversational, so a deleted/changed user simply fails the next screen's
 * lookup. In a long-lived web session that isn't good enough: if an admin deletes a
 * user, or changes their role, while that user still holds a live session, this filter
 * reloads the user on every request and invalidates the session (401) the moment the
 * account is gone or the role no longer matches what was recorded at sign-on.</p>
 */
public class RevalidationFilter extends OncePerRequestFilter {

    private final ApplicationUserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RevalidationFilter(ApplicationUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof AppUserPrincipal principal) {
            Optional<ApplicationUser> current = userRepository.findById(principal.getUserId());
            if (current.isEmpty() || !current.get().getUserType().equals(principal.getUserType())) {
                SecurityContextHolder.clearContext();
                if (request.getSession(false) != null) {
                    request.getSession(false).invalidate();
                }
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("code", "SESSION_INVALID");
                body.put("message", "Your session is no longer valid. Please sign on again.");
                objectMapper.writeValue(response.getWriter(), body);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
