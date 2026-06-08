package com.musicapp.user.service;

import tools.jackson.databind.ObjectMapper;
import com.musicapp.user.domain.OutboxEvent;
import com.musicapp.user.repository.OutboxEventRepository;
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
     * Serialize and persist an event to the outbox table.
     * Must be called within an existing @Transactional boundary so the write
     * is atomic with the business state change.
     */
    public void write(String eventType, String exchange, String routingKey, Object event) {
        String payload = objectMapper.writeValueAsString(event);
        outboxRepository.save(OutboxEvent.of(eventType, exchange, routingKey, payload));
    }
}
