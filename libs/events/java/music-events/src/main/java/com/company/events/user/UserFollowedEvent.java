package com.company.events.user;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record UserFollowedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "USER_FOLLOWED";

    public record Data(
            @JsonProperty("followerId")   String followerId,
            @JsonProperty("followerName") String followerName,
            @JsonProperty("followingId")  String followingId
    ) {}
}
