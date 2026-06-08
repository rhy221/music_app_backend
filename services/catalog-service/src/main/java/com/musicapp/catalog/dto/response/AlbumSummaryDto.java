package com.musicapp.catalog.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record AlbumSummaryDto(
        UUID id,
        String title,
        String coverUrl,
        LocalDate releaseDate,
        TrackSummaryDto.ArtistRefDto artist
) {}
