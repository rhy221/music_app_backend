package com.company.events.user;

import com.company.events.EventHeader;
import com.fasterxml.jackson.annotation.JsonProperty;

public record UserRoleUpdatedEvent(
        @JsonProperty("header") EventHeader header,
        @JsonProperty("data")   Data data
) {
    public static final String EVENT_TYPE = "USER_ROLE_UPDATED";

    public record Data(
            @JsonProperty("userId")       String userId,
            @JsonProperty("displayName")  String displayName,
            @JsonProperty("newRole")      String newRole,
            @JsonProperty("previousRole") String previousRole
    ) {}
}
