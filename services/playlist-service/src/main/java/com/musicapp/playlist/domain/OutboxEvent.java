package com.musicapp.playlist.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "outbox_events", schema = "playlist_schema")
@Getter
@Setter
@NoArgsConstructor
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "exchange", nullable = false, length = 100)
    private String exchange;

    @Column(name = "routing_key", nullable = false, length = 100)
    private String routingKey;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "published", nullable = false)
    private boolean published = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public static OutboxEvent of(String eventType, String exchange, String routingKey, String payload) {
        OutboxEvent e = new OutboxEvent();
        e.eventType  = eventType;
        e.exchange   = exchange;
        e.routingKey = routingKey;
        e.payload    = payload;
        return e;
    }
}
