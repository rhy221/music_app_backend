package com.musicapp.catalog.dto.response;

import java.util.List;
import java.util.UUID;

public record InternalTrackDto(
        UUID id,
        String title,
        Integer durationMs,
        String coverUrl,
        String genre,
        UUID artistId,
        String artistName,
        UUID albumId,
        String albumTitle,
        List<AudioAssetDto> assets
) {}
