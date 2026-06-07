package com.company.events.playlist;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record CollaboratorAddedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "COLLABORATOR_ADDED";

    public record Data(
            @JsonProperty("playlistId")     String playlistId,
            @JsonProperty("playlistName")   String playlistName,
            @JsonProperty("ownerId")        String ownerId,
            @JsonProperty("collaboratorId") String collaboratorId,
            @JsonProperty("role")           String role
    ) {}
}
