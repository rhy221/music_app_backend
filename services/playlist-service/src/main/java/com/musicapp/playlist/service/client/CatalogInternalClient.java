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
public class CatalogInternalClient {

    private final RestClient restClient;

    public CatalogInternalClient(@Qualifier("catalogRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public InternalTrackDto getTrack(UUID trackId) {
        log.debug("Fetching track metadata from Catalog service, trackId={}", trackId);
        return restClient.get()
                .uri("/api/v1/internal/tracks/{trackId}", trackId)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new EntityNotFoundException("Track not found: " + trackId);
                })
                .body(InternalTrackDto.class);
    }
}
