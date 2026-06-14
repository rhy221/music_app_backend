package com.musicapp.playlist.dto.response;

import java.time.Instant;
import java.util.UUID;

public record PlaylistItemDto(
        UUID id,
        UUID trackId,
        int position,
        UUID addedBy,
        Instant addedAt,
        String trackTitle,
        Integer trackDuration,
        String trackCoverUrl,
        String artistName,
        UUID artistId,
        UUID albumId,
        String albumTitle,
        boolean deleted
) {}
