package com.musicapp.library.dto.response;

import java.time.Instant;
import java.util.UUID;

public record FollowedPlaylistDto(
        UUID id,
        UUID playlistId,
        String playlistName,
        String coverUrl,
        UUID ownerId,
        String ownerName,
        int trackCount,
        Instant followedAt
) {}
