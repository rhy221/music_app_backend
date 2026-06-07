package com.company.events.user;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record UserFollowedEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "USER_FOLLOWED";

    public record Data(
            @JsonProperty("followerId")   String followerId,
            @JsonProperty("followerName") String followerName,
            @JsonProperty("followingId")  String followingId
    ) {}
}
