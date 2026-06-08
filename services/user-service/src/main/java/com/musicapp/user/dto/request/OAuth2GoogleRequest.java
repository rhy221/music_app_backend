package com.musicapp.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OAuth2GoogleRequest(
        @NotBlank String idToken
) {}
