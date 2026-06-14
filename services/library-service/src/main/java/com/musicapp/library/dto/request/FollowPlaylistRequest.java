package com.musicapp.library.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record FollowPlaylistRequest(@NotNull UUID playlistId) {}
