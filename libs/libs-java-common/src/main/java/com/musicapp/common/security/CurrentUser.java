package com.musicapp.common.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Utility for reading the authenticated user from the current SecurityContext.
 */
public final class CurrentUser {

    private CurrentUser() {}

    /**
     * Returns the current user's ID. Throws {@link AccessDeniedException} if not authenticated.
     */
    public static String getUserId() {
        return (String) getAuthentication().getPrincipal();
    }

    /**
     * Returns the current user's role (without the ROLE_ prefix).
     */
    public static String getRole() {
        return getAuthentication().getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .findFirst()
                .orElse("");
    }

    /** Returns true if the current user has the ADMIN role. */
    public static boolean isAdmin() {
        return "ADMIN".equals(getRole());
    }

    /** Returns true if the current user has the ARTIST role. */
    public static boolean isArtist() {
        return "ARTIST".equals(getRole());
    }

    private static Authentication getAuthentication() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Not authenticated");
        }
        return auth;
    }
}
