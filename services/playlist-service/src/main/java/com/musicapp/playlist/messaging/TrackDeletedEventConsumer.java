package com.musicapp.playlist.messaging;

import com.company.events.track.TrackDeletedEvent;
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
public class TrackDeletedEventConsumer {

    private final PlaylistItemRepository playlistItemRepository;

    @RabbitListener(queues = "${playlist.queues.track-deleted}")
    @Transactional
    public void handleTrackDeleted(TrackDeletedEvent event) {
        String trackId = event.data().trackId();
        log.info("Received TrackDeletedEvent trackId={}, marking items as deleted", trackId);
        try {
            playlistItemRepository.markTrackAsDeleted(UUID.fromString(trackId));
        } catch (Exception e) {
            log.error("Failed to mark deleted track in playlist items trackId={}: {}", trackId, e.getMessage(), e);
            throw e;
        }
    }
}
