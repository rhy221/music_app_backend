package com.musicapp.catalog.config;

import com.company.events.EventConstants;
import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CatalogRabbitConfig {

    @Value("${catalog.queues.transcode-completed}")
    private String transcodeCompletedQueue;

    @Value("${catalog.queues.track-played}")
    private String trackPlayedQueue;

    @Value("${catalog.queues.user-role-updated}")
    private String userRoleUpdatedQueue;

    // Dead-letter exchange for failed messages
    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange("events.dead-letter", true, false);
    }

    // ---- Transcode Completed (from Upload service) ----

    @Bean
    public Queue transcodeCompletedQueueBean() {
        return QueueBuilder.durable(transcodeCompletedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", transcodeCompletedQueue + ".dlq")
                .build();
    }

    @Bean
    public TopicExchange uploadExchangeRef() {
        return new TopicExchange(EventConstants.Exchanges.UPLOAD, true, false);
    }

    @Bean
    public Binding transcodeCompletedBinding() {
        return BindingBuilder
                .bind(transcodeCompletedQueueBean())
                .to(uploadExchangeRef())
                .with(EventConstants.RoutingKeys.TRANSCODE_COMPLETED);
    }

    // ---- Track Played (from Streaming service) ----

    @Bean
    public Queue trackPlayedQueueBean() {
        return QueueBuilder.durable(trackPlayedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", trackPlayedQueue + ".dlq")
                .build();
    }

    @Bean
    public TopicExchange streamingExchangeRef() {
        return new TopicExchange(EventConstants.Exchanges.STREAMING, true, false);
    }

    @Bean
    public Binding trackPlayedBinding() {
        return BindingBuilder
                .bind(trackPlayedQueueBean())
                .to(streamingExchangeRef())
                .with(EventConstants.RoutingKeys.TRACK_PLAYED);
    }

    // ---- User Role Updated (from User service) ----

    @Bean
    public Queue userRoleUpdatedQueueBean() {
        return QueueBuilder.durable(userRoleUpdatedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", userRoleUpdatedQueue + ".dlq")
                .build();
    }

    @Bean
    public TopicExchange userExchangeRef() {
        return new TopicExchange(EventConstants.Exchanges.USER, true, false);
    }

    @Bean
    public Binding userRoleUpdatedBinding() {
        return BindingBuilder
                .bind(userRoleUpdatedQueueBean())
                .to(userExchangeRef())
                .with(EventConstants.RoutingKeys.USER_ROLE_UPDATED);
    }
}
