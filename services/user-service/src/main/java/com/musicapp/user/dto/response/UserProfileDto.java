package com.musicapp.user.dto.response;

import com.musicapp.user.domain.UserRole;

import java.time.Instant;
import java.util.UUID;

public record UserProfileDto(
        UUID id,
        String email,
        String displayName,
        String avatarUrl,
        String bio,
        UserRole role,
        long followerCount,
        long followingCount,
        Instant createdAt
) {}
