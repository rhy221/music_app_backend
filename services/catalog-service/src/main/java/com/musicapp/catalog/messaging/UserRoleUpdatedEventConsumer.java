package com.musicapp.catalog.messaging;

import com.company.events.user.UserRoleUpdatedEvent;
import com.musicapp.catalog.service.ArtistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Listens for UserRoleUpdatedEvent and creates an Artist record when a user is promoted to ARTIST.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserRoleUpdatedEventConsumer {

    private final ArtistService artistService;

    @RabbitListener(queues = "${catalog.queues.user-role-updated}")
    public void handleUserRoleUpdated(UserRoleUpdatedEvent event) {
        if (!"ARTIST".equals(event.data().newRole())) {
            return;
        }
        log.info("User {} promoted to ARTIST — creating artist profile", event.data().userId());
        try {
            artistService.createArtistForUser(
                    UUID.fromString(event.data().userId()),
                    event.data().displayName()
            );
        } catch (Exception e) {
            log.error("Failed to create artist for userId={}: {}", event.data().userId(), e.getMessage(), e);
            throw e;
        }
    }
}
