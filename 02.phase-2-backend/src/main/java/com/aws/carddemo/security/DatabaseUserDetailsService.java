package com.aws.carddemo.security;

import com.aws.carddemo.entity.ApplicationUser;
import com.aws.carddemo.repository.ApplicationUserRepository;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {
    private final ApplicationUserRepository users;
    public DatabaseUserDetailsService(ApplicationUserRepository users) { this.users = users; }

    @Override
    public UserDetails loadUserByUsername(String username) {
        ApplicationUser user = users.findById(username.toUpperCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        String role = "A".equalsIgnoreCase(user.getUserType()) ? "ADMIN" : "USER";
        return new CardDemoUserDetails(user.getId(), user.getPasswordHash(), user.getSecurityVersion(),
                AuthorityUtils.createAuthorityList("ROLE_" + role));
    }
}
