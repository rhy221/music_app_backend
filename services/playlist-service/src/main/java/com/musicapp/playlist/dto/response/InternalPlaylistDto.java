package com.musicapp.playlist.dto.response;

import com.musicapp.playlist.domain.PlaylistVisibility;

import java.util.UUID;

public record InternalPlaylistDto(
        UUID playlistId,
        String name,
        String coverUrl,
        UUID ownerId,
        int trackCount,
        PlaylistVisibility visibility
) {}
