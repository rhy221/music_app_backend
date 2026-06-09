package com.musicapp.playlist.dto.request;

import com.musicapp.playlist.domain.CollaboratorRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddCollaboratorRequest(
        @NotNull UUID userId,
        @NotNull CollaboratorRole role
) {}
