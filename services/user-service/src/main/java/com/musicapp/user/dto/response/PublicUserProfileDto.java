package com.musicapp.user.dto.response;

import com.musicapp.user.domain.UserRole;

import java.util.UUID;

public record PublicUserProfileDto(
        UUID id,
        String displayName,
        String avatarUrl,
        UserRole role,
        long followerCount,
        long followingCount,
        boolean isFollowing
) {}
