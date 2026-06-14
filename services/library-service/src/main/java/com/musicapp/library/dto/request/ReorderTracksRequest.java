package com.musicapp.library.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ReorderTracksRequest(
        @NotNull List<UUID> trackIds
) {}
