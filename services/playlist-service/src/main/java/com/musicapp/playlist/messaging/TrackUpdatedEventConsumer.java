package com.musicapp.playlist.messaging;

import com.company.events.track.TrackUpdatedEvent;
import com.musicapp.playlist.repository.PlaylistItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrackUpdatedEventConsumer {

    private final PlaylistItemRepository playlistItemRepository;

    @RabbitListener(queues = "${playlist.queues.track-updated}")
    @Transactional
    public void handleTrackUpdated(TrackUpdatedEvent event) {
        String trackId = event.data().trackId();
        log.info("Received TrackUpdatedEvent trackId={}", trackId);
        try {
            playlistItemRepository.updateDenormalizedTrackInfo(
                    UUID.fromString(trackId),
                    event.data().title(),
                    event.data().coverUrl(),
                    event.data().artistName()
            );
        } catch (Exception e) {
            log.error("Failed to update denormalized track info for trackId={}: {}", trackId, e.getMessage(), e);
            throw e;
        }
    }
}
