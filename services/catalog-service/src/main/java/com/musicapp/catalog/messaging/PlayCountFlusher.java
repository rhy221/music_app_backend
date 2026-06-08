package com.musicapp.catalog.messaging;

import com.musicapp.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

/**
 * Every 5 minutes: flushes the Redis play count buffer into the tracks table.
 * Uses INCR-buffered counts to minimize write amplification on the DB.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PlayCountFlusher {

    private static final String PLAY_COUNT_PREFIX = "playcount:";

    private final StringRedisTemplate redisTemplate;
    private final TrackRepository trackRepository;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void flushPlayCounts() {
        Set<String> keys = redisTemplate.keys(PLAY_COUNT_PREFIX + "*");
        if (keys == null || keys.isEmpty()) return;

        log.debug("Flushing play counts for {} tracks", keys.size());

        for (String key : keys) {
            String value = redisTemplate.opsForValue().getAndDelete(key);
            if (value == null) continue;

            try {
                UUID trackId = UUID.fromString(key.substring(PLAY_COUNT_PREFIX.length()));
                long delta   = Long.parseLong(value);
                trackRepository.incrementPlayCount(trackId, delta);
            } catch (Exception e) {
                log.error("Failed to flush play count for key={}: {}", key, e.getMessage());
            }
        }
    }
}
