package com.musicapp.playlist.service.client;

import java.util.UUID;

public record InternalUserDto(
        UUID id,
        String displayName,
        String avatarUrl,
        String role
) {}
