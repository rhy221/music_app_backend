package com.musicapp.catalog.messaging;

import com.company.events.track.TrackDeletedEvent;
import com.musicapp.catalog.service.TrackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrackDeletedEventConsumer {

    private final TrackService trackService;

    @RabbitListener(queues = "${catalog.queues.track-deleted}")
    public void handleTrackDeleted(TrackDeletedEvent event) {
        UUID trackId = UUID.fromString(event.data().trackId());
        log.info("Saga compensation: archiving ghost track {}", trackId);
        try {
            trackService.archiveTrackById(trackId);
        } catch (Exception e) {
            log.error("Failed to archive ghost track {}: {}", trackId, e.getMessage(), e);
            throw e;
        }
    }
}
