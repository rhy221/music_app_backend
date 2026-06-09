package com.musicapp.playlist.service.client;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
@Slf4j
public class UserInternalClient {

    private final RestClient restClient;

    public UserInternalClient(@Qualifier("userRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public InternalUserDto getUser(UUID userId) {
        log.debug("Fetching user info from User service, userId={}", userId);
        return restClient.get()
                .uri("/api/v1/internal/users/{userId}", userId)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new EntityNotFoundException("User not found: " + userId);
                })
                .body(InternalUserDto.class);
    }
}
