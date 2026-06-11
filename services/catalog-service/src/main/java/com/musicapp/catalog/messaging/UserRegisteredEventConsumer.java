package com.musicapp.catalog.messaging;

import com.company.events.user.UserRegisteredEvent;
import com.musicapp.catalog.service.ArtistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserRegisteredEventConsumer {

    private final ArtistService artistService;

    @RabbitListener(queues = "${catalog.queues.user-registered}")
    public void handleUserRegistered(UserRegisteredEvent event) {
        log.info("User {} registered — creating artist profile", event.data().userId());
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
