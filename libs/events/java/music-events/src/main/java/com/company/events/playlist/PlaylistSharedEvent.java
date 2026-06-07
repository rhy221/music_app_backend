package com.company.events.playlist;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record PlaylistSharedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "PLAYLIST_SHARED";

    public record Data(
            @JsonProperty("playlistId")       String playlistId,
            @JsonProperty("playlistName")     String playlistName,
            @JsonProperty("ownerId")          String ownerId,
            @JsonProperty("ownerName")        String ownerName,
            @JsonProperty("sharedWithUserId") String sharedWithUserId
    ) {}
}
