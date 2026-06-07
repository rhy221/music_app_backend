package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// Generated from libs/api-specs/events.asyncapi.yaml
public record TranscodeCompletedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "TRANSCODE_COMPLETED";

    public record Data(
            @JsonProperty("uploadJobId")  String uploadJobId,
            @JsonProperty("uploaderId")   String uploaderId,
            @JsonProperty("title")        String title,
            @JsonProperty("genre")        String genre,
            @JsonProperty("albumId")      String albumId,
            @JsonProperty("durationMs")   Integer durationMs,
            @JsonProperty("waveformUrl")  String waveformUrl,
            @JsonProperty("assets")       List<AudioAsset> assets
    ) {}

    public record AudioAsset(
            @JsonProperty("bitrate")    Integer bitrate,
            @JsonProperty("format")     String format,
            @JsonProperty("storageUrl") String storageUrl,
            @JsonProperty("sizeBytes")  Long sizeBytes
    ) {}
}
