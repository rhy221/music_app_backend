package com.musicapp.catalog.dto.response;

public record AudioAssetDto(
        Integer bitrate,
        String format,
        String storageUrl,
        Long sizeBytes
) {}
