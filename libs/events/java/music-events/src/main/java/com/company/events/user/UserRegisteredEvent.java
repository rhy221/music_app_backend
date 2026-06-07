package com.company.events.user;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record UserRegisteredEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "USER_REGISTERED";

    public record Data(
            @JsonProperty("userId")      String userId,
            @JsonProperty("displayName") String displayName,
            @JsonProperty("email")       String email
    ) {}
}
