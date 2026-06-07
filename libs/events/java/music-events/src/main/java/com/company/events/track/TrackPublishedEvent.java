package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// Generated from libs/api-specs/events.asyncapi.yaml
public record TrackPublishedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "TRACK_PUBLISHED";

    public record Data(
            @JsonProperty("trackId")    String trackId,
            @JsonProperty("title")      String title,
            @JsonProperty("durationMs") Integer durationMs,
            @JsonProperty("coverUrl")   String coverUrl,
            @JsonProperty("genre")      String genre,
            @JsonProperty("artistId")   String artistId,
            @JsonProperty("artistName") String artistName,
            @JsonProperty("albumId")    String albumId,
            @JsonProperty("albumTitle") String albumTitle,
            @JsonProperty("assets")     List<AudioAsset> assets
    ) {}

    public record AudioAsset(
            @JsonProperty("bitrate")    Integer bitrate,
            @JsonProperty("format")     String format,
            @JsonProperty("storageUrl") String storageUrl
    ) {}
}
