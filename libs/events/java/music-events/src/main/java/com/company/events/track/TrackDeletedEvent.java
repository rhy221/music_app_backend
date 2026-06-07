package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record TrackDeletedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "TRACK_DELETED";

    public record Data(
            @JsonProperty("trackId") String trackId
    ) {}
}
