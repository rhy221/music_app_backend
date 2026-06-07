package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record TrackUploadedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "TRACK_UPLOADED";

    public record Data(
            @JsonProperty("uploadJobId")      String uploadJobId,
            @JsonProperty("uploaderId")       String uploaderId,
            @JsonProperty("originalFilename") String originalFilename,
            @JsonProperty("title")            String title,
            @JsonProperty("genre")            String genre,
            @JsonProperty("storageUrl")       String storageUrl,
            @JsonProperty("sizeBytes")        Long sizeBytes
    ) {}
}
