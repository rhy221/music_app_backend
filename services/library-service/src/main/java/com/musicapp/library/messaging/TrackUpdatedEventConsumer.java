package com.musicapp.library.messaging;

import com.company.events.track.TrackUpdatedEvent;
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
public class TrackUpdatedEventConsumer {

    private final SavedTrackRepository savedTrackRepository;

    @RabbitListener(queues = "${library.queues.track-updated}")
    @Transactional
    public void handleTrackUpdated(TrackUpdatedEvent event) {
        UUID trackId = UUID.fromString(event.data().trackId());
        log.info("Updating denormalized track data for trackId={}", trackId);
        try {
            savedTrackRepository.updateDenormalizedData(
                    trackId,
                    event.data().title(),
                    event.data().coverUrl(),
                    event.data().artistName()
            );
        } catch (Exception e) {
            log.error("Failed to update denormalized track data for trackId={}: {}", trackId, e.getMessage(), e);
            throw e;
        }
    }
}
