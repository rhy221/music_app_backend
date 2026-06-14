package com.company.events.catalog;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AlbumDeletedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "ALBUM_DELETED";

    public record Data(
            @JsonProperty("albumId")   String albumId,
            @JsonProperty("artistId")  String artistId
    ) {}
}
