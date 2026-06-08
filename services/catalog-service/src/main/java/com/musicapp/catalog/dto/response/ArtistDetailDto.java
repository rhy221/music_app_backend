package com.musicapp.catalog.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ArtistDetailDto(
        UUID id,
        String name,
        String bio,
        String avatarUrl,
        UUID userId,
        long trackCount,
        long albumCount,
        Instant createdAt,
        List<TrackSummaryDto> topTracks,
        List<AlbumSummaryDto> albums
) {}
