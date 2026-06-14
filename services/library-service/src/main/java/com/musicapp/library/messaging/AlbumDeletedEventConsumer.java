package com.musicapp.library.messaging;

import com.company.events.catalog.AlbumDeletedEvent;
import com.musicapp.library.repository.SavedAlbumRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlbumDeletedEventConsumer {

    private final SavedAlbumRepository savedAlbumRepository;

    @RabbitListener(queues = "${library.queues.album-deleted}")
    @Transactional
    public void handleAlbumDeleted(AlbumDeletedEvent event) {
        UUID albumId = UUID.fromString(event.data().albumId());
        log.info("Removing saved albums for deleted albumId={}", albumId);
        try {
            savedAlbumRepository.deleteAllByAlbumId(albumId);
        } catch (Exception e) {
            log.error("Failed to remove saved albums for albumId={}: {}", albumId, e.getMessage(), e);
            throw e;
        }
    }
}
