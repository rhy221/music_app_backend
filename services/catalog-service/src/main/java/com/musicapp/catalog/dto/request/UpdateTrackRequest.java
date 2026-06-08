package com.musicapp.catalog.dto.request;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateTrackRequest(
        String title,
        String genre,
        UUID albumId,
        LocalDate releaseDate
) {}
