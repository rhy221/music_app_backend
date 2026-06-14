package com.musicapp.library.dto.response;

import java.time.Instant;
import java.util.UUID;

public record SavedTrackDto(
        UUID id,
        UUID trackId,
        String trackTitle,
        String coverUrl,
        String artistName,
        UUID artistId,
        Integer durationMs,
        UUID albumId,
        String albumTitle,
        boolean deleted,
        Instant savedAt,
        int position
) {}
