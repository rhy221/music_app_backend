package com.musicapp.user.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record BatchUserRequest(
        @NotEmpty @Size(max = 100) List<UUID> userIds
) {}
