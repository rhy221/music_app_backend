package com.musicapp.playlist.dto.response;

import com.musicapp.playlist.domain.PlaylistVisibility;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PlaylistDetailDto(
        UUID id,
        UUID ownerId,
        String name,
        String description,
        PlaylistVisibility visibility,
        int trackCount,
        long totalDurationMs,
        Instant createdAt,
        Instant updatedAt,
        List<PlaylistItemDto> items,
        List<CollaboratorDto> collaborators,
        boolean isOwner,
        boolean canEdit
) {}
