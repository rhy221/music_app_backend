package com.company.events.playlist;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record PlaylistSharedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "PLAYLIST_SHARED";

    public record Data(
            @JsonProperty("playlistId")       String playlistId,
            @JsonProperty("playlistName")     String playlistName,
            @JsonProperty("ownerId")          String ownerId,
            @JsonProperty("ownerName")        String ownerName,
            @JsonProperty("sharedWithUserId") String sharedWithUserId
    ) {}
}
