package com.musicapp.catalog.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record TrackSummaryDto(
        UUID id,
        String title,
        Integer durationMs,
        String genre,
        String coverUrl,
        Long playCount,
        String status,
        LocalDate releaseDate,
        ArtistRefDto artist
) {
    public record ArtistRefDto(UUID id, String name, String avatarUrl) {}
}
