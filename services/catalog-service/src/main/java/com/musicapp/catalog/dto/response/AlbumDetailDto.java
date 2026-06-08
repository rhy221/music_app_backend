package com.musicapp.catalog.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AlbumDetailDto(
        UUID id,
        String title,
        String coverUrl,
        LocalDate releaseDate,
        Instant createdAt,
        TrackSummaryDto.ArtistRefDto artist,
        List<TrackSummaryDto> tracks,
        long totalDurationMs
) {}
