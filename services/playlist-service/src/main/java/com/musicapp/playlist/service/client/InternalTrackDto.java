package com.musicapp.playlist.service.client;

import java.util.UUID;

public record InternalTrackDto(
        UUID id,
        String title,
        Integer durationMs,
        String coverUrl,
        String genre,
        UUID artistId,
        String artistName,
        UUID albumId
) {}
