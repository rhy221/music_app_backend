package com.musicapp.catalog.dto.response;

import java.util.UUID;

public record ArtistSummaryDto(
        UUID id,
        String name,
        String avatarUrl,
        long trackCount,
        long albumCount
) {}
