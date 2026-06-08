package com.musicapp.user.dto.response;

import com.musicapp.user.domain.UserRole;

import java.util.UUID;

public record InternalUserDto(
        UUID id,
        String displayName,
        String avatarUrl,
        UserRole role
) {}
