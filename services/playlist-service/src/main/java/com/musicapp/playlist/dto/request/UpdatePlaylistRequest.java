package com.musicapp.playlist.dto.request;

import com.musicapp.playlist.domain.PlaylistVisibility;
import jakarta.validation.constraints.Size;

public record UpdatePlaylistRequest(
        @Size(min = 1, max = 100) String name,
        String description,
        PlaylistVisibility visibility
) {}
