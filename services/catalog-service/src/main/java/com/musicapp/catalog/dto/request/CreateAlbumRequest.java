package com.musicapp.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateAlbumRequest(
        @NotBlank @Size(max = 255) String title,
        LocalDate releaseDate,
        String coverUrl
) {}
