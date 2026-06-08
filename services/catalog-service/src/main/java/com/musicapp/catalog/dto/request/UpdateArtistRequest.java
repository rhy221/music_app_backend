package com.musicapp.catalog.dto.request;

public record UpdateArtistRequest(
        String name,
        String bio,
        String avatarUrl
) {}
