package com.company.events.playlist;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PlaylistTrackAddedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "PLAYLIST_TRACK_ADDED";

    public record Data(
            @JsonProperty("playlistId")      String playlistId,
            @JsonProperty("playlistName")    String playlistName,
            @JsonProperty("trackId")         String trackId,
            @JsonProperty("trackTitle")      String trackTitle,
            @JsonProperty("addedBy")         String addedBy,
            @JsonProperty("addedByName")     String addedByName,
            @JsonProperty("collaboratorIds") List<String> collaboratorIds
    ) {}
}
