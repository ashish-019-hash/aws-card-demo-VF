package com.aws.carddemo.security;

import com.aws.carddemo.repository.ApplicationUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rejects every authenticated request whose session principal no longer matches the persisted
 * user: the user was deleted, or the per-user security version advanced because the password or
 * role changed. This closes the race where a login authenticates before a credential change
 * commits and registers its session after revocation enumerated the session registry.
 */
public class UserSecurityVersionFilter extends OncePerRequestFilter {
    private final ApplicationUserRepository users;
    public UserSecurityVersionFilter(ApplicationUserRepository users) { this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CardDemoUserDetails principal) {
            boolean current = users.findById(principal.getUsername())
                    .map(user -> user.getSecurityVersion() == principal.getSecurityVersion())
                    .orElse(false);
            if (!current) {
                SecurityContextHolder.clearContext();
                HttpSession session = request.getSession(false);
                if (session != null) session.invalidate();
                response.sendError(HttpStatus.UNAUTHORIZED.value());
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
