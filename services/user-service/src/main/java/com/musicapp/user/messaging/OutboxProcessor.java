package com.musicapp.user.messaging;

import com.musicapp.user.domain.OutboxEvent;
import com.musicapp.user.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Polls outbox_events every 5 seconds and publishes unpublished events to RabbitMQ.
 * At-least-once delivery: DB commit precedes publish, so a crash retries on next poll.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxProcessor {

    private final OutboxEventRepository outboxRepository;
    private final RabbitTemplate rabbitTemplate;

    @Scheduled(fixedDelay = 5_000)
    public void processOutbox() {
        List<OutboxEvent> pending = outboxRepository.findTop50ByPublishedFalseOrderByCreatedAtAsc();
        if (pending.isEmpty()) return;

        for (OutboxEvent event : pending) {
            try {
                rabbitTemplate.convertAndSend(event.getExchange(), event.getRoutingKey(), event.getPayload());
                event.setPublished(true);
                outboxRepository.save(event);
            } catch (Exception e) {
                log.error("Failed to publish outbox event id={} type={}: {}",
                        event.getId(), event.getEventType(), e.getMessage());
            }
        }
    }
}
