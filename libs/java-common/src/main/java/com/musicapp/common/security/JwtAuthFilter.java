package com.musicapp.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Populates the Spring SecurityContext from either a Bearer JWT (direct access)
 * or gateway-propagated X-User-Id / X-User-Role headers (KrakenD gateway traffic).
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final List<String> SKIP_PATHS = List.of(
            "/actuator/**", "/swagger-ui/**", "/v3/api-docs/**"
    );

    private final JwtUtil jwtUtil;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return SKIP_PATHS.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtUtil.validateToken(token);
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                setAuthentication(userId, role);
            } catch (Exception ignored) {
                // Invalid token: skip — let SecurityConfig reject if endpoint requires auth
            }
        } else {
            // Trust gateway-propagated headers (set by KrakenD after JWT validation).
            // KrakenD strips the Authorization header but adds X-User-Id / X-User-Role
            // for authenticated endpoints, so this is the standard path for gateway traffic.
            String userId = request.getHeader("X-User-Id");
            if (userId != null && !userId.isBlank()) {
                String role = request.getHeader("X-User-Role");
                setAuthentication(userId, role != null ? role : "USER");
            }
        }
        filterChain.doFilter(request, response);
    }

    private void setAuthentication(String userId, String role) {
        var auth = new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
