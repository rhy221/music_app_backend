package com.musicapp.catalog.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TrackDetailDto(
        UUID id,
        String title,
        Integer durationMs,
        String genre,
        String coverUrl,
        String waveformUrl,
        Long playCount,
        String status,
        LocalDate releaseDate,
        Instant createdAt,
        Instant updatedAt,
        TrackSummaryDto.ArtistRefDto artist,
        AlbumRefDto album,
        List<AudioAssetDto> assets
) {
    public record AlbumRefDto(UUID id, String title, String coverUrl) {}
}
