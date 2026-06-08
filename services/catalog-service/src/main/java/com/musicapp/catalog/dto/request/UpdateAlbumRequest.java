package com.musicapp.catalog.dto.request;

import java.time.LocalDate;

public record UpdateAlbumRequest(
        String title,
        String coverUrl,
        LocalDate releaseDate
) {}
