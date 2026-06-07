package com.musicapp.common.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Publishes domain events to RabbitMQ exchanges with standard envelope metadata.
 */
@Component
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String serviceName;

    public EventPublisher(RabbitTemplate rabbitTemplate,
                          @Value("${spring.application.name:unknown}") String serviceName) {
        this.rabbitTemplate = rabbitTemplate;
        this.serviceName = serviceName;
    }

    /**
     * Publishes an event to the specified exchange and routing key.
     */
    public void publishEvent(String exchange, String routingKey, Object event) {
        rabbitTemplate.convertAndSend(exchange, routingKey, event);
    }

    /**
     * Publishes an event with a correlationId for distributed tracing.
     */
    public void publishEventWithCorrelation(String exchange, String routingKey,
                                             Object event, String correlationId) {
        rabbitTemplate.convertAndSend(exchange, routingKey, event, message -> {
            message.getMessageProperties().setCorrelationId(correlationId);
            message.getMessageProperties().setHeader("sourceService", serviceName);
            return message;
        });
    }
}
