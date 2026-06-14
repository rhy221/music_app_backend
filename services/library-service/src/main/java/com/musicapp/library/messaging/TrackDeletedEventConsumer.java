package com.musicapp.library.messaging;

import com.company.events.track.TrackDeletedEvent;
import com.musicapp.library.repository.SavedTrackRepository;
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

    private final SavedTrackRepository savedTrackRepository;

    @RabbitListener(queues = "${library.queues.track-deleted}")
    @Transactional
    public void handleTrackDeleted(TrackDeletedEvent event) {
        UUID trackId = UUID.fromString(event.data().trackId());
        log.info("Marking saved tracks deleted for trackId={}", trackId);
        try {
            savedTrackRepository.markAllDeletedByTrackId(trackId);
        } catch (Exception e) {
            log.error("Failed to mark saved tracks deleted for trackId={}: {}", trackId, e.getMessage(), e);
            throw e;
        }
    }
}
