package com.company.events.track;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record TrackPublishedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
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
