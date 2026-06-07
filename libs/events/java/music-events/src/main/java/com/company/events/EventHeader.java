package com.company.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;

public record EventHeader(
        @JsonProperty("eventId")       String eventId,
        @JsonProperty("eventType")     String eventType,
        @JsonProperty("timestamp")     Instant timestamp,
        @JsonProperty("sourceService") String sourceService,
        @JsonProperty("correlationId") String correlationId
) {
    public static EventHeader create(String eventType, String sourceService) {
        return new EventHeader(UUID.randomUUID().toString(), eventType, Instant.now(), sourceService, null);
    }

    public static EventHeader withCorrelation(String eventType, String sourceService, String correlationId) {
        return new EventHeader(UUID.randomUUID().toString(), eventType, Instant.now(), sourceService, correlationId);
    }
}
