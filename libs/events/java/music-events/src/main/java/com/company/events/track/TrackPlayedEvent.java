package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record TrackPlayedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "TRACK_PLAYED";

    public record Data(
            @JsonProperty("userId")        String userId,
            @JsonProperty("trackId")       String trackId,
            @JsonProperty("genre")         String genre,
            @JsonProperty("artistId")      String artistId,
            @JsonProperty("durationMs")    Integer durationMs,
            @JsonProperty("source")        String source,
            @JsonProperty("completedFull") Boolean completedFull,
            @JsonProperty("playedAt")      Instant playedAt
    ) {}
}
