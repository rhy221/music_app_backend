package com.musicapp.library.config;

import com.company.events.EventConstants;
import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LibraryRabbitConfig {

    @Value("${library.queues.track-deleted}")
    private String trackDeletedQueue;

    @Value("${library.queues.track-updated}")
    private String trackUpdatedQueue;

    @Value("${library.queues.album-deleted}")
    private String albumDeletedQueue;

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange("events.dead-letter", true, false);
    }

    @Bean
    public TopicExchange catalogExchangeRef() {
        return new TopicExchange(EventConstants.Exchanges.CATALOG, true, false);
    }

    // ── Track Deleted ─────────────────────────────────────────────────────────

    @Bean
    public Queue libraryTrackDeletedQueue() {
        return QueueBuilder.durable(trackDeletedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", trackDeletedQueue + ".dlq")
                .build();
    }

    @Bean
    public Binding libraryTrackDeletedBinding() {
        return BindingBuilder
                .bind(libraryTrackDeletedQueue())
                .to(catalogExchangeRef())
                .with(EventConstants.RoutingKeys.TRACK_DELETED);
    }

    // ── Track Updated ─────────────────────────────────────────────────────────

    @Bean
    public Queue libraryTrackUpdatedQueue() {
        return QueueBuilder.durable(trackUpdatedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", trackUpdatedQueue + ".dlq")
                .build();
    }

    @Bean
    public Binding libraryTrackUpdatedBinding() {
        return BindingBuilder
                .bind(libraryTrackUpdatedQueue())
                .to(catalogExchangeRef())
                .with(EventConstants.RoutingKeys.TRACK_UPDATED);
    }

    // ── Album Deleted ─────────────────────────────────────────────────────────

    @Bean
    public Queue libraryAlbumDeletedQueue() {
        return QueueBuilder.durable(albumDeletedQueue)
                .withArgument("x-dead-letter-exchange", "events.dead-letter")
                .withArgument("x-dead-letter-routing-key", albumDeletedQueue + ".dlq")
                .build();
    }

    @Bean
    public Binding libraryAlbumDeletedBinding() {
        return BindingBuilder
                .bind(libraryAlbumDeletedQueue())
                .to(catalogExchangeRef())
                .with(EventConstants.RoutingKeys.ALBUM_DELETED);
    }
}
