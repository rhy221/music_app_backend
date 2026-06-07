package com.company.events;

// Generated from libs/api-specs/events.asyncapi.yaml
public interface EventHeader {
    String eventId();
    String eventType();
    String timestamp();      // ISO 8601 date-time
    String sourceService();
    String correlationId();  // nullable — distributed tracing
}
