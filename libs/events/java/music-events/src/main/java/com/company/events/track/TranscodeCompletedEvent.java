package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record TranscodeCompletedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "TRANSCODE_COMPLETED";

    public record Data(
            @JsonProperty("uploadJobId")  String uploadJobId,
            @JsonProperty("uploaderId")   String uploaderId,
            @JsonProperty("title")        String title,
            @JsonProperty("genre")        String genre,
            @JsonProperty("albumId")      String albumId,
            @JsonProperty("albumTitle")   String albumTitle,
            @JsonProperty("releaseDate")  String releaseDate,
            @JsonProperty("durationMs")   Integer durationMs,
            @JsonProperty("thumbnailUrl") String thumbnailUrl,
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
