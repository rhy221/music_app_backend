package com.musicapp.library.dto.response;

import java.time.Instant;
import java.util.UUID;

public record SavedAlbumDto(
        UUID id,
        UUID albumId,
        String albumTitle,
        String coverUrl,
        String artistName,
        UUID artistId,
        int trackCount,
        Instant savedAt
) {}
