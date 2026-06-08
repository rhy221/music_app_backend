package com.musicapp.user.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        String tokenType,
        UserProfileDto user
) {
    public static AuthResponse of(String accessToken, String refreshToken, long expiresIn, UserProfileDto user) {
        return new AuthResponse(accessToken, refreshToken, expiresIn, "Bearer", user);
    }
}
