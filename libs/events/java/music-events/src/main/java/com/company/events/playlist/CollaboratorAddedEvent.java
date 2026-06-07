package com.company.events.playlist;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record CollaboratorAddedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "COLLABORATOR_ADDED";

    public record Data(
            @JsonProperty("playlistId")     String playlistId,
            @JsonProperty("playlistName")   String playlistName,
            @JsonProperty("ownerId")        String ownerId,
            @JsonProperty("collaboratorId") String collaboratorId,
            @JsonProperty("role")           String role
    ) {}
}
