package com.musicapp.library.messaging;

import com.musicapp.library.domain.OutboxEvent;
import com.musicapp.library.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;

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
                MessageProperties props = new MessageProperties();
                props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
                Message message = new Message(event.getPayload().getBytes(StandardCharsets.UTF_8), props);
                rabbitTemplate.send(event.getExchange(), event.getRoutingKey(), message);
                event.setPublished(true);
                outboxRepository.save(event);
            } catch (Exception e) {
                log.error("Failed to publish outbox event id={} type={}: {}",
                        event.getId(), event.getEventType(), e.getMessage());
            }
        }
    }
}
