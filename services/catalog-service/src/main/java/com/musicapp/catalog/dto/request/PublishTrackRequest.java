package com.musicapp.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record PublishTrackRequest(
        @NotBlank String uploadJobId,
        @NotNull UUID uploaderId,
        @NotBlank String title,
        @NotNull Integer durationMs,
        String genre,
        UUID albumId,
        String coverUrl,
        String waveformUrl,
        @NotEmpty List<AssetRequest> assets
) {
    public record AssetRequest(
            @NotNull Integer bitrate,
            @NotBlank String format,
            @NotBlank String storageUrl,
            @NotNull Long sizeBytes
    ) {}
}
