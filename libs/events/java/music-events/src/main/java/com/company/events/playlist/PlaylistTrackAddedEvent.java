package com.company.events.playlist;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// Generated from libs/api-specs/events.asyncapi.yaml
public record PlaylistTrackAddedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "PLAYLIST_TRACK_ADDED";

    public record Data(
            @JsonProperty("playlistId")      String playlistId,
            @JsonProperty("playlistName")    String playlistName,
            @JsonProperty("trackId")         String trackId,
            @JsonProperty("trackTitle")      String trackTitle,
            @JsonProperty("addedBy")         String addedBy,
            @JsonProperty("addedByName")     String addedByName,
            @JsonProperty("collaboratorIds") List<String> collaboratorIds
    ) {}
}
