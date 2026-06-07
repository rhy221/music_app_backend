package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record TranscodeFailedEvent(
        @JsonProperty("eventId")             String eventId,
        @JsonProperty("eventType")           String eventType,
        @JsonProperty("timestamp")           String timestamp,
        @JsonProperty("sourceService")       String sourceService,
        @JsonProperty("correlationId")       String correlationId,
        @JsonProperty("data")                Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "TRANSCODE_FAILED";

    public record Data(
            @JsonProperty("uploadJobId")        String uploadJobId,
            @JsonProperty("uploaderId")         String uploaderId,
            @JsonProperty("errorMessage")       String errorMessage,
            @JsonProperty("originalStorageUrl") String originalStorageUrl
    ) {}
}
