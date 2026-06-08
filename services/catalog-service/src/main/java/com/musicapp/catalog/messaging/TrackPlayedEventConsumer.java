package com.musicapp.catalog.messaging;

import com.company.events.track.TrackPlayedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Listens for TrackPlayedEvent from the Streaming service and increments
 * the Redis play count buffer (flushed to DB every 5 minutes by PlayCountFlusher).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrackPlayedEventConsumer {

    private final StringRedisTemplate redisTemplate;

    @RabbitListener(queues = "${catalog.queues.track-played}")
    public void handleTrackPlayed(TrackPlayedEvent event) {
        String trackId = event.data().trackId();
        redisTemplate.opsForValue().increment("playcount:" + trackId);
        log.debug("Incremented play count buffer for trackId={}", trackId);
    }
}
