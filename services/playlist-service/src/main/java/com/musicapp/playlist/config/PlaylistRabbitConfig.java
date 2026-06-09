package com.musicapp.playlist.config;

import com.company.events.EventConstants;
import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PlaylistRabbitConfig {

    @Value("${playlist.queues.track-updated}")
    private String trackUpdatedQueue;

    @Value("${playlist.queues.track-deleted}")
    private String trackDeletedQueue;

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange("events.dead-letter", true, false);
    }

    // ---- Track Updated (from Catalog service) ----

    @Bean
    public Queue trackUpdatedQueueBean() {
        return QueueBuilder.durable(trackUpdatedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", trackUpdatedQueue + ".dlq")
                .build();
    }

    @Bean
    public TopicExchange catalogExchangeRef() {
        return new TopicExchange(EventConstants.Exchanges.CATALOG, true, false);
    }

    @Bean
    public Binding trackUpdatedBinding() {
        return BindingBuilder
                .bind(trackUpdatedQueueBean())
                .to(catalogExchangeRef())
                .with(EventConstants.RoutingKeys.TRACK_UPDATED);
    }

    // ---- Track Deleted (from Catalog service) ----

    @Bean
    public Queue trackDeletedQueueBean() {
        return QueueBuilder.durable(trackDeletedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", trackDeletedQueue + ".dlq")
                .build();
    }

    @Bean
    public Binding trackDeletedBinding() {
        return BindingBuilder
                .bind(trackDeletedQueueBean())
                .to(catalogExchangeRef())
                .with(EventConstants.RoutingKeys.TRACK_DELETED);
    }
}
