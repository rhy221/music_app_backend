package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record TranscodeFailedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "TRANSCODE_FAILED";

    public record Data(
            @JsonProperty("uploadJobId")        String uploadJobId,
            @JsonProperty("uploaderId")         String uploaderId,
            @JsonProperty("errorMessage")       String errorMessage,
            @JsonProperty("originalStorageUrl") String originalStorageUrl
    ) {}
}
