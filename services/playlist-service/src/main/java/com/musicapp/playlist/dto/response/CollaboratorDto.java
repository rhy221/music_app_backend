package com.musicapp.playlist.dto.response;

import com.musicapp.playlist.domain.CollaboratorRole;

import java.time.Instant;
import java.util.UUID;

public record CollaboratorDto(
        UUID id,
        UUID userId,
        CollaboratorRole role,
        Instant joinedAt,
        String displayName,
        String avatarUrl
) {}
