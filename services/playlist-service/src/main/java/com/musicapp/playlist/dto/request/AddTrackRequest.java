package com.musicapp.playlist.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddTrackRequest(
        @NotNull UUID trackId,
        Integer position
) {}
