package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record TrackUpdatedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "TRACK_UPDATED";

    public record Data(
            @JsonProperty("trackId")    String trackId,
            @JsonProperty("title")      String title,
            @JsonProperty("genre")      String genre,
            @JsonProperty("coverUrl")   String coverUrl,
            @JsonProperty("artistName") String artistName
    ) {}
}
