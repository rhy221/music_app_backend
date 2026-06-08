package com.musicapp.catalog.service;

import tools.jackson.databind.ObjectMapper;
import com.musicapp.catalog.domain.OutboxEvent;
import com.musicapp.catalog.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxService {

    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    /**
     * Writes an event to the outbox table within the current transaction.
     * Must be called inside a @Transactional method.
     */
    public void write(String eventType, String exchange, String routingKey, Object event) {
        String payload = objectMapper.writeValueAsString(event);
        outboxRepository.save(OutboxEvent.of(eventType, exchange, routingKey, payload));
    }
}
