package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record TrackUpdatedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "TRACK_UPDATED";

    public record Data(
            @JsonProperty("trackId")    String trackId,
            @JsonProperty("title")      String title,
            @JsonProperty("genre")      String genre,
            @JsonProperty("coverUrl")   String coverUrl,
            @JsonProperty("artistName") String artistName
    ) {}
}
