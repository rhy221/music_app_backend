package com.company.events.user;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

// Generated from libs/api-specs/events.asyncapi.yaml
public record UserRegisteredEvent(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     String timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("data")          Data data
) implements EventHeader {

    public static final String EVENT_TYPE = "USER_REGISTERED";

    public record Data(
            @JsonProperty("userId")      String userId,
            @JsonProperty("displayName") String displayName,
            @JsonProperty("email")       String email
    ) {}
}
