package com.musicapp.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class JwtUtilTest {

    private static final String SECRET = "test-secret-key-that-is-long-enough-for-hs256";
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, 3_600_000L, 604_800_000L);
    }

    @Test
    void generateAccessToken_returnsValidToken() {
        String token = jwtUtil.generateAccessToken("user-1", "USER");
        assertThat(token).isNotBlank();
    }

    @Test
    void validateToken_validAccessToken_returnsClaims() {
        String token = jwtUtil.generateAccessToken("user-42", "ADMIN");
        Claims claims = jwtUtil.validateToken(token);
        assertThat(claims.getSubject()).isEqualTo("user-42");
        assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
    }

    @Test
    void getUserIdFromToken_returnsCorrectId() {
        String token = jwtUtil.generateAccessToken("user-99", "USER");
        assertThat(jwtUtil.getUserIdFromToken(token)).isEqualTo("user-99");
    }

    @Test
    void getRoleFromToken_returnsCorrectRole() {
        String token = jwtUtil.generateAccessToken("user-1", "ARTIST");
        assertThat(jwtUtil.getRoleFromToken(token)).isEqualTo("ARTIST");
    }

    @Test
    void validateToken_expiredToken_throwsJwtException() {
        // zero expiration means token expires immediately
        JwtUtil shortLived = new JwtUtil(SECRET, 0L, 0L);
        String token = shortLived.generateAccessToken("user-1", "USER");
        assertThatThrownBy(() -> jwtUtil.validateToken(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void validateToken_tamperedToken_throwsJwtException() {
        String token = jwtUtil.generateAccessToken("user-1", "USER") + "tampered";
        assertThatThrownBy(() -> jwtUtil.validateToken(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void generateRefreshToken_returnsValidToken() {
        String token = jwtUtil.generateRefreshToken("user-5");
        Claims claims = jwtUtil.validateToken(token);
        assertThat(claims.getSubject()).isEqualTo("user-5");
        assertThat(claims.get("role", String.class)).isNull();
    }
}
