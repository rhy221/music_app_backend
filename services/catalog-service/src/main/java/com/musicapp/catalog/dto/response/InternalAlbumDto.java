package com.musicapp.catalog.dto.response;

import java.util.UUID;

public record InternalAlbumDto(
        UUID albumId,
        String title,
        String coverUrl,
        UUID artistId,
        String artistName,
        int trackCount
) {}
