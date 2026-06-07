package com.musicapp.common.messaging;

import java.time.Instant;
import java.util.UUID;

/**
 * Envelope header attached to every published event for tracing and auditing.
 */
public record EventHeader(
        String eventId,
        String eventType,
        Instant timestamp,
        String sourceService,
        String correlationId
) {
    /**
     * Creates an EventHeader with auto-generated eventId and current timestamp.
     */
    public static EventHeader create(String eventType, String sourceService) {
        return new EventHeader(UUID.randomUUID().toString(), eventType, Instant.now(), sourceService, null);
    }

    /**
     * Creates an EventHeader with an explicit correlationId for distributed tracing.
     */
    public static EventHeader withCorrelation(String eventType, String sourceService, String correlationId) {
        return new EventHeader(UUID.randomUUID().toString(), eventType, Instant.now(), sourceService, correlationId);
    }
}
