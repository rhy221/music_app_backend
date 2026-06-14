package com.musicapp.library.service;

import com.musicapp.library.domain.OutboxEvent;
import com.musicapp.library.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public void write(String eventType, String exchange, String routingKey, Object event) {
        String payload = objectMapper.writeValueAsString(event);
        outboxRepository.save(OutboxEvent.of(eventType, exchange, routingKey, payload));
    }
}
