package com.musicapp.catalog.messaging;

import com.company.events.user.UserProfileUpdatedEvent;
import com.musicapp.catalog.repository.ArtistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserProfileUpdatedEventConsumer {

    private final ArtistRepository artistRepository;

    @RabbitListener(queues = "${catalog.queues.user-profile-updated}")
    @Transactional
    public void handleUserProfileUpdated(UserProfileUpdatedEvent event) {
        UUID userId = UUID.fromString(event.data().userId());
        artistRepository.findByUserId(userId).ifPresentOrElse(
                artist -> {
                    artist.setName(event.data().displayName());
                    if (event.data().avatarUrl() != null) {
                        artist.setAvatarUrl(event.data().avatarUrl());
                    }
                    artistRepository.save(artist);
                    log.info("Synced artist profile for userId={} → name=\"{}\", avatar={}",
                            userId, event.data().displayName(), event.data().avatarUrl());
                },
                () -> log.debug("No artist record for userId={}, skipping profile sync", userId)
        );
    }
}
