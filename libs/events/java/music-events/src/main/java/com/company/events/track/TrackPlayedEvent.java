package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record TrackPlayedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "TRACK_PLAYED";

    public record Data(
            @JsonProperty("userId")        String userId,
            @JsonProperty("trackId")       String trackId,
            @JsonProperty("genre")         String genre,
            @JsonProperty("artistId")      String artistId,
            @JsonProperty("durationMs")    Integer durationMs,
            @JsonProperty("source")        String source,
            @JsonProperty("completedFull") Boolean completedFull,
            @JsonProperty("playedAt")      String playedAt
    ) {}
}
